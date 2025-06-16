import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignupForm } from './components/SignupForm';
import { LoginForm } from './components/LoginForm';
import { TwoFactorVerification } from './components/TwoFactorVerification';
import { Dashboard } from './components/Dashboard';

const AppContent: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { isAuthenticated, requiresTwoFactor } = useAuth();

  if (isAuthenticated) {
    return <Dashboard />;
  }

  if (requiresTwoFactor) {
    return <TwoFactorVerification />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      {authMode === 'login' ? (
        <LoginForm onSwitchToSignup={() => setAuthMode('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setAuthMode('login')} />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;