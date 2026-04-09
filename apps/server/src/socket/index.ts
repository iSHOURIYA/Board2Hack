import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@unfair-board/shared-types";
import { getMatch } from "../modules/match-store";

export type MatchSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function createSocketServer(httpServer: HttpServer, corsOrigin: string): MatchSocketServer {
  const io: MatchSocketServer = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("match:join", ({ roomCode }) => {
      socket.join(roomCode);

      const match = getMatch(roomCode);
      if (!match) {
        socket.emit("match:error", "Room does not exist");
        return;
      }

      socket.emit("match:state", match);
    });
  });

  return io;
}
