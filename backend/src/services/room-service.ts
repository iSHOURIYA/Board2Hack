import { prisma } from "../config/prisma";
import type { RoomStatus } from "@prisma/client";

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
