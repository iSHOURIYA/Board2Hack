"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const engine_1 = require("../../src/game/engine");
(0, vitest_1.describe)("game engine", () => {
    (0, vitest_1.test)("creates valid initial game state", () => {
        const state = (0, engine_1.createInitialState)("room-1", ["p1", "p2"]);
        (0, vitest_1.expect)(state.totemStack.length).toBe(9);
        (0, vitest_1.expect)(state.playerOrder).toEqual(["p1", "p2"]);
        (0, vitest_1.expect)(state.players.p1.hand.length).toBe(7);
        (0, vitest_1.expect)(state.players.p2.hand.length).toBe(7);
    });
    (0, vitest_1.test)("scores top/middle/bottom correctly", () => {
        const score = (0, engine_1.calculateRoundScore)([7, 2, 3], {
            top: 7,
            middle: 2,
            bottom: 3
        });
        (0, vitest_1.expect)(score).toBe(16);
    });
    (0, vitest_1.test)("rejects toast as first move", () => {
        const state = (0, engine_1.createInitialState)("room-2", ["p1", "p2"]);
        state.players.p1.hand = ["TIKI_TOAST", ...state.players.p1.hand.filter((x) => x !== "TIKI_TOAST")];
        (0, vitest_1.expect)(() => (0, engine_1.playCard)(state, {
            playerId: "p1",
            card: "TIKI_TOAST"
        })).toThrow("TIKI_TOAST cannot be played as the first move of a round.");
    });
});
