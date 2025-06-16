import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User, SignupData, LoginData, TwoFactorSetup } from '../types/auth';

// Simulate user database with localStorage
const USERS_KEY = 'auth_users';
const CURRENT_USER_KEY = 'current_user';

export class AuthService {
  private getUsers(): User[] {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private getCurrentUser(): User | null {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  private setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  async signup(data: SignupData): Promise<{ success: boolean; message: string; user?: User }> {
    const users = this.getUsers();
    
    if (users.find(u => u.email === data.email)) {
      return { success: false, message: 'Email already exists' };
    }

    const newUser: User = {
      id: Date.now().toString(),
      email: data.email,
      isEmailVerified: true, // Simulating email verification as already done
      is2FAEnabled: false,
    };

    users.push(newUser);
    this.saveUsers(users);

    return { success: true, message: 'Account created successfully', user: newUser };
  }

  async login(data: LoginData): Promise<{ success: boolean; message: string; user?: User; requiresTwoFactor?: boolean }> {
    const users = this.getUsers();
    const user = users.find(u => u.email === data.email);

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (user.is2FAEnabled) {
      return { success: true, message: 'Two-factor authentication required', user, requiresTwoFactor: true };
    }

    this.setCurrentUser(user);
    return { success: true, message: 'Login successful', user };
  }

  async verify2FA(userId: string, token: string): Promise<{ success: boolean; message: string; user?: User }> {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user || !user.twoFactorSecret) {
      return { success: false, message: 'Invalid user or 2FA not set up' };
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
      window: 2
    });

    if (!isValid) {
      // Check if it's a recovery code
      if (user.recoveryCodes && user.recoveryCodes.includes(token)) {
        // Remove used recovery code
        user.recoveryCodes = user.recoveryCodes.filter(code => code !== token);
        this.saveUsers(users);
        this.setCurrentUser(user);
        return { success: true, message: 'Login successful with recovery code', user };
      }
      return { success: false, message: 'Invalid authentication code' };
    }

    this.setCurrentUser(user);
    return { success: true, message: 'Login successful', user };
  }

  async setup2FA(userId: string): Promise<TwoFactorSetup> {
    const secret = authenticator.generateSecret();
    const serviceName = 'SecureApp';
    const accountName = this.getCurrentUser()?.email || 'user@example.com';
    
    const otpauth = authenticator.keyuri(accountName, serviceName, secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    return {
      secret,
      qrCode,
      backupCodes
    };
  }

  async enable2FA(userId: string, secret: string, token: string, backupCodes: string[]): Promise<{ success: boolean; message: string }> {
    const isValid = authenticator.verify({ token, secret });
    
    if (!isValid) {
      return { success: false, message: 'Invalid verification code' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }

    users[userIndex] = {
      ...users[userIndex],
      is2FAEnabled: true,
      twoFactorSecret: secret,
      recoveryCodes: backupCodes
    };

    this.saveUsers(users);
    this.setCurrentUser(users[userIndex]);

    return { success: true, message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string, token: string): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user || !user.twoFactorSecret) {
      return { success: false, message: 'User not found or 2FA not enabled' };
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
      window: 2
    });

    if (!isValid) {
      return { success: false, message: 'Invalid authentication code' };
    }

    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex] = {
      ...users[userIndex],
      is2FAEnabled: false,
      twoFactorSecret: undefined,
      recoveryCodes: undefined
    };

    this.saveUsers(users);
    this.setCurrentUser(users[userIndex]);

    return { success: true, message: '2FA disabled successfully' };
  }

  getCurrentUserData(): User | null {
    return this.getCurrentUser();
  }

  logout(): void {
    this.setCurrentUser(null);
  }
}

export const authService = new AuthService();