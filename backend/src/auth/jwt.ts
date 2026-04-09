import type { FastifyInstance } from "fastify";

export interface AccessTokenPayload {
  sub: string;
  username: string;
}

export const signAccessToken = (app: FastifyInstance, payload: AccessTokenPayload): string => {
  return app.jwt.sign(payload);
};
