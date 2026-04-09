import { describe, expect, test, vi } from "vitest";

const redisMock = {
  lrem: vi.fn(async () => 1),
  rpush: vi.fn(async () => 1),
  lpop: vi.fn(),
  lpush: vi.fn(async () => 1)
};

vi.mock("../../src/config/redis", () => ({ redis: redisMock }));

const loadModule = async () => import("../../src/services/matchmaking-service");

describe("matchmaking-service", () => {
  test("enqueueForMatchmaking replaces duplicates and enqueues the player", async () => {
    const { enqueueForMatchmaking } = await loadModule();
    await enqueueForMatchmaking("player-1");

    expect(redisMock.lrem).toHaveBeenCalledWith("tiki:matchmaking:queue", 0, "player-1");
    expect(redisMock.rpush).toHaveBeenCalledWith("tiki:matchmaking:queue", "player-1");
  });

  test("tryDequeueMatch restores the queue when not enough players exist", async () => {
    redisMock.lpop
      .mockResolvedValueOnce("player-1")
      .mockResolvedValueOnce(undefined);

    const { tryDequeueMatch } = await loadModule();
    const result = await tryDequeueMatch(2);

    expect(result).toEqual([]);
    expect(redisMock.lpush).toHaveBeenCalledWith("tiki:matchmaking:queue", "player-1");
  });

  test("tryDequeueMatch returns a full match when enough players exist", async () => {
    redisMock.lpop
      .mockResolvedValueOnce("player-1")
      .mockResolvedValueOnce("player-2");

    const { tryDequeueMatch } = await loadModule();
    const result = await tryDequeueMatch(2);

    expect(result).toEqual(["player-1", "player-2"]);
  });
});
