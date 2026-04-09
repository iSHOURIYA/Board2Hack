import { create } from 'zustand';
import type { RoomInfo } from '../types/api';

interface LobbyState {
  rooms: RoomInfo[];
  isLoading: boolean;
  setRooms: (rooms: RoomInfo[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  rooms: [],
  isLoading: false,
  setRooms: (rooms) => set({ rooms }),
  setLoading: (isLoading) => set({ isLoading }),
}));
