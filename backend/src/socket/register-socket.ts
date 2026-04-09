import type { FastifyInstance } from "fastify";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createInitialState, playCard } from "../game/engine";
import type { CardType, GameState } from "../types/game";

interface PlayCardEvent {
  roomId: string;
  card: CardType;
  targetTikiId?: number;
}

const gameStateByRoom = new Map<string, GameState>();

const parseBearerToken = (header?: string): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
};

export const registerSocketServer = (app: FastifyInstance, server: HttpServer): Server => {
  const io = new Server(server, {
    path: "/ws",
    cors: {
      origin: "*"
    }
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token) ||
        parseBearerToken(socket.handshake.headers.authorization);

      if (!token) {
        return next(new Error("Missing token."));
      }

      const decoded = await app.jwt.verify<{ sub: string; username: string }>(token);
      socket.data.user = decoded;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_room", async ({ roomId }: { roomId: string }) => {
      socket.join(roomId);

      const state = gameStateByRoom.get(roomId);
      if (state) {
        socket.emit("state_update", state);
        return;
      }

      const socketsInRoom = await io.in(roomId).fetchSockets();
      socket.emit("room_joined", {
        roomId,
        playerCount: socketsInRoom.length,
        canStart: socketsInRoom.length >= 2
      });
    });

    socket.on("start_game", async ({ roomId }: { roomId: string }) => {
      const existing = gameStateByRoom.get(roomId);
      if (existing) {
        socket.emit("state_update", existing);
        return;
      }

      const socketsInRoom = await io.in(roomId).fetchSockets();
      const playerIds = Array.from(new Set(socketsInRoom.map((s) => s.data.user.sub as string)));

      if (playerIds.length < 2 || playerIds.length > 4) {
        socket.emit("error_event", { message: "Game requires 2 to 4 connected players." });
        return;
      }

      const init = createInitialState(roomId, playerIds);
      gameStateByRoom.set(roomId, init);
      io.to(roomId).emit("state_update", init);
    });

    socket.on("play_card", (event: PlayCardEvent) => {
      const userId = socket.data.user.sub as string;
      const state = gameStateByRoom.get(event.roomId);
      if (!state) {
        socket.emit("error_event", { message: "Room game state not found." });
        return;
      }

      try {
        const result = playCard(state, {
          playerId: userId,
          card: event.card,
          targetTikiId: event.targetTikiId
        });

        io.to(event.roomId).emit("state_update", result.state);
      } catch (error) {
        socket.emit("error_event", {
          message: error instanceof Error ? error.message : "Invalid move."
        });
      }
    });
  });

  return io;
};
