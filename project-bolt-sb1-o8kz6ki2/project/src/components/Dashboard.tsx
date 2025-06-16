import React, { useState } from 'react';
import { User, Shield, LogOut, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TwoFactorSetup } from './TwoFactorSetup';
import { authService } from '../services/authService';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [showingSettings, setShowingSettings] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleDisable2FA = async () => {
    if (!user || !disable2FACode) return;
    
    setDisabling2FA(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await authService.disable2FA(user.id, disable2FACode);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setDisable2FACode('');
        setTimeout(() => {
          setMessage({ type: '', text: '' });
          window.location.reload(); // Refresh to update user state
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disable 2FA' });
    } finally {
      setDisabling2FA(false);
    }
  };

  if (show2FASetup) {
    return (
      <TwoFactorSetup
        onComplete={() => {
          setShow2FASetup(false);
          window.location.reload();
        }}
        onCancel={() => setShow2FASetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowingSettings(!showingSettings)}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Security</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Email Verified</span>
                    </div>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${user?.is2FAEnabled ? 'text-green-600' : 'text-amber-500'}`} />
                      <span className="text-gray-700">Two-Factor Auth</span>
                    </div>
                    <span className={`font-medium ${user?.is2FAEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                      {user?.is2FAEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {!user?.is2FAEnabled ? (
                    <button
                      onClick={() => setShow2FASetup(true)}
                      className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all duration-200"
                    >
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">Enable Two-Factor Authentication</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">2FA is Active</span>
                      </div>
                      <p className="text-sm text-green-700">Your account is protected with two-factor authentication.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showingSettings && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                  
                  {user?.is2FAEnabled && (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <h4 className="font-medium text-amber-800 mb-2">Disable Two-Factor Authentication</h4>
                        <p className="text-sm text-amber-700 mb-4">
                          Enter a code from your authenticator app to disable 2FA. This will make your account less secure.
                        </p>
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={disable2FACode}
                            onChange={e => {
                              setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6));
                              if (message.text) setMessage({ type: '', text: '' });
                            }}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center font-mono"
                          />
                          
                          {message.text && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg ${
                              message.type === 'error' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                              {message.type === 'error' ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">{message.text}</span>
                            </div>
                          )}
                          
                          <button
                            onClick={handleDisable2FA}
                            disabled={disabling2FA || disable2FACode.length !== 6}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {disabling2FA ? 'Disabling...' : 'Disable 2FA'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};