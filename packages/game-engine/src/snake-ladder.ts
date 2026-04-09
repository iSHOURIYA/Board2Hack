import type { MatchState, SnakeLadderMovePayload } from "@unfair-board/shared-types";
import { InvalidMoveError, NotYourTurnError } from "./errors";

const LADDERS: Record<number, number> = {
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98
};

const SNAKES: Record<number, number> = {
  16: 6,
  46: 25,
  49: 11,
  62: 19,
  64: 60,
  74: 53,
  89: 68,
  92: 88,
  95: 75,
  99: 80
};

function resolveBoardEffect(position: number): number {
  if (LADDERS[position]) return LADDERS[position];
  if (SNAKES[position]) return SNAKES[position];
  return position;
}

export function applySnakeLadderMove(
  match: MatchState,
  playerId: string,
  payload: SnakeLadderMovePayload
): MatchState {
  if (match.gameState.gameType !== "snake_ladder") {
    throw new InvalidMoveError("Match is not in snake & ladder mode");
  }

  if (payload.roll < 1 || payload.roll > 6) {
    throw new InvalidMoveError("Roll must be between 1 and 6");
  }

  const player = match.players.find((p) => p.id === playerId);
  if (!player) {
    throw new InvalidMoveError("Player not part of match");
  }

  const snake = match.gameState.snakeLadder;
  if (snake.currentTurnPlayerId !== playerId) {
    throw new NotYourTurnError();
  }

  const current = snake.positions[playerId] ?? 1;
  const raw = current + payload.roll;
  const next = raw > 100 ? current : resolveBoardEffect(raw);

  const positions = {
    ...snake.positions,
    [playerId]: next
  };

  const opponent = match.players.find((p) => p.id !== playerId);
  const winnerPlayerId = next === 100 ? playerId : undefined;
  const keepTurn = payload.roll === 6 && !winnerPlayerId;

  return {
    ...match,
    winnerPlayerId,
    status: winnerPlayerId ? "completed" : match.status,
    version: match.version + 1,
    gameState: {
      gameType: "snake_ladder",
      snakeLadder: {
        positions,
        currentTurnPlayerId: keepTurn ? playerId : opponent?.id ?? playerId,
        lastRoll: payload.roll,
        result: winnerPlayerId
      }
    }
  };
}
