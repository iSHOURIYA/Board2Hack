import type { FastifyInstance } from "fastify";
import { hashPassword, verifyPassword } from "../auth/password";
import { signAccessToken } from "../auth/jwt";
import { prisma } from "../config/prisma";

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  identity: string;
  password: string;
}

export const registerUser = async (app: FastifyInstance, input: RegisterInput): Promise<{ token: string }> => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }]
    }
  });

  if (existing) {
    throw app.httpErrors.conflict("Email or username already in use.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash
    }
  });

  return {
    token: signAccessToken(app, { sub: user.id, username: user.username })
  };
};

export const loginUser = async (app: FastifyInstance, input: LoginInput): Promise<{ token: string }> => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.identity }, { username: input.identity }]
    }
  });

  if (!user) {
    throw app.httpErrors.unauthorized("Invalid credentials.");
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw app.httpErrors.unauthorized("Invalid credentials.");
  }

  return {
    token: signAccessToken(app, { sub: user.id, username: user.username })
  };
};
