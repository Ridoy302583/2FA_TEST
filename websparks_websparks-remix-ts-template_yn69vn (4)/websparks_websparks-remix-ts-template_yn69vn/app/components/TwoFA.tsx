// app/components/TwoFA.tsx
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Simple base32 encoder
function base32Encode(buffer: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

// Generate cryptographically secure random bytes
function generateSecret(): string {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  return base32Encode(array);
}

// HMAC-SHA1 implementation
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

// Base32 decoder
function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = new Uint8Array(Math.floor(encoded.length * 5 / 8));
  let outputIndex = 0;

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i].toUpperCase();
    const index = alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output[outputIndex++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, outputIndex);
}

// Generate TOTP code
async function generateTOTP(secret: string, timeStep: number = 30): Promise<string> {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, time, false);

  const secretBytes = base32Decode(secret);
  const hmac = await hmacSha1(secretBytes, new Uint8Array(timeBuffer));
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

interface TwoFASetupProps {
  onSetupComplete: (secret: string) => void;
  onClose: () => void;
}

export function TwoFASetup({ onSetupComplete, onClose }: TwoFASetupProps) {
  const [secret, setSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const newSecret = generateSecret();
    setSecret(newSecret);
    
    const appName = 'My Remix App';
    const userEmail = 'user@example.com'; // You can make this dynamic
    const issuer = 'MyRemixApp';
    
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    setQrCodeUrl(otpauthUrl);
  }, []);

  const handleVerification = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const expectedCode = await generateTOTP(secret);
      const previousCode = await generateTOTP(secret, 30);
      
      // Allow current code or previous code (30-second window)
      if (verificationCode === expectedCode || verificationCode === previousCode) {
        onSetupComplete(secret);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Setup Two-Factor Authentication</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
            <p className="text-sm text-gray-600 mb-3">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center p-4 bg-gray-50 rounded">
              {qrCodeUrl && (
                <QRCodeSVG value={qrCodeUrl} size={200} />
              )}
            </div>
            <div className="mt-2 p-2 bg-blue-50 rounded text-center">
              <p className="text-blue-800 text-sm font-medium">
                📱 Code Name in App: <span className="font-mono">MyRemixApp:user@example.com</span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Step 2: Manual Entry (Optional)</h3>
            <p className="text-sm text-gray-600 mb-2">
              Or manually enter these details in your authenticator app:
            </p>
            
            <div className="space-y-3">
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <label className="block text-sm font-medium text-yellow-800 mb-1">Account Name / Code Name:</label>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border">MyRemixApp:user@example.com</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText('MyRemixApp:user@example.com')}
                    className="ml-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                    title="Copy account name"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded border">
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key:</label>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border break-all">{secret}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(secret)}
                    className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    title="Copy secret key"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p><strong>Type:</strong> Time-based (TOTP)</p>
              <p><strong>Algorithm:</strong> SHA1 | <strong>Digits:</strong> 6 | <strong>Period:</strong> 30 seconds</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Step 3: Verify Setup</h3>
            <p className="text-sm text-gray-600 mb-2">
              Enter the 6-digit code from your authenticator app:
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerification}
              disabled={isVerifying || verificationCode.length !== 6}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TwoFALoginProps {
  onVerify: (code: string) => Promise<boolean>;
  onClose: () => void;
}

export function TwoFALogin({ onVerify, onClose }: TwoFALoginProps) {
  const [code, setCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(code);
      if (!isValid) {
        setError('Invalid code. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app:
          </p>
          
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
            maxLength={6}
            autoFocus
          />
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isVerifying || code.length !== 6}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions for managing 2FA
export const TwoFAUtils = {
  // Check if we're in browser environment
  isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  },

  // Check if 2FA is enabled for the user
  isEnabled(): boolean {
    if (!this.isBrowser()) return false;
    return localStorage.getItem('twofa_secret') !== null;
  },

  // Save 2FA secret to localStorage
  saveSecret(secret: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem('twofa_secret', secret);
    localStorage.setItem('twofa_enabled', 'true');
  },

  // Get 2FA secret from localStorage
  getSecret(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('twofa_secret');
  },

  // Disable 2FA
  disable(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem('twofa_secret');
    localStorage.removeItem('twofa_enabled');
  },

  // Verify a TOTP code
  async verifyCode(code: string): Promise<boolean> {
    const secret = this.getSecret();
    if (!secret) return false;

    try {
      const currentCode = await generateTOTP(secret);
      const previousCode = await generateTOTP(secret, 30);
      
      return code === currentCode || code === previousCode;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }
};