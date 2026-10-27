import type { DraftWorkout } from "./api";
import type { WorkoutLog } from "../stores/types";

/** A saved workout as an editable draft. `asNew` drops the date, for "repeat this workout today". */
export const workoutToDraft = (log: WorkoutLog, asNew = false): DraftWorkout => ({
  date: asNew ? null : new Date(log.date).toISOString(),
  duration: asNew ? null : log.duration ?? null,
  note: asNew ? null : log.note ?? null,
  exercises: log.exercises.map((e) => ({
    name: e.name,
    category: e.category,
    isCustom: e.isCustom ?? null,
    sets: e.sets.map((s) => ({
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      distance: s.distance ?? null,
      duration: s.duration ?? null,
      intensity: s.intensity ?? null,
      note: s.note ?? null,
    })),
  })),
});

/** The most recent workouts with different exercise line-ups, for "repeat a recent workout". */
export const recentDistinctWorkouts = (logs: WorkoutLog[], count: number) => {
  const seen = new Set<string>();
  const picked: WorkoutLog[] = [];
  for (const log of logs) {
    const signature = log.exercises.map((e) => e.name.toLowerCase()).sort().join("|");
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    picked.push(log);
    if (picked.length === count) break;
  }
  return picked;
};
