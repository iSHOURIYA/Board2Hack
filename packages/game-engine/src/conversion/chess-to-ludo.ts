import type { AdvantageMappingConfig, AdvantageTier, LudoState, MatchState } from "@unfair-board/shared-types";
import { DEFAULT_ADVANTAGE_MAPPING } from "./mapping";

function baseLudoState(playerAId: string, playerBId: string): LudoState {
  return {
    tokensByPlayer: {
      [playerAId]: [{ zone: "yard" }, { zone: "yard" }, { zone: "yard" }, { zone: "yard" }],
      [playerBId]: [{ zone: "yard" }, { zone: "yard" }, { zone: "yard" }, { zone: "yard" }]
    },
    currentTurnPlayerId: playerAId,
    consecutiveSixes: 0
  };
}

function materialScoreFromFen(fen: string): number {
  const pieces = fen.split(" ")[0];
  const scoreMap: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };

  let white = 0;
  let black = 0;

  for (const c of pieces) {
    if (c === "/" || Number.isInteger(Number(c))) {
      continue;
    }

    const v = scoreMap[c.toLowerCase()] ?? 0;
    if (c === c.toUpperCase()) {
      white += v;
    } else {
      black += v;
    }
  }

  return white - black;
}

export function chessAdvantageTier(match: MatchState): AdvantageTier {
  if (match.gameState.gameType !== "chess") {
    throw new Error("Advantage tier can only be calculated from chess state");
  }

  const chess = match.gameState.chess;
  const score = materialScoreFromFen(chess.fen);
  const currentPlayer = match.players.find((p) => p.side === chess.currentTurn);

  if (!currentPlayer) {
    return "slight";
  }

  const signed = currentPlayer.side === "white" ? score : -score;
  if (signed >= 12) return "almost_winning";
  if (signed >= 7) return "dominating";
  if (signed >= 3) return "clear";
  return "slight";
}

export function convertChessToLudo(
  match: MatchState,
  favoredPlayerId: string,
  mapping: AdvantageMappingConfig = DEFAULT_ADVANTAGE_MAPPING
): LudoState {
  if (match.gameState.gameType !== "chess") {
    throw new Error("Source game must be chess");
  }

  if (match.players.length !== 2) {
    throw new Error("V1 supports exactly 2 players");
  }

  const [playerA, playerB] = match.players;
  const tier = chessAdvantageTier(match);
  const ludo = baseLudoState(playerA.id, playerB.id);
  const grant = mapping.chessToLudo[tier];

  if (!ludo.tokensByPlayer[favoredPlayerId]) {
    return ludo;
  }

  if (grant.primarySteps > 0) {
    ludo.tokensByPlayer[favoredPlayerId][0] = { zone: "track", steps: grant.primarySteps };
  }

  if (grant.secondarySteps > 0) {
    ludo.tokensByPlayer[favoredPlayerId][1] = { zone: "track", steps: grant.secondarySteps };
  }

  return ludo;
}
