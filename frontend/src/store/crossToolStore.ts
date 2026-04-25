import { create } from 'zustand';

interface PendingContext {
  content: string;
  suggestedTool: string;
  label: string;
}

interface CrossToolStore {
  pendingContext: PendingContext | null;
  setPendingContext: (content: string, suggestedTool: string, label: string) => void;
  clearPendingContext: () => void;
}

export const useCrossToolStore = create<CrossToolStore>()((set) => ({
  pendingContext: null,

  setPendingContext: (content, suggestedTool, label) =>
    set({ pendingContext: { content, suggestedTool, label } }),

  clearPendingContext: () => set({ pendingContext: null }),
}));
