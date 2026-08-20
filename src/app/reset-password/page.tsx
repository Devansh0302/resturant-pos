'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Invalid link', {
        description: 'No reset token found in the URL.',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password too short', {
        description: 'Password must be at least 8 characters long.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Error', {
          description: data.error || 'Something went wrong',
        });
      } else {
        toast.success('Success', {
          description: 'Your password has been reset successfully.',
        });
        setIsSuccess(true);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #F9FAFB 40%, #EFF6FF 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #2D6A4F, #1B4A35)', boxShadow: '0 8px 24px rgba(45, 106, 79, 0.3)' }}
          >
            <Image
              src="/images/logo.png"
              alt="Spice Route"
              width={48}
              height={48}
              className="rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span style="color:white;font-size:24px;font-weight:700">SR</span>';
              }}
            />
          </motion.div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
            Spice Route
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Create new password
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 relative"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)',
            border: '1px solid rgba(229, 231, 235, 0.6)',
          }}
        >
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Password reset!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been successfully reset. You can now use your new password to sign in.
              </p>
              <div className="pt-2">
                <Link 
                  href="/login" 
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #2D6A4F, #1B4A35)',
                    boxShadow: '0 4px 12px rgba(45, 106, 79, 0.3)',
                  }}
                >
                  Continue to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!token && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                  Missing reset token in URL. Please use the exact link from your email.
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    disabled={!token}
                    className="premium-input w-full rounded-xl py-3 text-sm transition-colors duration-200"
                    style={{ paddingLeft: '40px', paddingRight: '12px', borderColor: '#E5E7EB', borderStyle: 'solid', borderWidth: '1px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={!token}
                    className="premium-input w-full rounded-xl py-3 text-sm transition-colors duration-200"
                    style={{ paddingLeft: '40px', paddingRight: '12px', borderColor: '#E5E7EB', borderStyle: 'solid', borderWidth: '1px', outline: 'none' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #2D6A4F, #1B4A35)',
                  boxShadow: '0 4px 12px rgba(45, 106, 79, 0.3)',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
              
              <div className="text-center pt-2">
                <Link 
                  href="/login" 
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
