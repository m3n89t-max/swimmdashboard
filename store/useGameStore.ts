'use client';

import { create } from 'zustand';
import type { Heat, DisplayMode } from '@/types';

interface GameStore {
  currentHeat: Heat | null;
  nextHeats: Heat[];
  displayMode: DisplayMode;
  announcerEnabled: boolean;
  allHeats: Heat[];

  // Actions
  setCurrentHeat: (heat: Heat) => void;
  clearCurrentHeat: () => void;
  setNextHeats: (heats: Heat[]) => void;
  setAllHeats: (heats: Heat[]) => void;
  updateRecord: (lane: number, record: string, rank?: number, status?: 'DNS' | 'DQ' | 'DSQ') => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setAnnouncerEnabled: (v: boolean) => void;
  markHeatCompleted: (heatId: string) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  currentHeat: null,
  nextHeats: [],
  displayMode: 'standby',
  announcerEnabled: true,
  allHeats: [],

  setCurrentHeat: (heat) =>
    set((s) => ({
      currentHeat: heat,
      displayMode: 'results',
      // 활성화된 조를 nextHeats에서 제거
      nextHeats: s.nextHeats.filter((h) => h.id !== heat.id),
    })),

  clearCurrentHeat: () => set({ currentHeat: null, displayMode: 'standby' }),

  setNextHeats: (heats) => set({ nextHeats: heats }),

  setAllHeats: (heats) => set({ allHeats: heats }),

  updateRecord: (lane, record, rank, status) =>
    set((s) => {
      if (!s.currentHeat) return {};
      return {
        currentHeat: {
          ...s.currentHeat,
          lanes: s.currentHeat.lanes.map((l) =>
            l.lane === lane
              ? { ...l, record, rank: rank ?? l.rank, status: status ?? l.status }
              : l,
          ),
        },
      };
    }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  setAnnouncerEnabled: (v) => set({ announcerEnabled: v }),

  markHeatCompleted: (heatId) =>
    set((s) => ({
      allHeats: s.allHeats.map((h) =>
        h.id === heatId ? { ...h, status: 'completed' as const } : h,
      ),
    })),
}));
