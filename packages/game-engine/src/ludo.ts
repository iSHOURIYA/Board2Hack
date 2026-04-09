import type { LudoMovePayload, LudoTokenState, MatchState } from "@unfair-board/shared-types";
import { InvalidMoveError, NotYourTurnError } from "./errors";

const FINISH_STEPS = 56;

function cloneTokens(tokens: LudoTokenState[]): LudoTokenState[] {
  return tokens.map((t) => (t.zone === "track" ? { zone: "track", steps: t.steps } : { zone: t.zone }));
}

function tokenNextState(token: LudoTokenState, roll: number): LudoTokenState | null {
  if (token.zone === "yard") {
    if (roll !== 6) return null;
    return { zone: "track", steps: 1 };
  }

  if (token.zone === "home") {
    return null;
  }

  const steps = token.steps + roll;
  if (steps > FINISH_STEPS) {
    return null;
  }

  if (steps === FINISH_STEPS) {
    return { zone: "home" };
  }

  return { zone: "track", steps };
}

export function applyLudoMove(match: MatchState, playerId: string, payload: LudoMovePayload): MatchState {
  if (match.gameState.gameType !== "ludo") {
    throw new InvalidMoveError("Match is not in ludo mode");
  }

  const player = match.players.find((p) => p.id === playerId);
  if (!player) {
    throw new InvalidMoveError("Player not part of match");
  }

  const ludo = match.gameState.ludo;
  if (ludo.currentTurnPlayerId !== playerId) {
    throw new NotYourTurnError();
  }

  if (payload.roll < 1 || payload.roll > 6) {
    throw new InvalidMoveError("Roll must be between 1 and 6");
  }

  const tokens = cloneTokens(ludo.tokensByPlayer[playerId] ?? []);
  if (!tokens[payload.tokenIndex]) {
    throw new InvalidMoveError("Invalid token index");
  }

  const updatedToken = tokenNextState(tokens[payload.tokenIndex], payload.roll);
  if (!updatedToken) {
    throw new InvalidMoveError("Token cannot move with this roll");
  }

  tokens[payload.tokenIndex] = updatedToken;

  const opponent = match.players.find((p) => p.id !== playerId);
  const tokensByPlayer = {
    ...ludo.tokensByPlayer,
    [playerId]: tokens
  };

  // Capture logic: same tracked steps sends enemy token back to yard.
  if (updatedToken.zone === "track" && opponent) {
    const enemyTokens = cloneTokens(tokensByPlayer[opponent.id] ?? []);
    let changed = false;
    for (let i = 0; i < enemyTokens.length; i += 1) {
      const enemyToken = enemyTokens[i];
      if (enemyToken.zone === "track" && enemyToken.steps === updatedToken.steps) {
        enemyTokens[i] = { zone: "yard" };
        changed = true;
      }
    }

    if (changed) {
      tokensByPlayer[opponent.id] = enemyTokens;
    }
  }

  const winnerPlayerId = tokens.every((t) => t.zone === "home") ? playerId : undefined;
  const keepTurn = payload.roll === 6 && !winnerPlayerId;

  return {
    ...match,
    winnerPlayerId,
    status: winnerPlayerId ? "completed" : match.status,
    version: match.version + 1,
    gameState: {
      gameType: "ludo",
      ludo: {
        tokensByPlayer,
        currentTurnPlayerId: keepTurn ? playerId : opponent?.id ?? playerId,
        lastRoll: payload.roll,
        consecutiveSixes: payload.roll === 6 ? ludo.consecutiveSixes + 1 : 0,
        result: winnerPlayerId
      }
    }
  };
}
