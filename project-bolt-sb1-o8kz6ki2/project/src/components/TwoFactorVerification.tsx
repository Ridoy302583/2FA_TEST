import React, { useState, useRef, useEffect } from 'react';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TwoFactorVerification: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const { verify2FA, clearPendingUser, pendingUser } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = isRecoveryMode ? recoveryCode : code.join('');
      const result = await verify2FA(token);
      
      if (!result.success) {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred during verification' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    clearPendingUser();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
          <p className="text-gray-600">
            {isRecoveryMode 
              ? 'Enter your recovery code' 
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Signing in as: <span className="font-medium">{pendingUser?.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isRecoveryMode ? (
            <div className="flex justify-center space-x-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              ))}
            </div>
          ) : (
            <div>
              <label htmlFor="recoveryCode" className="block text-sm font-medium text-gray-700 mb-2">
                Recovery Code
              </label>
              <input
                type="text"
                id="recoveryCode"
                value={recoveryCode}
                onChange={e => {
                  setRecoveryCode(e.target.value.toUpperCase());
                  if (message.text) setMessage({ type: '', text: '' });
                }}
                placeholder="Enter recovery code"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-center font-mono"
              />
            </div>
          )}

          {message.text && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isRecoveryMode && code.some(digit => !digit)) || (isRecoveryMode && !recoveryCode)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          <div className="flex flex-col space-y-3">
            <button
              type="button"
              onClick={() => setIsRecoveryMode(!isRecoveryMode)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200"
            >
              {isRecoveryMode ? 'Use authenticator code instead' : 'Use recovery code instead'}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-700 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};