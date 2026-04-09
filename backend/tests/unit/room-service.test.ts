import { describe, expect, test, vi } from "vitest";

const roomState = new Map<string, any>();

const prismaMock = {
  room: {
    create: vi.fn(async ({ data }: any) => {
      const room = {
        id: "room-1",
        ...data,
        players: [
          {
            user: { id: data.hostId, username: "host" }
          }
        ]
      };
      roomState.set(room.id, room);
      return room;
    }),
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async ({ where }: any) => roomState.get(where.id) ?? null),
    findUniqueOrThrow: vi.fn(async ({ where }: any) => {
      const room = roomState.get(where.id);
      if (!room) throw new Error("Room not found.");
      return room;
    })
  },
  roomPlayer: {
    create: vi.fn(async ({ data }: any) => {
      const room = roomState.get(data.roomId);
      room.players.push({
        userId: data.userId,
        user: { id: data.userId, username: `user-${data.userId}` }
      });
      return { id: "rp-1", ...data };
    })
  }
};

vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));

const loadModule = async () => import("../../src/services/room-service");

describe("room-service", () => {
  test("createRoom seeds the host into the room", async () => {
    const { createRoom } = await loadModule();
    const room = await createRoom({
      hostId: "host-1",
      name: "Lobby",
      maxPlayers: 4,
      isPrivate: true,
      passwordHash: "hash",
      region: "global"
    });

    expect(room.id).toBe("room-1");
    expect(room.players[0].user.id).toBe("host-1");
  });

  test("joinRoom adds a new player and returns the updated room", async () => {
    const { joinRoom } = await loadModule();
    const room = await joinRoom("room-1", "player-2");

    expect(room.players.map((player: any) => player.user.id)).toContain("player-2");
  });

  test("joinRoom rejects a full room", async () => {
    roomState.set("room-full", {
      id: "room-full",
      maxPlayers: 2,
      players: [{ userId: "a" }, { userId: "b" }]
    });

    const { joinRoom } = await loadModule();

    await expect(joinRoom("room-full", "c")).rejects.toThrow("Room is full.");
  });
});
