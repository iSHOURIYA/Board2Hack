import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { loginUser, registerUser } from "../services/auth-service";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8)
});

const loginSchema = z.object({
  identity: z.string().min(1),
  password: z.string().min(8)
});

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/v1/auth/register", async (request, reply) => {
    const payload = registerSchema.parse(request.body);
    const result = await registerUser(app, payload);
    return reply.code(201).send(result);
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const result = await loginUser(app, payload);
    return reply.send(result);
  });
};
