import { redis } from "../config/redis";

const QUEUE_KEY = "tiki:matchmaking:queue";

export const enqueueForMatchmaking = async (userId: string): Promise<void> => {
  await redis.lrem(QUEUE_KEY, 0, userId);
  await redis.rpush(QUEUE_KEY, userId);
};

export const tryDequeueMatch = async (requiredPlayers: number): Promise<string[]> => {
  const players: string[] = [];

  for (let i = 0; i < requiredPlayers; i += 1) {
    const player = await redis.lpop(QUEUE_KEY);
    if (!player) {
      break;
    }
    players.push(player);
  }

  if (players.length < requiredPlayers) {
    for (const player of players) {
      await redis.lpush(QUEUE_KEY, player);
    }
    return [];
  }

  return players;
};
