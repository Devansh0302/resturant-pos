'use client';

import { Lock, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

export function SubscriptionExpiredScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Subscription Expired
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your software license has expired. Please renew your subscription to restore full access to your restaurant billing dashboard.
        </p>

        <div className="bg-gray-50 rounded-xl p-6 text-left space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Contact Support to Renew</h3>
          
          <a href="tel:+919876543210" className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">+91 98765 43210</p>
              <p className="text-xs text-gray-500">Available Mon-Sat, 9AM-8PM</p>
            </div>
          </a>

          <a href="mailto:support@spiceroute.in" className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">support@spiceroute.in</p>
              <p className="text-xs text-gray-500">We typically reply within 2 hours</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
