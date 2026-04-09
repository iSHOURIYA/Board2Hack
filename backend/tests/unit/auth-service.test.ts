import { describe, expect, test, vi } from "vitest";

const prismaMock = {
  user: {
    findFirst: vi.fn(),
    create: vi.fn()
  }
};

const httpErrors = {
  conflict: (message: string) => Object.assign(new Error(message), { statusCode: 409 }),
  unauthorized: (message: string) => Object.assign(new Error(message), { statusCode: 401 })
};

vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/auth/password", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  verifyPassword: vi.fn(async (_hash: string, password: string) => password === "correct-password")
}));
vi.mock("../../src/auth/jwt", () => ({
  signAccessToken: vi.fn((_app, payload) => `token:${payload.sub}:${payload.username}`)
}));

const loadModule = async () => import("../../src/services/auth-service");

describe("auth-service", () => {
  test("registerUser creates a user and returns a token", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user-1", username: "player1" });

    const { registerUser } = await loadModule();
    const result = await registerUser({ httpErrors } as never, {
      email: "player@example.com",
      username: "player1",
      password: "secret123"
    });

    expect(result).toEqual({ token: "token:user-1:player1" });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "player@example.com",
        username: "player1",
        passwordHash: "hashed:secret123"
      }
    });
  });

  test("registerUser rejects duplicates", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "existing" });

    const { registerUser } = await loadModule();

    await expect(
      registerUser({ httpErrors } as never, {
        email: "player@example.com",
        username: "player1",
        password: "secret123"
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("loginUser returns a token for valid credentials", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user-2",
      username: "player2",
      passwordHash: "hashed:correct-password"
    });

    const { loginUser } = await loadModule();
    const result = await loginUser({ httpErrors } as never, {
      identity: "player2",
      password: "correct-password"
    });

    expect(result).toEqual({ token: "token:user-2:player2" });
  });

  test("loginUser rejects invalid credentials", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user-2",
      username: "player2",
      passwordHash: "hashed:wrong"
    });

    const { loginUser } = await loadModule();

    await expect(
      loginUser({ httpErrors } as never, {
        identity: "player2",
        password: "wrong"
      })
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
