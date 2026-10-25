import { create } from "zustand";
import type { UserStore } from "./types";
import {
  fetchBodyMetrics,
  fetchDraft,
  fetchMe,
  fetchWorkouts,
} from "../lib/api";

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoggedIn: false,
  logs: [],
  metrics: [],
  isLoading: false,
  toProcess: "",
  isPremium: false,

  setUser: (user) => {
    set({ user, isLoggedIn: user !== null });
  },

  setLoggedIn: (isLoggedIn) => {
    set({ isLoggedIn });
  },

  setToProcess: (transcript) => {
    set({ toProcess: transcript });
  },

  fetchMetrics: async (token?: string) => {
    set({ isLoading: true });
    try {
      const page = await fetchBodyMetrics(token);
      set({ isLoading: false, metrics: page.items });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      set({ isLoading: false });
    }
  },
  fetchToProcess: async (token?: string) => {
    set({ isLoading: true });
    try {
      const toProcess = await fetchDraft(token);
      set({ toProcess, isLoading: false });
    } catch (error) {
      console.error("Error fetching saved data:", error);
      set({ isLoading: false });
    }
  },
  fetchLogs: async (token?: string) => {
    set({ isLoading: true });
    try {
      const page = await fetchWorkouts(token);
      set({ logs: page.items, isLoading: false });
    } catch (error) {
      console.error("Error fetching logs:", error);
      set({ isLoading: false });
    }
  },
  fetchIsPremium: async (token?: string) => {
    set({ isLoading: true });
    try {
      const me = await fetchMe(token);
      set({ isPremium: me.isPremium, isLoading: false });
    } catch (error) {
      console.error("Error fetching user:", error);
      set({ isLoading: false });
    }
  },

  addLog: (log) => {
    set((state) => ({ logs: [log, ...state.logs] }));
  },

  addMetric: (metric) => {
    set((state) => ({ metrics: [metric, ...state.metrics] }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  clearStore: () => {
    set({
      user: null,
      isLoggedIn: false,
      logs: [],
      metrics: [],
      isLoading: false,
    });
  },
}));
