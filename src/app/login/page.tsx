'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, X, Phone, Globe, Mail } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
          <motion.img 
            src="/logo-premium.png" 
            alt="Loading..." 
            className="h-10 w-auto object-contain"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  // Custom Domain Branding State
  const [tenantBranding, setTenantBranding] = useState<{name: string, logo_url: string | null, theme_color: string | null} | null>(null);
  const [isBrandingLoading, setIsBrandingLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const hostname = window.location.hostname;
        // Skip for local or default domains
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('nxtdine.com')) {
          setIsBrandingLoading(false);
          return;
        }

        const res = await fetch(`/api/tenant-branding?domain=${hostname}`);
        if (res.ok) {
          const data = await res.json();
          setTenantBranding(data);
        }
      } catch (err) {
        console.error('Error fetching tenant branding:', err);
      } finally {
        setIsBrandingLoading(false);
      }
    };
    
    fetchBranding();
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as any;
      if (u.restaurantId) {
        localStorage.setItem('nxtdine_restaurant_id', u.restaurantId);
      }

      const role = u.role;
      if (role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (role === 'CHEF' || role === 'KITCHEN') {
        router.push('/kds');
      } else if (role === 'WAITER') {
        router.push('/tables');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    }
  }, [status, session, router]);

  if (status === 'loading' || status === 'authenticated' || isBrandingLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <motion.img 
          src="/logo-premium.png" 
          alt="Loading..." 
          className="h-10 w-auto object-contain"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

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
        toast.error('Sign in unsuccessful', {
          description: 'Please verify your credentials and try again.',
        });
      } else {
        toast.success('Successfully signed in!');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] selection:bg-emerald-100 selection:text-emerald-900 relative overflow-hidden font-sans p-4 sm:p-6 lg:p-8">
      
      {/* Soft, beautiful ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-emerald-100/50 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-100/50 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[1000px] bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-100 relative z-10 flex overflow-hidden flex-col md:flex-row min-h-[600px]"
        style={tenantBranding?.theme_color ? { borderColor: `${tenantBranding.theme_color}40` } : {}}
      >
        
        {/* Left Side: Elegant Branding */}
        <div 
          className="hidden md:flex md:w-[45%] p-12 flex-col justify-between relative overflow-hidden"
          style={{ backgroundColor: tenantBranding?.theme_color ? `${tenantBranding.theme_color}10` : '#F0FDF4' }}
        >
          {/* Subtle decorative circle */}
          <div 
            className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-40" 
            style={{ backgroundColor: tenantBranding?.theme_color || '#34d399' }}
          />
          
          <div className="relative z-10">
            {tenantBranding?.logo_url ? (
              <img src={tenantBranding.logo_url} alt={tenantBranding.name} className="h-10 w-auto object-contain mb-16" />
            ) : (
              <img src="/logo-premium.png" alt="NxtDine Logo" className="h-10 w-auto object-contain mb-16" />
            )}
            
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
              {tenantBranding ? `Welcome to ${tenantBranding.name}.` : 'Manage your restaurant with elegance.'}
            </h1>
            <p className="text-gray-600 leading-relaxed font-medium">
              Everything you need to streamline operations, delight guests, and scale your business—all in one beautifully simple platform.
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-[3px] border-[#F0FDF4] bg-white flex items-center justify-center relative overflow-hidden shadow-sm">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm font-semibold" style={{ color: tenantBranding?.theme_color || '#065f46' }}>
              {tenantBranding ? 'Powered by NxtDine Platform' : 'Join 1,000+ top restaurants'}
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[55%] p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          
          <div className="md:hidden flex justify-center mb-10">
            {tenantBranding?.logo_url ? (
              <img src={tenantBranding.logo_url} alt={tenantBranding.name} className="h-10 w-auto object-contain" />
            ) : (
              <img src="/logo-premium.png" alt="NxtDine Logo" className="h-10 w-auto object-contain" />
            )}
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Sign In</h2>
            <p className="text-gray-500 font-medium">Please enter your details to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@restaurant.com"
                required
                className="w-full px-5 py-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={focusedField === 'password' && tenantBranding?.theme_color ? { borderColor: tenantBranding.theme_color, boxShadow: `0 0 0 4px ${tenantBranding.theme_color}1a` } : {}}
                className={`w-full px-5 py-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all font-medium tracking-wide ${!tenantBranding ? 'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10' : ''}`}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: tenantBranding?.theme_color || '#059669' }}
              className="w-full flex items-center justify-center py-4 text-white rounded-xl text-[15px] font-semibold transition-all disabled:opacity-70 mt-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[14px] font-medium text-gray-600">
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => setIsContactModalOpen(true)}
                className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors focus:outline-none cursor-pointer"
              >
                Contact Sales
              </button>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">
              Quick Demo Access
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {[
                { role: 'Super Admin', email: 'super@nxtdine.com' },
                { role: 'Admin', email: 'rahul@nxtdine.in' },
                { role: 'Cashier', email: 'priya@nxtdine.in' },
                { role: 'Chef', email: 'chef@nxtdine.in' },
              ].map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => {
                    setEmail(cred.email);
                    setPassword('password123');
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-100 hover:border-emerald-200 text-xs font-semibold text-gray-600 transition-colors shadow-sm cursor-pointer"
                >
                  {cred.role}
                </button>
              ))}
            </div>
          </div>

        </div>
      </motion.div>

      {/* Contact Sales Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setIsContactModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 sm:p-10 pb-12">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[#F0FDF4] rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-emerald-100">
                    <img src="/logo-premium.png" alt="NxtDine Logo" className="w-10 h-10 object-contain" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">Get NxtDine</h3>
                <p className="text-gray-500 text-center font-medium mb-8 leading-relaxed">
                  Connect with our team to schedule a demo or set up your enterprise account.
                </p>
                
                <div className="space-y-3">
                  <a href="tel:+919876543210" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-[#F0FDF4] transition-all group cursor-pointer">
                    <div className="bg-[#D1FAE5] p-3 rounded-xl text-emerald-700 group-hover:scale-110 transition-transform">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Call Us</p>
                      <p className="text-gray-900 font-semibold">+91 98765 43210</p>
                    </div>
                  </a>
                  
                  <a href="mailto:sales@nxtdine.com" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-[#F0FDF4] transition-all group cursor-pointer">
                    <div className="bg-[#D1FAE5] p-3 rounded-xl text-emerald-700 group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email Us</p>
                      <p className="text-gray-900 font-semibold">sales@nxtdine.com</p>
                    </div>
                  </a>
                  
                  <a href="https://nxtdine.com" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-[#F0FDF4] transition-all group cursor-pointer">
                    <div className="bg-[#D1FAE5] p-3 rounded-xl text-emerald-700 group-hover:scale-110 transition-transform">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Visit Website</p>
                      <p className="text-gray-900 font-semibold">www.nxtdine.com</p>
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
