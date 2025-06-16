import React, { useState, useEffect } from 'react';
import { Shield, Download, AlertCircle, CheckCircle, Smartphone, Copy } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copiedCodes, setCopiedCodes] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeSetup();
    }
  }, [user]);

  const initializeSetup = async () => {
    try {
      const data = await authService.setup2FA(user!.id);
      setSetupData(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initialize 2FA setup' });
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!setupData || !user) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await authService.enable2FA(
        user.id,
        setupData.secret,
        verificationCode,
        setupData.backupCodes
      );
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to enable 2FA' });
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData) {
      const codes = setupData.backupCodes.join('\n');
      navigator.clipboard.writeText(codes);
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    if (setupData) {
      const codes = setupData.backupCodes.join('\n');
      const blob = new Blob([`2FA Recovery Codes for ${user?.email}\n\n${codes}\n\nKeep these codes safe and secure!`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '2fa-recovery-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!setupData) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Initializing 2FA setup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Setup 2FA</h2>
          <p className="text-gray-600">Secure your account with two-factor authentication</p>
          
          <div className="flex justify-center mt-6 space-x-2">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= stepNumber
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Scan QR Code</h3>
              <p className="text-gray-600 mb-6">
                Use Google Authenticator, Authy, or any TOTP-compatible app to scan this QR code:
              </p>
            </div>

            <div className="flex justify-center">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                <img 
                  src={setupData.qrCode} 
                  alt="QR Code for 2FA setup" 
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Can't scan? Enter this code manually:</p>
              <code className="text-sm font-mono bg-white px-3 py-2 rounded border block text-center break-all">
                {setupData.secret}
              </code>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              <Smartphone className="w-5 h-5 inline mr-2" />
              I've Added the Account
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Verify Setup</h3>
              <p className="text-gray-600 mb-6">
                Enter the 6-digit code from your authenticator app to verify the setup:
              </p>
            </div>

            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={e => {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (message.text) setMessage({ type: '', text: '' });
                }}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center font-mono text-lg"
              />
            </div>

            {message.text && (
              <div className={`flex items-center gap-2 p-4 rounded-xl ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={verificationCode.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify Code
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Save Recovery Codes</h3>
              <p className="text-gray-600 mb-6">
                Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-sm">
                {setupData.backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-2 rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={copyBackupCodes}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copiedCodes ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadBackupCodes}
                className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>

            {message.text && (
              <div className={`flex items-center gap-2 p-4 rounded-xl ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enabling...' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};