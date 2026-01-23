import { useState, useEffect } from 'react';

/**
 * Hook to detect virtual keyboard height on mobile devices.
 * Uses the Visual Viewport API to calculate the difference between
 * the window height and the visible viewport height.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardHeight = () => {
      // The keyboard height is the difference between window height and viewport height
      // Account for any zoom by using viewport.scale
      const heightDiff = window.innerHeight - viewport.height * viewport.scale;
      // Only consider it a keyboard if the difference is significant (> 100px)
      // This avoids false positives from browser chrome changes
      setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
    };

    viewport.addEventListener('resize', updateKeyboardHeight);
    viewport.addEventListener('scroll', updateKeyboardHeight);

    // Initial check
    updateKeyboardHeight();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardHeight);
      viewport.removeEventListener('scroll', updateKeyboardHeight);
    };
  }, []);

  return keyboardHeight;
}
