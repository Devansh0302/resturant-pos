'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid credentials', {
          description: 'Please check your email and password.',
        });
      } else {
        toast.success('Welcome back!');
        // Fetch session to check role
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (session?.user?.role === 'CHEF') {
          router.push('/kds');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
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
            Restaurant Billing System
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)',
            border: '1px solid rgba(229, 231, 235, 0.6)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.endsWith('@') && val.indexOf('@') === val.length - 1 && val.length > email.length) {
                      val = val + 'spiceroute.in';
                    }
                    setEmail(val);
                  }}
                  placeholder="rahul@spiceroute.in"
                  required
                  className="premium-input"
                  style={{ paddingLeft: '40px', borderColor: '#E5E7EB' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="premium-input"
                  style={{ paddingLeft: '40px', borderColor: '#E5E7EB' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #2D6A4F, #1B4A35)',
                boxShadow: '0 4px 12px rgba(45, 106, 79, 0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E5E7EB' }}>
            <p className="text-xs text-center mb-3" style={{ color: '#6B7280' }}>
              Demo Credentials
            </p>
            <div className="space-y-2">
              {[
                { role: 'Admin', email: 'rahul@spiceroute.in' },
                { role: 'Cashier', email: 'priya@spiceroute.in' },
                { role: 'Waiter', email: 'amit@spiceroute.in' },
                { role: 'Chef', email: 'chef@spiceroute.in' },
              ].map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => {
                    setEmail(cred.email);
                    setPassword('password123');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer flex items-center justify-between"
                  style={{
                    backgroundColor: '#FAFAF8',
                    border: '1px solid #E5E7EB',
                    color: '#6B7280',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = '#F0F0EC';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = '#FAFAF8';
                  }}
                >
                  <span className="font-medium" style={{ color: '#1A1A1A' }}>{cred.role}</span>
                  <span>{cred.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#9CA3AF' }}>
          © 2025 Spice Route. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
