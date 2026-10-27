import { create } from "zustand";
import type { Metric, WorkoutLog } from "./types";
import {
  type WeightUnit,
  errorMessage,
  fetchBodyMetrics,
  fetchDraft,
  fetchMe,
  fetchWorkouts,
} from "../lib/api";

const byDateDesc = <T extends { date: string | Date }>(a: T, b: T) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

interface UserStore {
  logs: WorkoutLog[];
  metrics: Metric[];
  draft: string;
  isPremium: boolean;
  weightUnit: WeightUnit;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;

  load: (token: string) => Promise<void>;
  addLog: (log: WorkoutLog) => void;
  addMetric: (metric: Metric) => void;
  removeLog: (id: string) => void;
  removeMetric: (id: string) => void;
  replaceLog: (log: WorkoutLog) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setDraft: (text: string) => void;
  clear: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  logs: [],
  metrics: [],
  draft: "",
  isPremium: false,
  weightUnit: "kg",
  status: "idle",
  error: null,

  load: async (token) => {
    set({ status: "loading", error: null });
    try {
      const [workouts, metrics, draft, me] = await Promise.all([
        fetchWorkouts(token),
        fetchBodyMetrics(token),
        fetchDraft(token),
        fetchMe(token),
      ]);
      set({
        logs: workouts.items,
        metrics: metrics.items,
        draft,
        isPremium: me.isPremium,
        weightUnit: me.weightUnit ?? "kg",
        status: "ready",
      });
    } catch (error) {
      set({ status: "error", error: errorMessage(error) });
    }
  },

  addLog: (log) => set((s) => ({ logs: [log, ...s.logs].sort(byDateDesc) })),
  addMetric: (metric) =>
    set((s) => ({ metrics: [metric, ...s.metrics].sort(byDateDesc) })),
  removeLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
  removeMetric: (id) =>
    set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) })),
  replaceLog: (log) =>
    set((s) => ({ logs: s.logs.map((l) => (l.id === log.id ? log : l)).sort(byDateDesc) })),
  setWeightUnit: (weightUnit) => set({ weightUnit }),
  setDraft: (draft) => set({ draft }),
  clear: () =>
    set({ logs: [], metrics: [], draft: "", isPremium: false, weightUnit: "kg", status: "idle", error: null }),
}));
