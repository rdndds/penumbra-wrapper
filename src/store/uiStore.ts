import { create } from 'zustand';

interface UIState {
  isLogPanelOpen: boolean;
  logPanelWidth: number;
  activeModal: string | null;
  
  // Actions
  openLogPanel: () => void;
  closeLogPanel: () => void;
  toggleLogPanel: () => void;
  setLogPanelWidth: (width: number) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLogPanelOpen: false,
  logPanelWidth: (() => {
    if (typeof window === 'undefined') return 800;
    const storedWidth = localStorage.getItem('logPanelWidth');
    const parsedWidth = storedWidth ? Number(storedWidth) : NaN;
    if (!Number.isNaN(parsedWidth) && parsedWidth > 0) {
      return parsedWidth;
    }
    return window.innerWidth * 0.4;
  })(),
  activeModal: null,
  
  openLogPanel: () => set({ isLogPanelOpen: true }),
  
  closeLogPanel: () => set({ isLogPanelOpen: false }),
  
  toggleLogPanel: () => set((state) => ({ isLogPanelOpen: !state.isLogPanelOpen })),
  
  setLogPanelWidth: (width) => {
    set({ logPanelWidth: width });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logPanelWidth', width.toString());
    }
  },
  
  openModal: (modalId) => set({ activeModal: modalId }),
  
  closeModal: () => set({ activeModal: null }),
}));
