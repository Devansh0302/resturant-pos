'use client';

import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/app/driver-theme.css';

interface QuickTourProps {
  initialHasSeenTour: boolean;
}

export default function QuickTour({ initialHasSeenTour }: QuickTourProps) {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Check localStorage in case the NextAuth session is stale
    const localHasSeen = localStorage.getItem('has_seen_tour_local') === 'true';
    if (initialHasSeenTour || localHasSeen || hasStarted) return;
    
    // Give time for layout/sidebar to mount on first load
    const timer = setTimeout(() => {
      setHasStarted(true);
      
      const tourDriver = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Done',
        onDestroyStarted: async () => {
          if (!tourDriver.hasNextStep() || confirm("Are you sure you want to skip the tour?")) {
            localStorage.setItem('has_seen_tour_local', 'true');
            try {
              await fetch('/api/staff/tour', { method: 'PATCH' });
            } catch (e) {
              console.error('Failed to update tour state', e);
            }
            tourDriver.destroy();
          }
        },
        steps: [
          {
            element: '#tour-dashboard',
            popover: {
              title: 'Welcome to Spice Route! 🚀',
              description: 'This is your central hub for tracking live orders, managing tables, and viewing daily sales reports. Keep an eye on your live revenue metrics!',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '#tour-settings',
            popover: {
              title: 'Configure Your Restaurant ⚙️',
              description: 'Before you start taking orders, head over to the Settings page to configure your GST rates, bill footer messages, and upload your restaurant logo.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '#tour-menu',
            popover: {
              title: 'Manage Your Menu 🍔',
              description: "Finally, you can easily add Categories and Menu Items from the Menu tab. You're all set to start your journey with us!",
              side: 'right',
              align: 'start'
            }
          }
        ]
      });
      
      tourDriver.drive();
    }, 500);

    return () => clearTimeout(timer);
  }, [initialHasSeenTour, hasStarted]);

  return null;
}
