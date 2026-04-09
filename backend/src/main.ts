import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { registerSocketServer } from "./socket/register-socket";

const bootstrap = async (): Promise<void> => {
  const app = await buildApp();

  await prisma.$connect();
  await redis.connect();

  registerSocketServer(app, app.server);
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`HTTP and WS server listening on ${env.HOST}:${env.PORT}`);

  const shutdown = async () => {
    app.log.info("Shutting down server...");
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
