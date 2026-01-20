import { create } from 'zustand';

interface AppStore {
  commandPaletteOpen: boolean;
  authPanelOpen: boolean;

  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setAuthPanelOpen: (open: boolean) => void;
  toggleAuthPanel: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  commandPaletteOpen: false,
  authPanelOpen: false,

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setAuthPanelOpen: (open) => set({ authPanelOpen: open }),
  toggleAuthPanel: () => set((state) => ({ authPanelOpen: !state.authPanelOpen })),
}));
