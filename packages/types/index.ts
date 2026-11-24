export type ContentType = 'MOVIE' | 'SERIES' | 'ANIME' | 'DOCUMENTARY';
export type LegalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export * from './src/addon';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionData {
  token: string;
  user: User;
  expiresAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
  };
}
