import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  signup: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verify2FA: (token: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  clearPendingUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    requiresTwoFactor: false,
    pendingUser: null,
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUserData();
    if (currentUser) {
      setAuthState(prev => ({
        ...prev,
        user: currentUser,
        isAuthenticated: true,
      }));
    }
  }, []);

  const signup = async (email: string, password: string) => {
    const result = await authService.signup({ email, password });
    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
        isAuthenticated: true,
      }));
    }
    return { success: result.success, message: result.message };
  };

  const login = async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    
    if (result.success && result.requiresTwoFactor && result.user) {
      setAuthState(prev => ({
        ...prev,
        requiresTwoFactor: true,
        pendingUser: result.user!,
      }));
      return { success: true, message: result.message };
    }
    
    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
        isAuthenticated: true,
        requiresTwoFactor: false,
      }));
    }
    
    return { success: result.success, message: result.message };
  };

  const verify2FA = async (token: string) => {
    if (!authState.pendingUser) {
      return { success: false, message: 'No pending authentication' };
    }

    const result = await authService.verify2FA(authState.pendingUser.id, token);
    
    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
        isAuthenticated: true,
        requiresTwoFactor: false,
        pendingUser: null,
      }));
    }
    
    return { success: result.success, message: result.message };
  };

  const logout = () => {
    authService.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      requiresTwoFactor: false,
      pendingUser: null,
    });
  };

  const clearPendingUser = () => {
    setAuthState(prev => ({
      ...prev,
      requiresTwoFactor: false,
      pendingUser: null,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signup,
        login,
        verify2FA,
        logout,
        clearPendingUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};