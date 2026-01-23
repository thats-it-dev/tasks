import { useAppStore } from '../store/appStore';
import { CommandIcon } from 'lucide-react';
import { Button } from '@thatsit/ui';

export function CommandButton() {
  const { setCommandPaletteOpen } = useAppStore();

  return (
    <Button
      variant="ghost"
      onClick={() => setCommandPaletteOpen(true)}
      className="fixed bottom-4 right-4 z-50 lg:hidden md:visible w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full"
      aria-label="Open command palette"
    >
      <CommandIcon size={28} />
    </Button>
  );
}
