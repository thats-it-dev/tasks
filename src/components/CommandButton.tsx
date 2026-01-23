import { useAppStore } from '../store/appStore';
import { CommandIcon } from 'lucide-react';
import { Button } from '@thatsit/ui';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

export function CommandButton() {
  const { setCommandPaletteOpen } = useAppStore();
  const keyboardHeight = useKeyboardHeight();

  return (
    <Button
      variant="ghost"
      onClick={() => setCommandPaletteOpen(true)}
      className="fixed right-4 z-50 lg:hidden md:visible w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full transition-[bottom] duration-200"
      style={{ bottom: `max(1rem, calc(${keyboardHeight}px + 1rem))` }}
      aria-label="Open command palette"
    >
      <CommandIcon size={28} />
    </Button>
  );
}
