import { useEffect } from 'react';

// Extend Navigator interface for Badging API
declare global {
  interface Navigator {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  }
}

/**
 * Hook to update the PWA app badge with a count.
 * Works on iOS (16.4+) and other platforms that support the Badging API.
 *
 * Note: Only works when the app is installed as a PWA (added to home screen).
 * Does nothing when running in a regular browser tab.
 */
export function useAppBadge(count: number) {
  useEffect(() => {
    const updateBadge = async () => {
      // Check if the Badging API is supported
      if (typeof navigator.setAppBadge !== 'function') {
        console.debug('App Badging API not supported');
        return;
      }

      try {
        if (count > 0) {
          await navigator.setAppBadge(count);
          console.debug(`App badge set to ${count}`);
        } else {
          if (typeof navigator.clearAppBadge === 'function') {
            await navigator.clearAppBadge();
          } else {
            await navigator.setAppBadge(0);
          }
          console.debug('App badge cleared');
        }
      } catch (error) {
        // Common reasons for failure:
        // - Not running as installed PWA
        // - User hasn't granted permission
        // - Platform doesn't support badges
        console.debug('App badge update failed:', error);
      }
    };

    updateBadge();
  }, [count]);
}
