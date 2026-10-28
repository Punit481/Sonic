import type { WeightUnit } from "./api";
import { displayWeight } from "./units";
import type { Exercise, ExerciseCategory, Metric, WorkoutLog } from "../stores/types";

const DAY = 24 * 60 * 60 * 1000;

/** Local calendar day, e.g. "2026-10-26". */
export const dayKey = (date: string | Date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Monday of the week containing `date`. */
export const startOfWeek = (date: Date) => {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

export const exerciseVolume = (exercise: Exercise) =>
  exercise.sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

export const sessionVolume = (log: WorkoutLog) =>
  log.exercises.reduce((sum, e) => sum + exerciseVolume(e), 0);

export const sessionCardioMinutes = (log: WorkoutLog) =>
  log.exercises
    .filter((e) => e.category === "cardio")
    .reduce((sum, e) => sum + e.sets.reduce((m, s) => m + (s.duration ?? 0) * 60, 0), 0);

export interface WindowStats {
  sessions: number;
  volume: number;
  cardioMinutes: number;
}

/** Totals for the `days` days ending `offsetDays` before now. */
export const windowStats = (
  logs: WorkoutLog[],
  days: number,
  offsetDays = 0,
  now = new Date()
): WindowStats => {
  const end = now.getTime() - offsetDays * DAY;
  const start = end - days * DAY;
  const inWindow = logs.filter((l) => {
    const t = new Date(l.date).getTime();
    return t > start && t <= end;
  });
  return {
    sessions: inWindow.length,
    volume: inWindow.reduce((sum, l) => sum + sessionVolume(l), 0),
    cardioMinutes: inWindow.reduce((sum, l) => sum + sessionCardioMinutes(l), 0),
  };
};

export interface WeekBucket {
  label: string;
  start: Date;
  volume: number;
  sessions: number;
}

/** The last `weeks` Monday-to-Sunday weeks, oldest first, including the current one. */
export const weeklyTotals = (logs: WorkoutLog[], weeks: number, now = new Date()): WeekBucket[] => {
  const thisWeek = startOfWeek(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    buckets.push({
      start,
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: 0,
      sessions: 0,
    });
  }
  for (const log of logs) {
    const week = startOfWeek(new Date(log.date)).getTime();
    const bucket = buckets.find((b) => b.start.getTime() === week);
    if (bucket) {
      bucket.volume += sessionVolume(log);
      bucket.sessions += 1;
    }
  }
  return buckets;
};

/** Consecutive weeks with at least one workout. The current week counts once it has one. */
export const weekStreak = (logs: WorkoutLog[], now = new Date()) => {
  const trained = new Set(logs.map((l) => startOfWeek(new Date(l.date)).getTime()));
  const week = startOfWeek(now);
  if (!trained.has(week.getTime())) {
    week.setDate(week.getDate() - 7);
  }
  let streak = 0;
  while (trained.has(week.getTime())) {
    streak++;
    week.setDate(week.getDate() - 7);
  }
  return streak;
};

export interface ActivityDay {
  key: string;
  date: Date;
  sessions: number;
  /** 0 = rest, 1-3 = rising training load. */
  level: 0 | 1 | 2 | 3;
  future: boolean;
}

/** `weeks` columns of Monday-to-Sunday days for the activity grid, oldest first. */
export const activityGrid = (logs: WorkoutLog[], weeks: number, now = new Date()): ActivityDay[][] => {
  const load = new Map<string, { sessions: number; sets: number }>();
  for (const log of logs) {
    const key = dayKey(log.date);
    const entry = load.get(key) ?? { sessions: 0, sets: 0 };
    entry.sessions += 1;
    entry.sets += log.exercises.reduce((n, e) => n + e.sets.length, 0);
    load.set(key, entry);
  }

  const today = startOfDay(now).getTime();
  const first = startOfWeek(now);
  first.setDate(first.getDate() - (weeks - 1) * 7);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(first);
      date.setDate(first.getDate() + w * 7 + d);
      const key = dayKey(date);
      const entry = load.get(key);
      const sets = entry?.sets ?? 0;
      const level = !entry ? 0 : sets >= 14 ? 3 : sets >= 6 ? 2 : 1;
      return { key, date, sessions: entry?.sessions ?? 0, level, future: date.getTime() > today };
    })
  );
};

export interface ExerciseSummary {
  name: string;
  category: ExerciseCategory;
  sessions: number;
}

/** Every exercise logged, most frequent first. Names match case-insensitively. */
export const exerciseSummaries = (logs: WorkoutLog[]): ExerciseSummary[] => {
  const byName = new Map<string, ExerciseSummary>();
  for (const log of logs) {
    for (const e of log.exercises) {
      const key = e.name.toLowerCase();
      const entry = byName.get(key) ?? { name: e.name, category: e.category, sessions: 0 };
      entry.sessions += 1;
      byName.set(key, entry);
    }
  }
  return [...byName.values()].sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
};

export interface ProgressPoint {
  date: number;
  value: number;
}

export interface ExerciseProgress {
  unit: string;
  label: string;
  points: ProgressPoint[];
}

/**
 * One point per session for an exercise, oldest first: the heaviest set for weighted lifts,
 * the most reps for bodyweight work, distance (or minutes) for cardio.
 */
export const exerciseProgress = (logs: WorkoutLog[], name: string): ExerciseProgress => {
  const matches = logs
    .flatMap((log) =>
      log.exercises
        .filter((e) => e.name.toLowerCase() === name.toLowerCase())
        .map((e) => ({ date: new Date(log.date).getTime(), sets: e.sets }))
    )
    .sort((a, b) => a.date - b.date);

  const all = matches.flatMap((m) => m.sets);
  const pick = (field: "weight" | "reps" | "distance" | "duration", scale = 1) =>
    matches
      .map((m) => {
        const values = m.sets.map((s) => s[field]).filter((v): v is number => v != null && v > 0);
        return values.length ? { date: m.date, value: Math.max(...values) * scale } : null;
      })
      .filter((p): p is ProgressPoint => p !== null);

  if (all.some((s) => s.weight)) return { unit: "kg", label: "Top set", points: pick("weight") };
  if (all.some((s) => s.distance)) return { unit: "km", label: "Distance", points: pick("distance") };
  if (all.some((s) => s.duration)) return { unit: "min", label: "Time", points: pick("duration", 60) };
  return { unit: "reps", label: "Best set", points: pick("reps") };
};

export type MetricKey = "weight" | "bodyFat" | "muscleMass";

/** Measurements of one kind within the last `days` days, oldest first. */
export const metricSeries = (
  metrics: Metric[],
  key: MetricKey,
  days: number,
  now = new Date()
): ProgressPoint[] => {
  const since = now.getTime() - days * DAY;
  return metrics
    .filter((m) => m[key] != null && new Date(m.date).getTime() >= since)
    .map((m) => ({ date: new Date(m.date).getTime(), value: m[key] as number }))
    .sort((a, b) => a.date - b.date);
};

/** Most recent value of a measurement and its change over the series. */
export const latestWithChange = (points: ProgressPoint[]) => {
  if (points.length === 0) return null;
  const latest = points[points.length - 1].value;
  return { latest, change: points.length > 1 ? latest - points[0].value : null };
};

// Formatting

export const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const formatMinutes = (minutes: number) => {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
};

export const formatDay = (date: string | Date, now = new Date()) => {
  const d = startOfDay(new Date(date)).getTime();
  const today = startOfDay(now).getTime();
  if (d === today) return "Today";
  if (d === today - DAY) return "Yesterday";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(new Date(date).getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
};

/** "82.5 kg", or "182 lb" for a user who thinks in pounds. Input is always kg. */
export const formatWeight = (kg: number, unit: WeightUnit = "kg", digits = 1) =>
  `${formatNumber(displayWeight(kg, unit), digits)} ${unit}`;

/** "8 reps · 80 kg", "5.2 km · 28 min", "15 min". */
export const describeSet = (set: Exercise["sets"][number], unit: WeightUnit = "kg") => {
  const parts: string[] = [];
  if (set.reps != null) parts.push(`${set.reps} reps`);
  if (set.weight != null) parts.push(formatWeight(set.weight, unit));
  if (set.distance != null) parts.push(`${formatNumber(set.distance, 2)} km`);
  if (set.duration != null) parts.push(formatMinutes(set.duration * 60));
  return parts.join(" · ") || "Done";
};

/** Groups identical consecutive sets: "3 × 8 reps · 80 kg". */
export const describeSets = (sets: Exercise["sets"], unit: WeightUnit = "kg") => {
  const lines: { text: string; count: number }[] = [];
  for (const set of sets) {
    const text = describeSet(set, unit);
    const last = lines[lines.length - 1];
    if (last && last.text === text) last.count++;
    else lines.push({ text, count: 1 });
  }
  return lines.map((l) => (l.count > 1 ? `${l.count} × ${l.text}` : l.text));
};
