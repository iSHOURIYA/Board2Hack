import { PlayerDetails } from './game';

export interface HealthResponse {
  status: string;
  db: boolean;
  redis: boolean;
}

export interface RegisterResponse {
  token: string;
}

export interface LoginResponse {
  token: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  username: string;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  createdAt: string;
}

export interface LeaderboardUser {
  id: string;
  username: string;
  totalScore: number;
  wins: number;
  gamesPlayed: number;
}

export interface LeaderboardResponse {
  leaders: LeaderboardUser[];
}

export interface RoomInfo {
  id: string;
  hostId: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  region: string;
  status: string;
  createdAt: string;
  players: PlayerDetails[];
}

export interface ListRoomsResponse {
  rooms: RoomInfo[];
}

export interface CreateRoomResponse {
  roomId: string;
}

export interface JoinRoomResponse {
  roomId: string;
  players: PlayerDetails[];
}

export interface MatchmakeResponse {
  status: 'queued' | 'matched';
  roomId?: string;
  players?: string[]; // IDs or Usernames, API is loose "user1", "user2"
}

export interface ErrorResponse {
  message: string;
  details?: Record<string, string>;
}
