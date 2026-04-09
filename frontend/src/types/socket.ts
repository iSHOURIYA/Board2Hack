import type { CardId, TikiId, SecretCards } from './game';

export interface RoomJoinedPayload {
  roomId: string;
  playerCount: number;
  canStart: boolean;
}

export interface PlayerState {
  playerId: string;
  secret?: SecretCards; // Might be hidden if not current player
  hand?: CardId[];      // Might be hidden if not current player
}

export interface BoardState {
  roomId: string;
  roundNumber: number;
  currentPlayerId: string;
  playerOrder: string[];
  players: Record<string, PlayerState>;
  totemStack: TikiId[]; // 0 is top
  eliminatedTotems: TikiId[];
  cardsPlayedCount: number;
  turnNumber: number;
  scores: Record<string, number>;
  roundComplete: boolean;
  gameComplete: boolean;
  maxRounds: number;
}

export interface ErrorEventPayload {
  message: string;
}

// Client to Server payloads
export interface PlayCardPayload {
  roomId: string;
  card: CardId;
  targetTikiId?: TikiId;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface StartGamePayload {
  roomId: string;
}

// Interfaces for Socket instance
export interface ServerToClientEvents {
  room_joined: (payload: RoomJoinedPayload) => void;
  state_update: (payload: BoardState) => void;
  error_event: (payload: ErrorEventPayload) => void;
}

export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload) => void;
  start_game: (payload: StartGamePayload) => void;
  play_card: (payload: PlayCardPayload) => void;
}
