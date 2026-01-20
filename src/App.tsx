import { useEffect } from 'react';
import { SyncProvider, syncEngine } from './sync';
import { db, serializeEntity, deserializeEntity } from './lib/db';
import { useAppStore } from './store/appStore';
import { AuthPanel } from './components/AuthPanel';
import { CommandPalette } from './components/CommandPalette';

// Configure sync engine with our database and serialization
syncEngine.configure({
  db,
  serialize: serializeEntity,
  deserialize: deserializeEntity,
});

function App() {
  const { setCommandPaletteOpen } = useAppStore();

  // Show keyboard shortcut hint
  useEffect(() => {
    console.log('Press ⌘K (or Ctrl+K) to open the command palette');
  }, []);

  return (
    <SyncProvider db={db}>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-8">
        <h1 className="text-2xl font-bold mb-4">Frontend Template</h1>
        <p className="text-[var(--text-muted)] mb-4">
          Local-first app template with sync support.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Press{' '}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="px-2 py-1 bg-[var(--bg-muted)] rounded border border-[var(--border)] hover:bg-[var(--bg-hover)]"
          >
            ⌘K
          </button>{' '}
          to open the command palette and log in.
        </p>
      </div>
      <AuthPanel />
      <CommandPalette />
    </SyncProvider>
  );
}

export default App;
