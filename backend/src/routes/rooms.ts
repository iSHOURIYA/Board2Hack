import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/password";
import { authenticate } from "../middleware/authenticate";
import { createRoom, joinRoom, listRooms } from "../services/room-service";
import { prisma } from "../config/prisma";

const createRoomSchema = z.object({
  name: z.string().min(2).max(80),
  maxPlayers: z.coerce.number().min(2).max(4),
  isPrivate: z.boolean().optional(),
  password: z.string().min(4).max(128).optional(),
  region: z.string().min(2).max(32).optional()
});

const joinSchema = z.object({
  password: z.string().optional()
});

export const registerRoomRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/rooms", async () => {
    const rooms = await listRooms();
    return {
      rooms: rooms.map((room) => ({
        id: room.id,
        hostId: room.hostId,
        name: room.name,
        isPrivate: room.isPrivate,
        maxPlayers: room.maxPlayers,
        region: room.region,
        status: room.status,
        createdAt: room.createdAt,
        players: room.players.map((player) => player.user)
      }))
    };
  });

  app.post("/api/v1/rooms", { preHandler: [authenticate] }, async (request, reply) => {
    const payload = createRoomSchema.parse(request.body);

    const room = await createRoom({
      hostId: request.user.sub,
      name: payload.name,
      maxPlayers: payload.maxPlayers,
      isPrivate: payload.isPrivate,
      passwordHash: payload.password ? await hashPassword(payload.password) : undefined,
      region: payload.region
    });

    return reply.code(201).send({ roomId: room.id });
  });

  app.post("/api/v1/rooms/:roomId/join", { preHandler: [authenticate] }, async (request, reply) => {
    const roomId = z.string().parse((request.params as Record<string, string>).roomId);
    const payload = joinSchema.parse(request.body ?? {});

    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      throw app.httpErrors.notFound("Room not found.");
    }

    if (room.isPrivate) {
      if (!payload.password || !room.passwordHash) {
        throw app.httpErrors.unauthorized("Room password required.");
      }
      const ok = await verifyPassword(room.passwordHash, payload.password);
      if (!ok) {
        throw app.httpErrors.unauthorized("Invalid room password.");
      }
    }

    const updated = await joinRoom(roomId, request.user.sub);
    return reply.send({
      roomId: updated.id,
      players: updated.players.map((p) => p.user)
    });
  });
};
