import type { FastifyInstance } from "fastify";
import { prisma } from "../config/prisma";
import { authenticate } from "../middleware/authenticate";

export const registerProfileRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/profile", { preHandler: [authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        username: true,
        gamesPlayed: true,
        wins: true,
        totalScore: true,
        createdAt: true
      }
    });

    if (!user) {
      throw app.httpErrors.notFound("User not found.");
    }

    return user;
  });
};
