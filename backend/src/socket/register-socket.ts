import type { FastifyInstance } from "fastify";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { Prisma } from "@prisma/client";
import { createInitialState, playCard } from "../game/engine";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import type { CardType, GameState, PublicGameState } from "../types/game";

interface PlayCardEvent {
  roomId: string;
  card: CardType;
  targetTikiId?: number;
}

const gameStateByRoom = new Map<string, GameState>();
const gameSessionIdByRoom = new Map<string, string>();
const roomUsernames = new Map<string, Map<string, string>>();

const redisKeyForRoom = (roomId: string): string => `tiki:game-state:${roomId}`;

const toPrismaJson = (state: GameState): Prisma.InputJsonValue => {
  return state as unknown as Prisma.InputJsonValue;
};

const toPublicState = (roomId: string, state: GameState): PublicGameState => {
  const usernames = roomUsernames.get(roomId) ?? new Map<string, string>();
  const playerMeta = state.playerOrder.reduce<Record<string, { username: string }>>((acc, playerId) => {
    acc[playerId] = { username: usernames.get(playerId) ?? playerId };
    return acc;
  }, {});

  return {
    ...state,
    playerMeta
  };
};

const loadStateFromPersistence = async (roomId: string): Promise<GameState | null> => {
  const cached = await redis.get(redisKeyForRoom(roomId));
  if (cached) {
    return JSON.parse(cached) as GameState;
  }

  const latestSession = await prisma.gameSession.findFirst({
    where: {
      roomId,
      finishedAt: null
    },
    orderBy: {
      startedAt: "desc"
    }
  });

  if (!latestSession) {
    return null;
  }

  gameSessionIdByRoom.set(roomId, latestSession.id);
  return latestSession.state as unknown as GameState;
};

const ensureGameSession = async (roomId: string, state: GameState): Promise<string> => {
  const existingSessionId = gameSessionIdByRoom.get(roomId);
  if (existingSessionId) {
    return existingSessionId;
  }

  const latestSession = await prisma.gameSession.findFirst({
    where: {
      roomId,
      finishedAt: null
    },
    orderBy: {
      startedAt: "desc"
    }
  });

  if (latestSession) {
    gameSessionIdByRoom.set(roomId, latestSession.id);
    return latestSession.id;
  }

  const created = await prisma.gameSession.create({
    data: {
      roomId,
      roundNumber: state.roundNumber,
      state: toPrismaJson(state)
    }
  });

  gameSessionIdByRoom.set(roomId, created.id);
  return created.id;
};

const persistState = async (roomId: string, state: GameState): Promise<void> => {
  await redis.set(redisKeyForRoom(roomId), JSON.stringify(state));

  const gameSessionId = await ensureGameSession(roomId, state);
  await prisma.gameSession.update({
    where: { id: gameSessionId },
    data: {
      roundNumber: state.roundNumber,
      state: toPrismaJson(state),
      finishedAt: state.gameComplete ? new Date() : null
    }
  });
};

const trackRoomUser = (roomId: string, userId: string, username: string): void => {
  const roomMap = roomUsernames.get(roomId) ?? new Map<string, string>();
  roomMap.set(userId, username);
  roomUsernames.set(roomId, roomMap);
};

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
      const userId = socket.data.user.sub as string;
      const username = socket.data.user.username as string;
      trackRoomUser(roomId, userId, username);

      const state = gameStateByRoom.get(roomId) ?? (await loadStateFromPersistence(roomId));
      if (state) {
        gameStateByRoom.set(roomId, state);
        socket.emit("state_update", toPublicState(roomId, state));
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
        socket.emit("state_update", toPublicState(roomId, existing));
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
      await prisma.room.update({ where: { id: roomId }, data: { status: "IN_PROGRESS" } }).catch(() => undefined);
      await persistState(roomId, init);
      io.to(roomId).emit("state_update", toPublicState(roomId, init));
    });

    socket.on("play_card", async (event: PlayCardEvent) => {
      const userId = socket.data.user.sub as string;
      const state = gameStateByRoom.get(event.roomId);
      if (!state) {
        socket.emit("error_event", { message: "Room game state not found." });
        return;
      }

      try {
        const gameSessionId = await ensureGameSession(event.roomId, state);
        const turnBeforeMove = state.turnNumber;

        const result = playCard(state, {
          playerId: userId,
          card: event.card,
          targetTikiId: event.targetTikiId
        });

        await prisma.moveLog.create({
          data: {
            gameSessionId,
            roomId: event.roomId,
            playerId: userId,
            turnNumber: turnBeforeMove,
            cardPlayed: event.card,
            targetTikiId: event.card === "TIKI_TOAST" ? null : (event.targetTikiId ?? null)
          }
        });

        await persistState(event.roomId, result.state);

        if (result.state.gameComplete) {
          await prisma.room.update({ where: { id: event.roomId }, data: { status: "FINISHED" } }).catch(() => undefined);
        }

        io.to(event.roomId).emit("state_update", toPublicState(event.roomId, result.state));
      } catch (error) {
        socket.emit("error_event", {
          message: error instanceof Error ? error.message : "Invalid move."
        });
      }
    });
  });

  return io;
};
