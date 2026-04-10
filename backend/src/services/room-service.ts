import { prisma } from "../config/prisma";
import type { RoomStatus } from "@prisma/client";

const ROOM_UNUSED_TTL_MS = 15 * 60 * 1000;

export interface CreateRoomInput {
  hostId: string;
  name: string;
  maxPlayers: number;
  isPrivate?: boolean;
  passwordHash?: string;
  region?: string;
}

export const createRoom = async (input: CreateRoomInput) => {
  const room = await prisma.room.create({
    data: {
      hostId: input.hostId,
      name: input.name,
      maxPlayers: input.maxPlayers,
      isPrivate: input.isPrivate ?? false,
      passwordHash: input.passwordHash,
      region: input.region ?? "global",
      players: {
        create: {
          userId: input.hostId
        }
      }
    },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    }
  });

  return room;
};

export const clearAllRooms = async () => {
  const result = await prisma.room.deleteMany({});
  return result.count;
};

export const deleteExpiredUnusedRooms = async (now: Date = new Date()) => {
  const cutoff = new Date(now.getTime() - ROOM_UNUSED_TTL_MS);
  const candidates = await prisma.room.findMany({
    where: {
      status: "WAITING",
      createdAt: {
        lte: cutoff
      }
    },
    select: {
      id: true,
      hostId: true,
      players: {
        select: {
          userId: true
        }
      },
      gameSessions: {
        select: {
          id: true
        },
        take: 1
      }
    }
  });

  const roomIdsToDelete = candidates
    .filter((room) => {
      const hasOnlyHostPlayer = room.players.every((player) => player.userId === room.hostId);
      const hasNoGameSession = room.gameSessions.length === 0;
      return hasOnlyHostPlayer && hasNoGameSession;
    })
    .map((room) => room.id);

  if (roomIdsToDelete.length === 0) {
    return 0;
  }

  const result = await prisma.room.deleteMany({
    where: {
      id: {
        in: roomIdsToDelete
      }
    }
  });

  return result.count;
};

export const listRooms = async (status: RoomStatus = "WAITING") => {
  return prisma.room.findMany({
    where: {
      status,
      isPrivate: false
    },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

export const joinRoom = async (roomId: string, userId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: true }
  });

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.players.some((p) => p.userId === userId)) {
    return prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
  }

  if (room.players.length >= room.maxPlayers) {
    throw new Error("Room is full.");
  }

  await prisma.roomPlayer.create({
    data: {
      roomId,
      userId
    }
  });

  return prisma.room.findUniqueOrThrow({
    where: { id: roomId },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    }
  });
};
