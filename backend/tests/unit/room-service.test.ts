import { beforeEach, describe, expect, test, vi } from "vitest";

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
    findMany: vi.fn(async ({ where }: any = {}) => {
      if (!where?.createdAt?.lte) {
        return [];
      }

      const cutoff = where.createdAt.lte as Date;
      return Array.from(roomState.values()).filter(
        (room) => room.status === "WAITING" && room.createdAt && room.createdAt <= cutoff
      );
    }),
    findUnique: vi.fn(async ({ where }: any) => roomState.get(where.id) ?? null),
    findUniqueOrThrow: vi.fn(async ({ where }: any) => {
      const room = roomState.get(where.id);
      if (!room) throw new Error("Room not found.");
      return room;
    }),
    deleteMany: vi.fn(async ({ where }: any) => {
      const ids = where?.id?.in ?? [];
      let count = 0;
      for (const id of ids) {
        if (roomState.delete(id)) {
          count += 1;
        }
      }
      return { count };
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
  beforeEach(() => {
    roomState.clear();
  });

  test("deleteExpiredUnusedRooms removes waiting rooms older than 15 minutes when only host is present", async () => {
    const now = new Date("2026-04-10T12:20:00.000Z");
    roomState.set("room-expired", {
      id: "room-expired",
      hostId: "host-1",
      status: "WAITING",
      createdAt: new Date("2026-04-10T12:00:00.000Z"),
      players: [{ userId: "host-1" }],
      gameSessions: []
    });
    roomState.set("room-active", {
      id: "room-active",
      hostId: "host-2",
      status: "WAITING",
      createdAt: new Date("2026-04-10T12:10:00.000Z"),
      players: [{ userId: "host-2" }],
      gameSessions: []
    });

    const { deleteExpiredUnusedRooms } = await loadModule();
    const deletedCount = await deleteExpiredUnusedRooms(now);

    expect(deletedCount).toBe(1);
    expect(roomState.has("room-expired")).toBe(false);
    expect(roomState.has("room-active")).toBe(true);
  });

  test("deleteExpiredUnusedRooms keeps old rooms that already had activity", async () => {
    const now = new Date("2026-04-10T12:20:00.000Z");
    roomState.set("room-with-guest", {
      id: "room-with-guest",
      hostId: "host-3",
      status: "WAITING",
      createdAt: new Date("2026-04-10T12:00:00.000Z"),
      players: [{ userId: "host-3" }, { userId: "guest-1" }],
      gameSessions: []
    });
    roomState.set("room-with-game", {
      id: "room-with-game",
      hostId: "host-4",
      status: "WAITING",
      createdAt: new Date("2026-04-10T12:00:00.000Z"),
      players: [{ userId: "host-4" }],
      gameSessions: [{ id: "game-1" }]
    });

    const { deleteExpiredUnusedRooms } = await loadModule();
    const deletedCount = await deleteExpiredUnusedRooms(now);

    expect(deletedCount).toBe(0);
    expect(roomState.has("room-with-guest")).toBe(true);
    expect(roomState.has("room-with-game")).toBe(true);
  });

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
    const { createRoom, joinRoom } = await loadModule();
    await createRoom({
      hostId: "host-1",
      name: "Lobby",
      maxPlayers: 4
    });
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
