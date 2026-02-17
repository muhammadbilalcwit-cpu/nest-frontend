'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, flashErrorStorage } from '@/stores/auth.store';
import { Alert, FormField, Button } from '@/components/ui';
import { Building2, Mail, Lock, Eye, EyeOff } from 'lucide-react';


// Flash message mapping - error codes to user-friendly messages
const FLASH_MESSAGES: Record<string, string> = {
  session_expired: 'Your session has expired. Please log in again.',
  session_revoked: 'Your session has been revoked by an administrator.',
  session_invalid: 'Your session is no longer valid. Please log in again.',
  unauthorized: 'You are not authorized. Please log in.',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');

  const login = useAuthStore((s) => s.login);

  // Read flash error from sessionStorage on mount
  useEffect(() => {
    const errorCode = flashErrorStorage.get();
    if (errorCode) {
      setFlashMessage(
        FLASH_MESSAGES[errorCode] || 'An error occurred. Please log in again.'
      );
      flashErrorStorage.clear(); // Clear after reading
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFlashMessage(''); // Clear flash message on submit
    setIsSubmitting(true);

    try {
      await login(email, password);

      // Redirect is handled reactively via useAuthRedirect hook
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid credentials');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Nest Auth</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Manage Your Organization
            <br />
            <span className="text-primary-200">With Confidence</span>
          </h1>
          <p className="text-primary-100 text-lg max-w-md">
            A powerful management system designed for modern enterprises.
            Streamline operations, manage teams, and drive growth.
          </p>

          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-primary-200 text-sm">Companies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">10k+</div>
              <div className="text-primary-200 text-sm">Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-primary-200 text-sm">Uptime</div>
            </div>
          </div>
        </div>

        <div className="text-primary-200 text-sm">
          © 2024-2026 Companies Management System. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-dark-bg">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 bg-primary-600 rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">CMS</span>
          </div>

          <div className="card p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Welcome back
              </h2>
              <p className="text-slate-500 dark:text-dark-muted mt-2">
                Sign in to your account to continue
              </p>
            </div>

            {/* Flash message (from redirect) */}
            {flashMessage && (
              <Alert variant="warning" message={flashMessage} className="mb-6" />
            )}

            {/* Login error */}
            {error && (
              <Alert variant="error" message={error} className="mb-6" />
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                icon={<Mail className="w-5 h-5" />}
              />

              <FormField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                icon={<Lock className="w-5 h-5" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Signing in..."
                className="w-full py-3 text-base"
              >
                Sign In
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
