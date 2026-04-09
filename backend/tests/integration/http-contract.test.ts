import { beforeEach, describe, expect, test, vi } from "vitest";

const serviceMocks = {
  auth: {
    registerUser: vi.fn(async () => ({ token: "register-token" })),
    loginUser: vi.fn(async () => ({ token: "login-token" }))
  },
  room: {
    createRoom: vi.fn(async () => ({ id: "room-1" })),
    listRooms: vi.fn(async () => [
      {
        id: "room-1",
        hostId: "host-1",
        name: "Lobby",
        isPrivate: false,
        maxPlayers: 4,
        region: "global",
        status: "WAITING",
        createdAt: new Date("2026-04-09T00:00:00.000Z"),
        players: [{ user: { id: "host-1", username: "host" } }]
      }
    ]),
    joinRoom: vi.fn(async () => ({
      id: "room-1",
      players: [{ user: { id: "host-1", username: "host" } }, { user: { id: "player-2", username: "player2" } }]
    }))
  },
  matchmaking: {
    enqueueForMatchmaking: vi.fn(async () => undefined),
    tryDequeueMatch: vi.fn(async () => [])
  }
};

const prismaMock = {
  $queryRaw: vi.fn(async () => [1]),
  user: {
    findMany: vi.fn(async () => [
      {
        id: "leader-1",
        username: "leader",
        totalScore: 50,
        wins: 2,
        gamesPlayed: 5
      }
    ]),
    findUnique: vi.fn(async () => ({
      id: "user-1",
      email: "player@example.com",
      username: "player1",
      gamesPlayed: 1,
      wins: 0,
      totalScore: 9,
      createdAt: new Date("2026-04-09T00:00:00.000Z")
    }))
  },
  room: {
    findUnique: vi.fn(async () => ({
      id: "room-1",
      isPrivate: true,
      passwordHash: "hash"
    }))
  }
};

const redisMock = {
  ping: vi.fn(async () => "PONG")
};

vi.mock("../../src/services/auth-service", () => ({
  registerUser: serviceMocks.auth.registerUser,
  loginUser: serviceMocks.auth.loginUser
}));
vi.mock("../../src/services/room-service", () => ({
  createRoom: serviceMocks.room.createRoom,
  listRooms: serviceMocks.room.listRooms,
  joinRoom: serviceMocks.room.joinRoom
}));
vi.mock("../../src/services/matchmaking-service", () => ({
  enqueueForMatchmaking: serviceMocks.matchmaking.enqueueForMatchmaking,
  tryDequeueMatch: serviceMocks.matchmaking.tryDequeueMatch
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/config/redis", () => ({ redis: redisMock }));

const loadApp = async () => import("../../src/app");

beforeEach(() => {
  for (const group of Object.values(serviceMocks)) {
    for (const fn of Object.values(group)) {
      fn.mockClear();
    }
  }
  prismaMock.$queryRaw.mockClear();
  prismaMock.user.findMany.mockClear();
  prismaMock.user.findUnique.mockClear();
  prismaMock.room.findUnique.mockClear();
  redisMock.ping.mockClear();
});

describe("HTTP contract", () => {
  test("health endpoint reports DB and Redis connectivity", async () => {
    const { buildApp } = await loadApp();
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", db: true, redis: true });
  });

  test("register endpoint returns a token", async () => {
    const { buildApp } = await loadApp();
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "player@example.com",
        username: "player1",
        password: "password123"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ token: "register-token" });
  });

  test("room creation requires auth and body validation", async () => {
    const { buildApp } = await loadApp();
    const app = await buildApp();
    const token = app.jwt.sign({ sub: "user-1", username: "player1" });

    const missingAuth = await app.inject({
      method: "POST",
      url: "/api/v1/rooms",
      payload: {
        name: "Lobby",
        maxPlayers: 4
      }
    });

    expect(missingAuth.statusCode).toBe(401);

    const invalidBody = await app.inject({
      method: "POST",
      url: "/api/v1/rooms",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        name: "x",
        maxPlayers: 5
      }
    });

    expect(invalidBody.statusCode).toBe(400);
  });

  test("matchmake endpoint returns queued state when no players are matched", async () => {
    const { buildApp } = await loadApp();
    const app = await buildApp();
    const token = app.jwt.sign({ sub: "user-1", username: "player1" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/matchmake",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        requiredPlayers: 2,
        region: "global"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "queued" });
  });

  test("leaderboards endpoint returns ranked players", async () => {
    const { buildApp } = await loadApp();
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/v1/leaderboards?limit=1" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      leaders: [
        {
          id: "leader-1",
          username: "leader",
          totalScore: 50,
          wins: 2,
          gamesPlayed: 5
        }
      ]
    });
  });
});
