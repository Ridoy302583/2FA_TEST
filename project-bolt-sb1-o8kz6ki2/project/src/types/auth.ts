export interface User {
  id: string;
  email: string;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
  twoFactorSecret?: string;
  recoveryCodes?: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  pendingUser: User | null;
}

export interface SignupData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}