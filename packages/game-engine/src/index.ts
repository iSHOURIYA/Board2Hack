import type {
  AdvantageMappingConfig,
  ChessMovePayload,
  LudoMovePayload,
  MatchState,
  MovePayload,
  SnakeLadderMovePayload
} from "@unfair-board/shared-types";
import { applyChessMove } from "./chess";
import { applyLudoMove } from "./ludo";
import { applySnakeLadderMove } from "./snake-ladder";
import { chessAdvantageTier, convertChessToLudo } from "./conversion/chess-to-ludo";
import { convertChessToSnakeLadderWithMapping } from "./conversion/chess-to-snake-ladder";
import { DEFAULT_ADVANTAGE_MAPPING } from "./conversion/mapping";

function currentTurnPlayerId(match: MatchState): string | undefined {
  if (match.gameState.gameType === "chess") {
    const turn = match.gameState.chess.currentTurn;
    return match.players.find((p) => p.side === turn)?.id;
  }

  if (match.gameState.gameType === "ludo") {
    return match.gameState.ludo.currentTurnPlayerId;
  }

  return match.gameState.snakeLadder.currentTurnPlayerId;
}

export function applyMove(match: MatchState, playerId: string, payload: MovePayload): MatchState {
  if (match.status !== "active") {
    throw new Error("Match is not active");
  }

  if (payload.gameType === "chess") {
    if (match.gameState.gameType !== "chess") {
      throw new Error("Current match mode is not chess");
    }

    return applyChessMove(match, playerId, payload as ChessMovePayload);
  }

  if (payload.gameType === "ludo") {
    if (match.gameState.gameType !== "ludo") {
      throw new Error("Current match mode is not ludo");
    }

    return applyLudoMove(match, playerId, payload as LudoMovePayload);
  }

  if (match.gameState.gameType !== "snake_ladder") {
    throw new Error("Current match mode is not snake & ladder");
  }

  return applySnakeLadderMove(match, playerId, payload as SnakeLadderMovePayload);
}

export function convertFromChess(
  match: MatchState,
  targetGame: "ludo" | "snake_ladder",
  mapping: AdvantageMappingConfig = DEFAULT_ADVANTAGE_MAPPING
): MatchState {
  if (match.gameState.gameType !== "chess") {
    throw new Error("V1 allows conversion only from chess");
  }

  const tier = chessAdvantageTier(match);
  const favoredPlayerId = currentTurnPlayerId(match) ?? match.players[0]?.id;
  if (!favoredPlayerId) {
    throw new Error("No players in match");
  }

  if (targetGame === "ludo") {
    return {
      ...match,
      version: match.version + 1,
      gameState: {
        gameType: "ludo",
        ludo: convertChessToLudo(match, favoredPlayerId, mapping)
      },
      conversionProposal: undefined,
      conversionHistory: [
        ...match.conversionHistory,
        {
          id: crypto.randomUUID(),
          sourceGame: "chess",
          targetGame: "ludo",
          tier,
          appliedMappingVersion: mapping.version,
          favoredPlayerId,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  return {
    ...match,
    version: match.version + 1,
    gameState: {
      gameType: "snake_ladder",
      snakeLadder: convertChessToSnakeLadderWithMapping(match, favoredPlayerId, mapping)
    },
    conversionProposal: undefined,
    conversionHistory: [
      ...match.conversionHistory,
      {
        id: crypto.randomUUID(),
        sourceGame: "chess",
        targetGame: "snake_ladder",
        tier,
        appliedMappingVersion: mapping.version,
        favoredPlayerId,
        createdAt: new Date().toISOString()
      }
    ]
  };
}

export { DEFAULT_ADVANTAGE_MAPPING };
