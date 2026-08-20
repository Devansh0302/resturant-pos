'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Lock, KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-lg font-semibold text-gray-400"
          >
            Loading...
          </motion.div>
        </div>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  );
}

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'invalid' | 'success'>('loading');
  const [staffInfo, setStaffInfo] = useState<{ name: string; email: string; restaurantName: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/setup-password?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setStaffInfo(data);
          setStatus('valid');
        } else if (res.status === 410) {
          setStatus('expired');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setErrorMessage('PIN must be exactly 4 digits');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, pin }),
      });

      if (res.ok) {
        setStatus('success');
        toast.success('Account setup complete!');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-100/40 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">NXTDINE</h1>
          <p className="text-sm text-gray-500 mt-1">Restaurant Management Platform</p>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-sm text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Validating your setup link...</p>
          </div>
        )}

        {/* Invalid Token */}
        {status === 'invalid' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              This setup link is invalid or has already been used. Please contact your platform administrator for a new invite.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Expired Token */}
        {status === 'expired' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              This setup link has expired. Please contact your platform administrator to resend the invite.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're All Set! 🎉</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Your password and PIN have been set successfully. You can now log in to manage your restaurant.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Setup Form */}
        {status === 'valid' && staffInfo && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Set Up Your Account</h2>
                  <p className="text-xs text-gray-500">Create your login credentials</p>
                </div>
              </div>
            </div>

            {/* Welcome Info */}
            <div className="px-6 pt-5 pb-3">
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Welcome <strong>{staffInfo.name}</strong>! You've been invited as admin for <strong>{staffInfo.restaurantName}</strong>. Set your password and PIN below to get started.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  value={staffInfo.email}
                  disabled
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">New Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm"
                  placeholder="Re-enter your password"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">4-Digit PIN</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    pattern="[0-9]{4}"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm tracking-[0.3em] font-mono"
                    placeholder="• • • •"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Used for quick actions like KOT and bill confirmations.</p>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <p className="text-xs text-rose-700 font-medium">{errorMessage}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} NXTDINE. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
