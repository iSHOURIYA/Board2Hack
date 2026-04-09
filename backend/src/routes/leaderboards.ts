import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20)
});

export const registerLeaderboardRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/leaderboards", async (request) => {
    const { limit } = querySchema.parse(request.query ?? {});

    const leaders = await prisma.user.findMany({
      take: limit,
      orderBy: [{ totalScore: "desc" }, { wins: "desc" }],
      select: {
        id: true,
        username: true,
        totalScore: true,
        wins: true,
        gamesPlayed: true
      }
    });

    return { leaders };
  });
};
