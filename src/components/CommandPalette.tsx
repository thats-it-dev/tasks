import { Command, Button, Dialog } from '@thatsit/ui';
import { useAppStore } from '../store/appStore';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSync } from '../sync';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setAuthPanelOpen,
  } = useAppStore();

  const { isEnabled, disable } = useSync();
  const [search, setSearch] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Lock body scroll when palette is open
  useEffect(() => {
    if (commandPaletteOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [commandPaletteOpen]);

  const closePalette = () => {
    setCommandPaletteOpen(false);
    setSearch('');
  };

  const handleLogout = (deleteLocalData: boolean) => {
    if (deleteLocalData) {
      // Apps should override this to clear their own data
      // For example: db.items.clear(); db.syncMeta.clear();
    }
    disable();
    setShowLogoutDialog(false);
    closePalette();
    if (deleteLocalData) {
      window.location.reload();
    }
  };

  if (!commandPaletteOpen && !showLogoutDialog) return null;

  return createPortal(
    <>
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start md:items-center md:pt-0 justify-center z-[100]"
          onClick={closePalette}
        >
          <Command
            label="Command Menu"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            loop
          >
            <Command.Input
              placeholder="Search commands..."
              autoFocus
              value={search}
              onValueChange={setSearch}
            />
            <Command.List>
              <Command.Empty>No results found</Command.Empty>

              {/* Apps can add their own command groups here */}
              <Command.Group heading="Commands">
                {/* Example: Apps add their commands here */}
              </Command.Group>

              <Command.Group heading="Settings">
                {isEnabled ? (
                  <Command.Item
                    onSelect={() => {
                      setShowLogoutDialog(true);
                      closePalette();
                    }}
                  >
                    Log out
                  </Command.Item>
                ) : (
                  <Command.Item
                    onSelect={() => {
                      setAuthPanelOpen(true);
                      closePalette();
                    }}
                  >
                    Log in
                  </Command.Item>
                )}
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      )}

      <Dialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Log out"
        description="Do you want to delete your data from this device? This will not affect your data on other devices."
        size="sm"
        footer={
          <div className="flex flex-row gap-2 w-full justify-end">
            <Button onClick={() => handleLogout(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={() => handleLogout(true)}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div />
      </Dialog>
    </>,
    document.body
  );
}
