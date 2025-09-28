export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F' | 'OTHER';
  weight?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  externalId?: string;
  name: string;
  activityType: string;
  startTime: string;
  duration: number; // in seconds
  distance?: number; // in meters
  elevationGain?: number; // in meters
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPower?: number;
  calories?: number;
  perceivedExertion?: number; // 1-10 scale
  notes?: string;
  supplements: Supplement[];
  createdAt: string;
  updatedAt: string;
}

export interface Supplement {
  id: string;
  workoutId: string;
  name: string;
  brand?: string;
  category: string;
  quantity: number;
  unit: string;
  phase: 'PRE' | 'DURING' | 'POST';
  timingMinutes?: number;
  carbohydrates?: number;
  protein?: number;
  fat?: number;
  sodium?: number;
  caffeine?: number;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  userId: string;
  platform: 'STRAVA' | 'GARMIN' | 'TRAININGPEAKS';
  externalUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}