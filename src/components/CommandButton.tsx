import { useAppStore } from '../store/appStore';
import { CommandIcon } from 'lucide-react';
import { Button } from '@thatsit/ui';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

export function CommandButton() {
  const { setCommandPaletteOpen } = useAppStore();
  const keyboardHeight = useKeyboardHeight();

  // Calculate position with safe areas
  const bottomOffset = keyboardHeight > 0
    ? `calc(${keyboardHeight}px + 1rem)`
    : 'calc(var(--safe-area-inset-bottom, 0px) + 1rem)';
  const rightOffset = 'calc(var(--safe-area-inset-right, 0px) + 1rem)';

  return (
    <Button
      variant="ghost"
      onClick={() => setCommandPaletteOpen(true)}
      className="fixed z-50 lg:hidden md:visible w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full transition-[bottom] duration-200"
      style={{ bottom: bottomOffset, right: rightOffset }}
      aria-label="Open command palette"
    >
      <CommandIcon size={28} />
    </Button>
  );
}
