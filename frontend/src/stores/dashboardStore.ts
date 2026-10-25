import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkoutLog } from "./types";

export type DashboardLocation =
  | "home"
  | "dashboard"
  | "logs"
  | "insights"
  | "settings"
  | "voicelog";

export type ExerciseMetricType = "weight" | "duration" | "reps";

export interface AvailableExercise {
  name: string;
  category: string;
  lastLogged: Date;
  totalSessions: number;
  availableMetrics: ExerciseMetricType[];
}

interface DashboardState {
  currentLocation: DashboardLocation;

  selectedExercise: string | null;
  selectedMetricType: ExerciseMetricType;
  availableExercises: AvailableExercise[];

  isExerciseSelectorOpen: boolean;
}

interface DashboardActions {
  setCurrentLocation: (location: DashboardLocation) => void;

  setSelectedExercise: (exerciseName: string | null) => void;
  setSelectedMetricType: (metricType: ExerciseMetricType) => void;
  updateAvailableExercises: (logs: WorkoutLog[]) => void;

  toggleExerciseSelector: () => void;
  setExerciseSelectorOpen: (isOpen: boolean) => void;

  getDefaultExercise: () => string | null;
  getMostFrequentExercise: () => string | null;
}

type DashboardStore = DashboardState & DashboardActions;

const extractExercisesFromLogs = (logs: WorkoutLog[]): AvailableExercise[] => {
  const exerciseMap = new Map<string, AvailableExercise>();

  logs.forEach((log) => {
    log.exercises.forEach((exercise) => {
      const exerciseName = exercise.name.toLowerCase();

      if (exerciseMap.has(exerciseName)) {
        const existing = exerciseMap.get(exerciseName)!;
        existing.totalSessions += 1;
        existing.lastLogged = new Date(
          Math.max(existing.lastLogged.getTime(), new Date(log.date).getTime())
        );

        const metrics = new Set(existing.availableMetrics);
        exercise.sets.forEach((set) => {
          if (set.weight !== null && set.weight !== undefined)
            metrics.add("weight");
          if (set.duration !== null && set.duration !== undefined)
            metrics.add("duration");
          if (set.reps !== null && set.reps !== undefined) metrics.add("reps");
        });
        existing.availableMetrics = Array.from(metrics);
      } else {
        const metrics = new Set<ExerciseMetricType>();
        exercise.sets.forEach((set) => {
          if (set.weight !== null && set.weight !== undefined)
            metrics.add("weight");
          if (set.duration !== null && set.duration !== undefined)
            metrics.add("duration");
          if (set.reps !== null && set.reps !== undefined) metrics.add("reps");
        });

        exerciseMap.set(exerciseName, {
          name: exercise.name, // Keep original casing
          category: exercise.category,
          lastLogged: new Date(log.date),
          totalSessions: 1,
          availableMetrics: Array.from(metrics),
        });
      }
    });
  });

  return Array.from(exerciseMap.values()).sort((a, b) => {
    if (b.totalSessions !== a.totalSessions) {
      return b.totalSessions - a.totalSessions;
    }
    return b.lastLogged.getTime() - a.lastLogged.getTime();
  });
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      currentLocation: "dashboard",
      selectedExercise: null,
      selectedMetricType: "weight",
      availableExercises: [],
      isExerciseSelectorOpen: false,

      setCurrentLocation: (location) => set({ currentLocation: location }),

      setSelectedExercise: (exerciseName) =>
        set({ selectedExercise: exerciseName }),

      setSelectedMetricType: (metricType) =>
        set({ selectedMetricType: metricType }),

      updateAvailableExercises: (logs) => {
        const exercises = extractExercisesFromLogs(logs);
        const state = get();

        set({
          availableExercises: exercises,

          selectedExercise:
            state.selectedExercise || exercises[0]?.name || null,
        });
      },

      toggleExerciseSelector: () =>
        set((state) => ({
          isExerciseSelectorOpen: !state.isExerciseSelectorOpen,
        })),

      setExerciseSelectorOpen: (isOpen) =>
        set({ isExerciseSelectorOpen: isOpen }),

      getDefaultExercise: () => {
        const exercises = get().availableExercises;
        return exercises.length > 0 ? exercises[0].name : null;
      },

      getMostFrequentExercise: () => {
        const exercises = get().availableExercises;
        return exercises.length > 0 ? exercises[0].name : null;
      },
    }),
    {
      name: "sonic-dashboard-store",
      partialize: (state) => ({
        currentLocation: state.currentLocation,
        selectedExercise: state.selectedExercise,
        selectedMetricType: state.selectedMetricType,
      }),
    }
  )
);
