export type RoomStatus = "WAITING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

export interface RoomView {
  id: string;
  hostId: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  region: string;
  status: RoomStatus;
  players: Array<{ id: string; username: string }>;
  createdAt: string;
}
