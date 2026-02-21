import { create } from 'zustand';
import { apiFetch } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: (refreshToken: string) => Promise<void>;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

interface AuthResponse {
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      set({
        user: res.data.user,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      set({
        user: res.data.user,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        token: token ?? undefined,
      });
    } finally {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  refreshToken: async (refreshTokenValue) => {
    try {
      const res = await apiFetch<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });
      set({
        user: res.data.user,
        token: res.data.token,
        isAuthenticated: true,
      });
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
