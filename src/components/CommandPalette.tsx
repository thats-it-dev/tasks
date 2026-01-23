import { Command, Button, Dialog } from '@thatsit/ui';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';
import { useSyncStore } from '../store/syncStore';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/db';

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setAuthPanelOpen } = useAppStore();
  const { addTask } = useTaskStore();
  const { isEnabled, disable } = useSyncStore();
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

  const handleCreateTask = async () => {
    if (search.trim()) {
      await addTask(search.trim());
      closePalette();
    }
  };

  const handleLogout = async (deleteLocalData: boolean) => {
    if (deleteLocalData) {
      await db.tasks.clear();
      await db.syncMeta.clear();
    }
    await disable();
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
            shouldFilter={false}
          >
            <Command.Input
              placeholder="Create a task..."
              autoFocus
              value={search}
              onValueChange={setSearch}
            />
            <Command.List>
              <Command.Empty>Type to create a task</Command.Empty>

              <Command.Group heading="Create">
                <Command.Item onSelect={handleCreateTask}>
                  {search.trim() ? `Create task: ${search}` : 'Create task'}
                </Command.Item>
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
