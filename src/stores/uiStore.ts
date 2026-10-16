import { create } from 'zustand';

interface UIStore {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  modalOpen: false,
  setModalOpen: (open: boolean) => set({ modalOpen: open }),
}));
