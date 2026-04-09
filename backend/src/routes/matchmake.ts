import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { enqueueForMatchmaking, tryDequeueMatch } from "../services/matchmaking-service";
import { createRoom, joinRoom } from "../services/room-service";

const queueSchema = z.object({
  requiredPlayers: z.coerce.number().min(2).max(4).default(2),
  region: z.string().optional()
});

export const registerMatchmakeRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/v1/matchmake", { preHandler: [authenticate] }, async (request) => {
    const payload = queueSchema.parse(request.body ?? {});

    await enqueueForMatchmaking(request.user.sub);

    const matchedPlayers = await tryDequeueMatch(payload.requiredPlayers);
    if (matchedPlayers.length === 0) {
      return {
        status: "queued"
      };
    }

    const hostId = matchedPlayers[0];
    const room = await createRoom({
      hostId,
      name: "Quick Match",
      maxPlayers: payload.requiredPlayers,
      isPrivate: false,
      region: payload.region ?? "global"
    });

    for (const playerId of matchedPlayers.slice(1)) {
      await joinRoom(room.id, playerId);
    }

    return {
      status: "matched",
      roomId: room.id,
      players: matchedPlayers
    };
  });
};
