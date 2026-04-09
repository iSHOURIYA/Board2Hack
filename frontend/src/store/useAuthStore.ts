import { create } from 'zustand';
import type { ProfileResponse } from '../types/api';

interface AuthState {
  token: string | null;
  profile: ProfileResponse | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setProfile: (profile: ProfileResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  profile: null,
  get isAuthenticated() {
    return !!this.token; // Need careful getter or derived state, simply deriving it on component is better but we use !!get().token
  },
  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
  },
  setProfile: (profile: ProfileResponse) => {
    set({ profile });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, profile: null, isAuthenticated: false });
  }
}));
