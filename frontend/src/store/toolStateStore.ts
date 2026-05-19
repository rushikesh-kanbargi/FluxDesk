import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT_TOOLS = 5;

interface StoredOutput {
  output: string;
  timestamp: number;
}

interface ToolStateStore {
  // Per-tool field values: { toolId: { fieldName: value } }
  inputs: Record<string, Record<string, string>>;
  // Per-tool last output: { toolId: { output, timestamp } }
  outputs: Record<string, StoredOutput>;
  // Ordered list of recently used tool IDs (max 5)
  recentTools: string[];

  setToolInput: (toolId: string, field: string, value: string) => void;
  setToolOutput: (toolId: string, output: string) => void;
  getToolInput: (toolId: string) => Record<string, string>;
  getToolOutput: (toolId: string) => StoredOutput | null;
  addRecentTool: (toolId: string) => void;
  clearToolState: (toolId: string) => void;
}

export const useToolStateStore = create<ToolStateStore>()(
  persist(
    (set, get) => ({
      inputs: {},
      outputs: {},
      recentTools: [],

      setToolInput: (toolId, field, value) =>
        set(state => ({
          inputs: {
            ...state.inputs,
            [toolId]: {
              ...(state.inputs[toolId] ?? {}),
              [field]: value,
            },
          },
        })),

      setToolOutput: (toolId, output) =>
        set(state => ({
          outputs: {
            ...state.outputs,
            [toolId]: { output, timestamp: Date.now() },
          },
        })),

      getToolInput: (toolId) => get().inputs[toolId] ?? {},

      getToolOutput: (toolId) => {
        const stored = get().outputs[toolId];
        return stored ?? null;
      },

      addRecentTool: (toolId) =>
        set(state => {
          const filtered = state.recentTools.filter(id => id !== toolId);
          return { recentTools: [toolId, ...filtered].slice(0, MAX_RECENT_TOOLS) };
        }),

      clearToolState: (toolId) =>
        set(state => {
          const inputs = { ...state.inputs };
          const outputs = { ...state.outputs };
          delete inputs[toolId];
          delete outputs[toolId];
          return { inputs, outputs };
        }),
    }),
    {
      name: 'fluxdesk-tool-state',
      // outputs are kept in-memory only — never written to localStorage
      partialize: (state) => {
        const { outputs: _outputs, ...rest } = state
        return rest
      },
    }
  )
);
