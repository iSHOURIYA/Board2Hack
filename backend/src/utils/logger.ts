import pino from "pino";
import { env } from "../config/env";

export const loggerOptions = {
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true }
        }
      : undefined
};

export const logger = pino(loggerOptions);
