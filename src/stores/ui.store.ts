import { create } from 'zustand';

/**
 * UI Store - manages global UI state like modals, lightboxes, etc.
 * Used to coordinate between components (e.g., prevent sidebar close when lightbox is open)
 */
interface UIStore {
  // Track number of open overlays (lightboxes, modals)
  openOverlayCount: number;

  // Actions
  openOverlay: () => void;
  closeOverlay: () => void;

  // Helpers
  hasOpenOverlay: () => boolean;
}

export const useUIStore = create<UIStore>((set, get) => ({
  openOverlayCount: 0,

  openOverlay: () => set((state) => ({
    openOverlayCount: state.openOverlayCount + 1
  })),

  closeOverlay: () => set((state) => ({
    openOverlayCount: Math.max(0, state.openOverlayCount - 1)
  })),

  hasOpenOverlay: () => get().openOverlayCount > 0,
}));
