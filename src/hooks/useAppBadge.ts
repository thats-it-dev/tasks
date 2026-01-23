import { useEffect } from 'react';

/**
 * Hook to update the PWA app badge with a count.
 * Works on iOS (16.4+) and other platforms that support the Badging API.
 */
export function useAppBadge(count: number) {
  useEffect(() => {
    // Check if the Badging API is supported
    if (!('setAppBadge' in navigator)) {
      return;
    }

    const updateBadge = async () => {
      try {
        if (count > 0) {
          await navigator.setAppBadge(count);
        } else {
          await navigator.clearAppBadge();
        }
      } catch (error) {
        // Silently fail - badge API may not be available in all contexts
        console.debug('App badge update failed:', error);
      }
    };

    updateBadge();
  }, [count]);
}
