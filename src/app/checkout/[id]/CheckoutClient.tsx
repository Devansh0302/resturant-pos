'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CreditCard, Smartphone, Building2, CheckCircle2, Loader2, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutClient({ session }: { session: any }) {
  const router = useRouter();
  const [method, setMethod] = useState('RAZORPAY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Load Razorpay Script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const handlePayment = async () => {
    if (!(window as any).Razorpay) {
      toast.error('Razorpay SDK failed to load. Please check your connection.');
      return;
    }

    setIsProcessing(true);
    
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummy', 
      amount: Math.round(session.total_amount * 100),
      currency: 'INR',
      name: "Spice Route",
      description: session.plan_name,
      order_id: session.razorpay_order_id, 
      handler: async function (response: any) {
        try {
          const res = await fetch('/api/subscription/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (res.ok) {
            setIsSuccess(true);
            setTimeout(() => {
              router.push('/settings?payment=success');
            }, 2000);
          } else {
            toast.error('Payment verification failed.');
            setIsProcessing(false);
          }
        } catch (error) {
          toast.error('Network error during payment verification.');
          setIsProcessing(false);
        }
      },
      prefill: {
        name: "Spice Route Admin",
        email: "admin@spiceroute.com",
        contact: "9999999999"
      },
      theme: {
        color: "#10B981"
      }
    };

    const rzp1 = new (window as any).Razorpay(options);
    rzp1.on('payment.failed', function (response: any){
      toast.error(response.error.description || 'Payment Failed');
      setIsProcessing(false);
    });
    rzp1.open();
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center flex flex-col items-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 mb-8">Your subscription has been activated.</p>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2 }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
          <p className="text-xs text-gray-400 mt-4 font-medium uppercase tracking-wider">Redirecting to Dashboard</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6 bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Left Side: Order Summary */}
        <div className="bg-slate-900 p-8 md:p-12 text-white flex flex-col">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="font-bold text-white text-lg">S</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Spice Route</span>
          </div>

          <h2 className="text-3xl font-bold mb-2">Checkout</h2>
          <p className="text-slate-400 mb-12">Complete your purchase for {session.plan_name}</p>

          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>{session.plan_name}</span>
              <span className="font-medium text-white">{formatCurrency(session.amount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-sm pb-4 border-b border-slate-800">
              <span>GST (18%)</span>
              <span>{formatCurrency(session.tax_amount)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-medium text-slate-200">Total Due</span>
              <span className="text-3xl font-bold text-white">{formatCurrency(session.total_amount)}</span>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure 256-bit SSL encrypted payment</span>
          </div>
        </div>

        {/* Right Side: Payment Methods */}
        <div className="p-8 md:p-12">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Select Payment Method
          </h3>

          <div className="space-y-3 mb-8">
            <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
               </div>
               <div className="flex-1">
                  <p className="font-bold text-sm">Razorpay Secure Checkout</p>
                  <p className="text-xs text-gray-500">Supports UPI, Cards, Netbanking & Wallets</p>
               </div>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-75 disabled:cursor-not-allowed shadow-xl shadow-slate-900/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Launching Gateway...
              </>
            ) : (
              <>
                Pay Securely with Razorpay
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1 font-medium">
            Secured by 
            <span className="font-bold text-gray-700 tracking-tight">Razorpay™</span> 
          </p>
        </div>

      </div>
    </div>
  );
}
