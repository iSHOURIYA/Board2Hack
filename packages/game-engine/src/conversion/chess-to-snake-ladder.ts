import type { AdvantageMappingConfig, MatchState, SnakeLadderState } from "@unfair-board/shared-types";
import { chessAdvantageTier } from "./chess-to-ludo";
import { DEFAULT_ADVANTAGE_MAPPING } from "./mapping";

function baseState(playerAId: string, playerBId: string): SnakeLadderState {
  return {
    positions: {
      [playerAId]: 1,
      [playerBId]: 1
    },
    currentTurnPlayerId: playerAId
  };
}

export function convertChessToSnakeLadderWithMapping(
  match: MatchState,
  favoredPlayerId: string,
  mapping: AdvantageMappingConfig = DEFAULT_ADVANTAGE_MAPPING
): SnakeLadderState {
  if (match.gameState.gameType !== "chess") {
    throw new Error("Source game must be chess");
  }

  if (match.players.length !== 2) {
    throw new Error("V1 supports exactly 2 players");
  }

  const [playerA, playerB] = match.players;
  const state = baseState(playerA.id, playerB.id);
  const tier = chessAdvantageTier(match);

  if (state.positions[favoredPlayerId] !== undefined) {
    state.positions[favoredPlayerId] = mapping.chessToSnakeLadder[tier].startPosition;
  }

  return state;
}
