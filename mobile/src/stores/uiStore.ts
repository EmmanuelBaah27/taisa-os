import { create } from 'zustand';

type RecordingPhase = 'idle' | 'recording' | 'reviewing' | 'processing' | 'complete';

interface UIStore {
  recordingPhase: RecordingPhase;
  isProcessing: boolean;

  setRecordingPhase: (phase: RecordingPhase) => void;
  setProcessing: (v: boolean) => void;
  resetJournalFlow: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  recordingPhase: 'idle',
  isProcessing: false,

  setRecordingPhase: (phase) => set({ recordingPhase: phase }),
  setProcessing: (v) => set({ isProcessing: v }),
  resetJournalFlow: () => set({ recordingPhase: 'idle', isProcessing: false }),
}));
