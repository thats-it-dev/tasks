import { useState, useEffect, useCallback } from 'react';

interface ViewportPosition {
  top: number;
  height: number;
  isKeyboardOpen: boolean;
}

/**
 * Hook to track the visual viewport position for proper fixed positioning on iOS.
 * Returns the visual viewport's top offset and height, which can be used to position
 * elements relative to what the user actually sees (not the layout viewport).
 */
export function useVisualViewport(): ViewportPosition {
  const [position, setPosition] = useState<ViewportPosition>({
    top: 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isKeyboardOpen: false,
  });

  const update = useCallback(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      setPosition({
        top: 0,
        height: window.innerHeight,
        isKeyboardOpen: false,
      });
      return;
    }

    // Check if an input is focused to determine if keyboard is likely open
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl as HTMLElement).isContentEditable ||
      activeEl.closest('[contenteditable="true"]')
    );

    const heightDiff = window.innerHeight - viewport.height;
    const isKeyboardOpen = !!isInputFocused && heightDiff > 150;

    setPosition({
      top: viewport.offsetTop,
      height: viewport.height,
      isKeyboardOpen,
    });
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);

    update();

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, [update]);

  return position;
}

// Legacy export for backwards compatibility
export function useKeyboardHeight(): number {
  const { height, isKeyboardOpen } = useVisualViewport();
  if (!isKeyboardOpen) return 0;
  return window.innerHeight - height;
}
