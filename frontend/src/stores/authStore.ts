import { create } from 'zustand';
import { authService, type User } from '../services/api';
import { syncService, type SyncStatus } from '../services/sync';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  syncStatus: SyncStatus | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  loginWithStrava: (code: string) => Promise<void>;
  logout: () => void;
  syncStravaActivities: () => Promise<number>;
  refreshSyncStatus: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('authToken'),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('authToken'),
  syncStatus: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(email, password);
      
      localStorage.setItem('authToken', response.token);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Refresh sync status after login
      get().refreshSyncStatus();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true });
    try {
      const response = await authService.register(userData);
      
      localStorage.setItem('authToken', response.token);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithStrava: async (code: string) => {
    set({ isLoading: true });
    try {
      const response = await authService.stravaCallback(code);
      
      localStorage.setItem('authToken', response.token);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Refresh sync status after Strava login
      get().refreshSyncStatus();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  syncStravaActivities: async (): Promise<number> => {
    try {
      const response = await syncService.syncStravaActivities();
      
      // Refresh sync status after sync
      await get().refreshSyncStatus();
      
      return response.syncedCount;
    } catch (error) {
      throw error;
    }
  },

  refreshSyncStatus: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const status = await syncService.getSyncStatus(user.id);
      set({ syncStatus: status });
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      syncStatus: null,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));