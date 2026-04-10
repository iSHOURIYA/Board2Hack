import { describe, expect, test } from "vitest";
import { calculateRoundScore, createInitialState, playCard } from "../../src/game/engine";

describe("game engine", () => {
  test("creates valid initial game state", () => {
    const state = createInitialState("room-1", ["p1", "p2"]);

    expect(state.totemStack.length).toBe(9);
    expect(state.playerOrder).toEqual(["p1", "p2"]);
    expect(state.players.p1.hand.length).toBe(7);
    expect(state.players.p2.hand.length).toBe(7);
  });

  test("scores top/middle/bottom correctly", () => {
    const score = calculateRoundScore([7, 2, 3], {
      top: 7,
      middle: 2,
      bottom: 3
    });

    expect(score).toBe(16);
  });

  test("rejects toast as first move", () => {
    const state = createInitialState("room-2", ["p1", "p2"]);
    state.players.p1.hand = ["TIKI_TOAST", ...state.players.p1.hand.filter((x) => x !== "TIKI_TOAST")];

    expect(() =>
      playCard(state, {
        playerId: "p1",
        card: "TIKI_TOAST"
      })
    ).toThrow("TIKI_TOAST cannot be played as the first move of a round.");
  });

  test("rejects TIKI_UP_3 when the target is too close to the top", () => {
    const state = createInitialState("room-3", ["p1", "p2"]);
    state.totemStack = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    state.players.p1.hand = ["TIKI_UP_3"];

    expect(() =>
      playCard(state, {
        playerId: "p1",
        card: "TIKI_UP_3",
        targetTikiId: 12
      })
    ).toThrow("TIKI_UP_3 requires at least 3 spaces above the target tiki.");
  });

  test("automatically starts the next round when a round ends", () => {
    const state = createInitialState("room-4", ["p1", "p2"]);

    state.roundNumber = 1;
    state.maxRounds = 4;
    state.currentPlayerId = "p1";
    state.totemStack = [1, 2, 3, 4];
    state.cardsPlayedCount = 1;
    state.players.p1.hand = ["TIKI_TOAST"];
    state.players.p2.hand = ["TIKI_UP_1"];

    const result = playCard(state, {
      playerId: "p1",
      card: "TIKI_TOAST",
      targetTikiId: 999
    });

    expect(result.state.gameComplete).toBe(false);
    expect(result.state.roundNumber).toBe(2);
    expect(result.state.roundComplete).toBe(false);
    expect(result.state.cardsPlayedCount).toBe(0);
    expect(result.state.totemStack.length).toBe(9);
    expect(result.state.lastCompletedRound).toBe(1);
    expect(result.state.lastRoundTopThree).toEqual([1, 2, 3]);
  });
});
