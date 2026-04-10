export type CardType =
  | "TIKI_UP_1"
  | "TIKI_UP_2"
  | "TIKI_UP_3"
  | "TIKI_TOPPLE"
  | "TIKI_TOAST";

export interface SecretTikiCard {
  top: number;
  middle: number;
  bottom: number;
}

export interface PlayerRoundState {
  playerId: string;
  secret: SecretTikiCard;
  hand: CardType[];
}

export interface GameState {
  roomId: string;
  roundNumber: number;
  currentPlayerId: string;
  playerOrder: string[];
  players: Record<string, PlayerRoundState>;
  totemStack: number[];
  eliminatedTotems: number[];
  cardsPlayedCount: number;
  turnNumber: number;
  scores: Record<string, number>;
  roundComplete: boolean;
  gameComplete: boolean;
  maxRounds: number;
  lastCompletedRound?: number;
  lastRoundScores?: Record<string, number>;
  lastRoundTopThree?: number[];
}

export interface PublicGameState extends GameState {
  playerMeta: Record<string, { username: string }>;
}

export interface PlayCardInput {
  playerId: string;
  card: CardType;
  targetTikiId?: number;
}

export interface MoveResult {
  state: GameState;
  removedTikiId?: number;
}
