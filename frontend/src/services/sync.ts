import { apiClient } from './api';

export interface SyncStatus {
  connected: boolean;
  syncedWorkouts: number;
  lastSync?: string;
  tokenExpires?: string;
}

export interface SyncResponse {
  message: string;
  syncedCount: number;
}

export const syncService = {
  syncStravaActivities: async (): Promise<SyncResponse> => {
    const response = await apiClient.post('/sync/strava/activities');
    return response.data;
  },

  getSyncStatus: async (userId: number): Promise<SyncStatus> => {
    const response = await apiClient.get(`/sync/strava/status/${userId}`);
    return response.data;
  },
};