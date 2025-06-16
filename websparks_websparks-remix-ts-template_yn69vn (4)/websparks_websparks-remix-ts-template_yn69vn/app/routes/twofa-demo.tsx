// app/routes/twofa-demo.tsx
import { useState, useEffect } from 'react';
import type { MetaFunction } from "@remix-run/node";
import { TwoFASetup, TwoFALogin, TwoFAUtils } from '~/components/TwoFA';

export const meta: MetaFunction = () => {
  return [
    { title: "2FA Demo - Remix App" },
    { name: "description", content: "Two-Factor Authentication Demo" },
  ];
};

export default function TwoFADemo() {
  const [showSetup, setShowSetup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    setTwoFAEnabled(TwoFAUtils.isEnabled());
  }, []);

  const handleSetupComplete = (secret: string) => {
    TwoFAUtils.saveSecret(secret);
    setTwoFAEnabled(true);
    setShowSetup(false);
    alert('2FA has been successfully enabled!');
  };

  const handleLoginVerify = async (code: string): Promise<boolean> => {
    const isValid = await TwoFAUtils.verifyCode(code);
    if (isValid) {
      setIsLoggedIn(true);
      setShowLogin(false);
      return true;
    }
    return false;
  };

  const handleDisable2FA = () => {
    if (confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      TwoFAUtils.disable();
      setTwoFAEnabled(false);
      setIsLoggedIn(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Two-Factor Authentication Demo
            </h1>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Two-Factor Authentication Demo
          </h1>

          {/* Status Section */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">2FA Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  twoFAEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {twoFAEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Login Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isLoggedIn 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isLoggedIn ? 'Logged In' : 'Not Logged In'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-4">
            {!twoFAEnabled && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Enable Two-Factor Authentication</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Secure your account with 2FA using Google Authenticator, Authy, or any TOTP-compatible app.
                </p>
                <button
                  onClick={() => setShowSetup(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Setup 2FA
                </button>
              </div>
            )}

            {twoFAEnabled && !isLoggedIn && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Login with 2FA</h3>
                <p className="text-yellow-700 text-sm mb-3">
                  2FA is enabled. You need to verify your identity to access protected content.
                </p>
                <button
                  onClick={() => setShowLogin(true)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                >
                  Login with 2FA
                </button>
              </div>
            )}

            {twoFAEnabled && isLoggedIn && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Protected Content</h3>
                <p className="text-green-700 text-sm mb-3">
                  🎉 You're logged in! This content is protected by 2FA.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLogout}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Logout
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions Section */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Click "Setup 2FA" to generate a QR code</li>
              <li>Scan the QR code with your authenticator app</li>
              <li>Enter the 6-digit code from your app to verify setup</li>
              <li>Use "Login with 2FA" to test the authentication</li>
              <li>Your 2FA secret is stored securely in localStorage</li>
            </ol>
          </div>

          {/* Supported Apps */}
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Supported Authenticator Apps:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Google Authenticator</p>
              <p>• Authy</p>
              <p>• Microsoft Authenticator</p>
              <p>• 1Password</p>
              <p>• Any TOTP-compatible app</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSetup && (
        <TwoFASetup
          onSetupComplete={handleSetupComplete}
          onClose={() => setShowSetup(false)}
        />
      )}

      {showLogin && (
        <TwoFALogin
          onVerify={handleLoginVerify}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}