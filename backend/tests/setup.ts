import { afterEach, vi } from "vitest";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.PORT = process.env.PORT ?? "3000";
process.env.HOST = process.env.HOST ?? "127.0.0.1";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/tikitopple";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-key-test-secret-key";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
