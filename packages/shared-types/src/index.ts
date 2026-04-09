export type GameType = "chess" | "ludo" | "snake_ladder";
export type AdvantageTier = "slight" | "clear" | "dominating" | "almost_winning";
export type MatchStatus = "waiting" | "active" | "completed";

export interface PlayerState {
  id: string;
  name: string;
  side: "white" | "black";
  connected: boolean;
}

export interface ChessState {
  fen: string;
  moveCount: number;
  currentTurn: "white" | "black";
  inCheck: boolean;
  result?: "white_win" | "black_win" | "draw";
  moves: string[];
}

export type LudoTokenState =
  | { zone: "yard" }
  | { zone: "track"; steps: number }
  | { zone: "home" };

export interface LudoState {
  tokensByPlayer: Record<string, LudoTokenState[]>;
  currentTurnPlayerId: string;
  lastRoll?: number;
  consecutiveSixes: number;
  result?: string;
}

export interface SnakeLadderState {
  positions: Record<string, number>;
  currentTurnPlayerId: string;
  lastRoll?: number;
  result?: string;
}

export type GameStatePayload =
  | { gameType: "chess"; chess: ChessState }
  | { gameType: "ludo"; ludo: LudoState }
  | { gameType: "snake_ladder"; snakeLadder: SnakeLadderState };

export interface ConversionProposal {
  id: string;
  requestedByPlayerId: string;
  targetGame: Exclude<GameType, "chess">;
  status: "pending" | "accepted" | "rejected" | "completed";
  acceptedByPlayerIds: string[];
  createdAt: string;
}

export interface ConversionRecord {
  id: string;
  sourceGame: GameType;
  targetGame: GameType;
  tier: AdvantageTier;
  appliedMappingVersion: string;
  favoredPlayerId: string;
  createdAt: string;
}

export interface MatchState {
  roomCode: string;
  players: PlayerState[];
  gameState: GameStatePayload;
  status: MatchStatus;
  winnerPlayerId?: string;
  version: number;
  conversionProposal?: ConversionProposal;
  conversionHistory: ConversionRecord[];
}

export interface CreateMatchResponse {
  roomCode: string;
  playerId: string;
}

export interface JoinMatchResponse {
  match: MatchState;
  playerId: string;
}

export interface MoveRequest {
  roomCode: string;
  playerId: string;
  payload: MovePayload;
}

export interface ChessMovePayload {
  gameType: "chess";
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface LudoMovePayload {
  gameType: "ludo";
  tokenIndex: 0 | 1 | 2 | 3;
  roll: number;
}

export interface SnakeLadderMovePayload {
  gameType: "snake_ladder";
  roll: number;
}

export type MovePayload = ChessMovePayload | LudoMovePayload | SnakeLadderMovePayload;

export interface ProposeConversionRequest {
  roomCode: string;
  playerId: string;
  targetGame: Exclude<GameType, "chess">;
}

export interface ConversionVoteRequest {
  roomCode: string;
  playerId: string;
  proposalId: string;
  accept: boolean;
}

export interface ServerToClientEvents {
  "match:state": (match: MatchState) => void;
  "conversion:proposal": (proposal: ConversionProposal) => void;
  "conversion:completed": (match: MatchState) => void;
  "move:rejected": (message: string) => void;
  "match:error": (message: string) => void;
}

export interface ClientToServerEvents {
  "match:join": (payload: { roomCode: string; playerId: string }) => void;
}

export interface LudoTierAdvantage {
  // Number of steps granted on the main track to first two tokens of favored player.
  primarySteps: number;
  secondarySteps: number;
}

export interface SnakeTierAdvantage {
  startPosition: number;
}

export interface AdvantageMappingConfig {
  version: string;
  updatedAt: string;
  updatedBy: string;
  chessToLudo: Record<AdvantageTier, LudoTierAdvantage>;
  chessToSnakeLadder: Record<AdvantageTier, SnakeTierAdvantage>;
}
