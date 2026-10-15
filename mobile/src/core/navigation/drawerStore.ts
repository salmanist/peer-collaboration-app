import { create } from "zustand";

interface DrawerState {
  isMenuOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isMenuOpen: false,
  openDrawer: () => set({ isMenuOpen: true }),
  closeDrawer: () => set({ isMenuOpen: false }),
}));
