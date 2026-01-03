import { create } from 'zustand';

interface SiteState {
    isWidgetOpen: boolean;
    toggleWidget: () => void;
}

export const useSiteStore = create<SiteState>((set) => ({
    isWidgetOpen: false,
    toggleWidget: () => set((state) => ({ isWidgetOpen: !state.isWidgetOpen })),
}));
