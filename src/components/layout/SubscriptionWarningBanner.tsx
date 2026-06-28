'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionWarningBannerProps {
  daysRemaining: number;
}

export function SubscriptionWarningBanner({ daysRemaining }: SubscriptionWarningBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 5 seconds so it doesn't disturb work permanently
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (daysRemaining < 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="bg-yellow-50 border border-yellow-200 px-6 py-4 flex items-center gap-3 fixed top-6 left-1/2 -translate-x-1/2 z-[100] shadow-xl rounded-2xl max-w-2xl w-max"
        >
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-sm font-medium text-yellow-800 flex-1">
            <strong className="font-bold text-yellow-900 block mb-0.5">Subscription expiring in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.</strong>
            Please contact support to renew and avoid access interruption.
          </p>
          <button 
            onClick={() => setIsVisible(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-200 transition-colors shrink-0 ml-2 text-yellow-700"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
