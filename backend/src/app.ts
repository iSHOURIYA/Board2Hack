import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { registerAuthRoutes } from "./routes/auth";
import { registerProfileRoutes } from "./routes/profile";
import { registerLeaderboardRoutes } from "./routes/leaderboards";
import { registerRoomRoutes } from "./routes/rooms";
import { registerMatchmakeRoutes } from "./routes/matchmake";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Tiki Topple Backend API",
        version: "0.1.0"
      }
    }
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs"
  });

  app.get("/health", async () => {
    const dbOk = await prisma.$queryRaw`SELECT 1`;
    const redisOk = await redis.ping();

    return {
      status: "ok",
      db: !!dbOk,
      redis: redisOk === "PONG"
    };
  });

  await registerAuthRoutes(app);
  await registerProfileRoutes(app);
  await registerLeaderboardRoutes(app);
  await registerRoomRoutes(app);
  await registerMatchmakeRoutes(app);

  app.setErrorHandler((error: unknown, _request, reply) => {
    const e = error as { name?: string; message?: string; statusCode?: number };

    if (e.name === "ZodError") {
      return reply.code(400).send({ message: "Validation error", details: e.message });
    }

    const status = e.statusCode ?? 500;
    return reply.code(status).send({ message: e.message || "Internal server error" });
  });

  return app;
};
