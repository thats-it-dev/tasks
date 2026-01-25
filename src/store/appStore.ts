import { create } from 'zustand';

type ViewType = 'tasks' | 'archive';

interface AppStore {
  commandPaletteOpen: boolean;
  authPanelOpen: boolean;
  focusedTaskId: string | null;
  currentView: ViewType;

  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setAuthPanelOpen: (open: boolean) => void;
  toggleAuthPanel: () => void;
  setFocusedTaskId: (id: string | null) => void;
  setCurrentView: (view: ViewType) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  commandPaletteOpen: false,
  authPanelOpen: false,
  focusedTaskId: null,
  currentView: 'tasks',

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setAuthPanelOpen: (open) => set({ authPanelOpen: open }),
  toggleAuthPanel: () => set((state) => ({ authPanelOpen: !state.authPanelOpen })),
  setFocusedTaskId: (id) => set({ focusedTaskId: id }),
  setCurrentView: (view) => set({ currentView: view }),
}));
