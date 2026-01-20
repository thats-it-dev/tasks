import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Button, Input } from '@thatsit/ui';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Mail, Loader2, Clock } from 'lucide-react';
import { useSync, authStart, authSignup, authSendOtp, authVerifyOtp } from '../sync';
import { syncConfig } from '../lib/syncConfig';
import './AuthPanel.css';

type AuthStep = 'email' | 'signup' | 'signin' | 'magic-link-sent' | 'otp-sent' | 'pending-approval';

export function AuthPanel() {
  const { authPanelOpen, setAuthPanelOpen } = useAppStore();
  const { isEnabled, enable } = useSync();

  const [syncUrl, setSyncUrl] = useState(() => localStorage.getItem('syncUrl') || syncConfig.defaultSyncUrl);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetAuthState = () => {
    setAuthStep('email');
    setEmail('');
    setUsername('');
    setOtpCode('');
    setAuthError(null);
    setIsLoading(false);
  };

  const handleContinue = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      localStorage.setItem('syncUrl', syncUrl);
      const result = await authStart(syncUrl, email, syncConfig.appId);

      if (result.action === 'signup') {
        setAuthStep('signup');
      } else {
        // Existing user - auto-send OTP
        setAuthStep('signin');
        await authSendOtp(syncUrl, email, syncConfig.appId);
        setAuthStep('otp-sent');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      await authSignup(syncUrl, email, username, syncConfig.appId);
      setAuthStep('magic-link-sent');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const result = await authVerifyOtp(syncUrl, email, otpCode);
      enable(syncUrl, result.access_token, result.refresh_token);
      resetAuthState();
      setAuthPanelOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid code';
      if (message === 'pending_approval') {
        setAuthStep('pending-approval');
      } else {
        setAuthError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      await authSendOtp(syncUrl, email, syncConfig.appId);
      setOtpCode('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to resend');
    } finally {
      setIsLoading(false);
    }
  };

  // Close panel if already logged in
  if (!authPanelOpen || isEnabled) return null;

  return createPortal(
    <div className="auth-overlay" onClick={() => setAuthPanelOpen(false)}>
      <div className="auth-panel" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <h2 className="auth-title">Log in</h2>
          <Button
            variant="ghost"
            className="auth-close"
            onClick={() => setAuthPanelOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="auth-content">
          <section className="auth-section">
            <p className="text-[var(--text-muted)] mb-4">
              Sign in to sync your data across devices.
            </p>

            {/* Back button for non-email steps */}
            {authStep !== 'email' && (
              <button
                className="auth-back-button"
                onClick={resetAuthState}
                disabled={isLoading}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            )}

            {/* Step 1: Email entry */}
            {authStep === 'email' && (
              <>
                <div className="auth-field">
                  <label className="auth-label">Sync URL</label>
                  <Input
                    type="url"
                    value={syncUrl}
                    onChange={(e) => setSyncUrl(e.target.value)}
                    placeholder={syncConfig.defaultSyncUrl}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    onKeyDown={(e) => e.key === 'Enter' && email && handleContinue()}
                  />
                </div>

                {authError && (
                  <div className="auth-error">{authError}</div>
                )}

                <Button onClick={handleContinue} disabled={isLoading || !email}>
                  {isLoading ? 'Checking...' : 'Continue'}
                </Button>
              </>
            )}

            {/* Step 2a: Signup - collect username */}
            {authStep === 'signup' && (
              <>
                <div className="auth-info">
                  <Mail size={16} />
                  <span>{email}</span>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Choose a username</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && username && handleSignup()}
                  />
                </div>

                {authError && (
                  <div className="auth-error">{authError}</div>
                )}

                <Button onClick={handleSignup} disabled={isLoading || !username}>
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </>
            )}

            {/* Step 2b: Magic link sent */}
            {authStep === 'magic-link-sent' && (
              <div className="auth-message">
                <Mail size={24} />
                <h4>Check your email</h4>
                <p>We sent a magic link to <strong>{email}</strong></p>
                <p className="auth-message-hint">Click the link in the email to complete signup.</p>
              </div>
            )}

            {/* Step 2c: Signin - sending OTP */}
            {authStep === 'signin' && (
              <div className="auth-message">
                <Loader2 size={24} className="spinning" />
                <p>Sending code to {email}...</p>
              </div>
            )}

            {/* Step 3: OTP verification */}
            {authStep === 'otp-sent' && (
              <>
                <div className="auth-info">
                  <Mail size={16} />
                  <span>{email}</span>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Enter the 6-digit code</label>
                  <Input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                  />
                </div>

                {authError && (
                  <div className="auth-error">{authError}</div>
                )}

                <Button onClick={handleVerifyOtp} disabled={isLoading || otpCode.length !== 6}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>

                <button
                  className="auth-link-button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                >
                  Resend code
                </button>
              </>
            )}

            {/* Pending approval state */}
            {authStep === 'pending-approval' && (
              <div className="auth-message">
                <Clock size={24} />
                <h4>Awaiting approval</h4>
                <p>Your account is pending admin approval.</p>
                <p className="auth-message-hint">You'll be able to sign in once approved.</p>
                <Button variant="ghost" onClick={resetAuthState} className="mt-4">
                  Back to login
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
