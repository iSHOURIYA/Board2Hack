import { create } from 'zustand';
import type { BoardState, RoomJoinedPayload } from '../types/socket';
import type { CardId, TikiId } from '../types/game';

interface GameState {
  roomId: string | null;
  isConnected: boolean;

  // Lobby/Waiting phase info
  roomJoinedData: RoomJoinedPayload | null;
  
  // Active Game State (Authoritative from server)
  boardState: BoardState | null;

  // Speculative UI state
  pendingMove: { card: CardId, targetTikiId?: TikiId } | null;
  errorEventMessage: string | null;

  setConnection: (isConnected: boolean) => void;
  setRoomJoinedData: (data: RoomJoinedPayload) => void;
  setBoardState: (state: BoardState) => void;
  setPendingMove: (move: { card: CardId, targetTikiId?: TikiId } | null) => void;
  setErrorEvent: (msg: string | null) => void;
  clearRoom: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  roomId: null,
  isConnected: false,
  roomJoinedData: null,
  boardState: null,
  pendingMove: null,
  errorEventMessage: null,

  setConnection: (isConnected) => set({ isConnected }),
  
  setRoomJoinedData: (data) => set({ 
    roomJoinedData: data,
    roomId: data.roomId,
    // BoardState hasn't started yet naturally if we just joined, 
    // unless reconnecting via state_update later.
  }),

  setBoardState: (state) => set({ 
    boardState: state,
    roomId: state.roomId,
    pendingMove: null, // Clear pending move on fresh server state
  }),

  setPendingMove: (move) => set({ pendingMove: move }),
  
  setErrorEvent: (msg) => set({ 
    errorEventMessage: msg,
    pendingMove: null // Rollback speculative move on error
  }),

  clearRoom: () => set({
    roomId: null,
    roomJoinedData: null,
    boardState: null,
    pendingMove: null,
    errorEventMessage: null
  })
}));
