import { Chess } from "chess.js";
import type { ChessMovePayload, MatchState } from "@unfair-board/shared-types";
import { InvalidMoveError, NotYourTurnError } from "./errors";

export function applyChessMove(match: MatchState, playerId: string, payload: ChessMovePayload): MatchState {
  if (match.gameState.gameType !== "chess") {
    throw new InvalidMoveError("Match is not in chess mode");
  }

  const player = match.players.find((p) => p.id === playerId);
  if (!player) {
    throw new InvalidMoveError("Player not part of match");
  }

  const chessState = match.gameState.chess;
  if (player.side !== chessState.currentTurn) {
    throw new NotYourTurnError();
  }

  const chess = new Chess(chessState.fen);
  const beforeMoves = chess.moves({ verbose: true });
  const legal = beforeMoves.find((m) => m.from === payload.from && m.to === payload.to);
  if (!legal) {
    throw new InvalidMoveError("Illegal chess move");
  }

  const move = chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion });
  if (!move) {
    throw new InvalidMoveError("Illegal chess move");
  }

  const winnerPlayerId =
    chess.isCheckmate() && chess.turn() === "w"
      ? match.players.find((p) => p.side === "black")?.id
      : chess.isCheckmate() && chess.turn() === "b"
        ? match.players.find((p) => p.side === "white")?.id
        : undefined;

  const isDraw = chess.isDraw();
  const result = winnerPlayerId
    ? winnerPlayerId === match.players.find((p) => p.side === "white")?.id
      ? "white_win"
      : "black_win"
    : isDraw
      ? "draw"
      : undefined;

  return {
    ...match,
    winnerPlayerId,
    status: winnerPlayerId || isDraw ? "completed" : match.status,
    version: match.version + 1,
    gameState: {
      gameType: "chess",
      chess: {
        fen: chess.fen(),
        moveCount: chessState.moveCount + 1,
        currentTurn: chess.turn() === "w" ? "white" : "black",
        inCheck: chess.inCheck(),
        result,
        moves: [...chessState.moves, move.san]
      }
    }
  };
}
