import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { registerSocketServer } from "./socket/register-socket";
import { clearAllRooms, deleteExpiredUnusedRooms } from "./services/room-service";

const ROOM_EXPIRY_SWEEP_INTERVAL_MS = 60 * 1000;

const bootstrap = async (): Promise<void> => {
  const app = await buildApp();

  await prisma.$connect();
  await redis.connect();

  const deletedRoomCount = await clearAllRooms();
  app.log.info({ deletedRoomCount }, "Cleared existing rooms for clean startup");

  registerSocketServer(app, app.server);
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`HTTP and WS server listening on ${env.HOST}:${env.PORT}`);

  const runRoomExpirySweep = async () => {
    try {
      const deletedCount = await deleteExpiredUnusedRooms();
      if (deletedCount > 0) {
        app.log.info({ deletedCount }, "Deleted expired unused rooms");
      }
    } catch (error) {
      app.log.error({ error }, "Failed to delete expired unused rooms");
    }
  };

  await runRoomExpirySweep();
  const roomExpirySweepInterval = setInterval(runRoomExpirySweep, ROOM_EXPIRY_SWEEP_INTERVAL_MS);

  const shutdown = async () => {
    app.log.info("Shutting down server...");
    clearInterval(roomExpirySweepInterval);
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
