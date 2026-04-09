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
});
