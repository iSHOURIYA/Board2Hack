import {
  LoginResponse,
  ProfileResponse,
  RegisterResponse,
  LeaderboardResponse,
  ListRoomsResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  MatchmakeResponse,
  HealthResponse
} from '../types/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(public status: number, public message: string, public details?: Record<string, string>) {
    super(message);
  }
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    let details;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
      details = errorData.details;
    } catch {
      // Ignored
    }
    throw new ApiError(response.status, errorMsg, details);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => fetchWithAuth<HealthResponse>('/health'),
  
  auth: {
    register: (data: Record<string, string>) => fetchWithAuth<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    login: (data: Record<string, string>) => fetchWithAuth<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  
  profile: () => fetchWithAuth<ProfileResponse>('/api/v1/profile'),
  
  leaderboards: (limit = 20) => fetchWithAuth<LeaderboardResponse>(`/api/v1/leaderboards?limit=${limit}`),
  
  rooms: {
    list: () => fetchWithAuth<ListRoomsResponse>('/api/v1/rooms'),
    create: (data: Record<string, any>) => fetchWithAuth<CreateRoomResponse>('/api/v1/rooms', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    join: (roomId: string, password?: string) => fetchWithAuth<JoinRoomResponse>(`/api/v1/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify(password ? { password } : {})
    })
  },
  
  matchmake: (data: Record<string, any>) => fetchWithAuth<MatchmakeResponse>('/api/v1/matchmake', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
