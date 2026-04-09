import { io, Socket } from 'socket.io-client';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  JoinRoomPayload,
  StartGamePayload,
  PlayCardPayload
} from '../types/socket';

const BASE_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('token');
    
    // According to contract, backend expects socket at /ws
    this.socket = io(BASE_URL, {
      path: '/ws',
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connect error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  get isConnected() {
    return this.socket?.connected ?? false;
  }

  // Emitters
  joinRoom(payload: JoinRoomPayload) {
    this.socket?.emit('join_room', payload);
  }

  startGame(payload: StartGamePayload) {
    this.socket?.emit('start_game', payload);
  }

  playCard(payload: PlayCardPayload) {
    this.socket?.emit('play_card', payload);
  }

  // Listeners
  on<Ev extends keyof ServerToClientEvents>(event: Ev, listener: ServerToClientEvents[Ev]) {
    this.socket?.on(event, listener as any);
  }

  off<Ev extends keyof ServerToClientEvents>(event: Ev, listener: ServerToClientEvents[Ev]) {
    this.socket?.off(event, listener as any);
  }
}

export const socketService = new SocketService();
