import { describe, expect, it } from "vitest";
import {
  activityGrid,
  describeSets,
  exerciseProgress,
  exerciseSummaries,
  formatMinutes,
  latestWithChange,
  metricSeries,
  weeklyTotals,
  weekStreak,
  windowStats,
} from "../stats";
import type { Exercise, Metric, WorkoutLog } from "../../stores/types";

// Wednesday, local time.
const NOW = new Date(2026, 9, 28, 12, 0);
const daysAgo = (n: number) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n, 18);

const lift = (name: string, sets: [number, number][]): Exercise => ({
  id: name,
  name,
  category: "strength",
  aiTagged: true,
  sets: sets.map(([reps, weight], i) => ({ id: `${name}${i}`, reps, weight })),
});

const run = (km: number, hours: number): Exercise => ({
  id: "run",
  name: "Running",
  category: "cardio",
  aiTagged: true,
  sets: [{ id: "r", distance: km, duration: hours }],
});

const workout = (ago: number, ...exercises: Exercise[]): WorkoutLog => ({
  id: `w${ago}`,
  date: daysAgo(ago).toISOString(),
  createdAt: daysAgo(ago).toISOString(),
  exercises,
});

const logs = [
  workout(1, lift("Bench Press", [[8, 80], [8, 80], [6, 80]])),
  workout(2, run(5, 0.5)),
  workout(9, lift("bench press", [[8, 75], [8, 75]]), run(4, 0.4)),
  workout(16, lift("Bench Press", [[8, 70]])),
];

describe("windowStats", () => {
  it("totals volume, sessions and cardio minutes for the last 7 days", () => {
    expect(windowStats(logs, 7, 0, NOW)).toEqual({ sessions: 2, volume: 1760, cardioMinutes: 30 });
  });

  it("looks further back with an offset", () => {
    expect(windowStats(logs, 7, 7, NOW)).toEqual({ sessions: 1, volume: 1200, cardioMinutes: 24 });
  });
});

describe("weeklyTotals", () => {
  it("buckets Monday-to-Sunday weeks, oldest first", () => {
    const weeks = weeklyTotals(logs, 4, NOW);
    expect(weeks.map((w) => w.start.getDay())).toEqual([1, 1, 1, 1]);
    expect(weeks.map((w) => w.sessions)).toEqual([0, 1, 1, 2]);
    expect(weeks[3].volume).toBe(1760);
  });
});

describe("weekStreak", () => {
  it("counts consecutive weeks with a workout", () => {
    expect(weekStreak(logs, NOW)).toBe(3);
  });

  it("doesn't break the streak just because this week is empty so far", () => {
    expect(weekStreak([workout(9), workout(16)], NOW)).toBe(2);
  });

  it("is zero without recent workouts", () => {
    expect(weekStreak([workout(30)], NOW)).toBe(0);
  });
});

describe("activityGrid", () => {
  it("returns weeks of seven days, marking trained days and future days", () => {
    const grid = activityGrid(logs, 3, NOW);
    expect(grid).toHaveLength(3);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    const days = grid.flat();
    expect(days.filter((d) => d.sessions > 0)).toHaveLength(4); // Oct 12 to Nov 1 holds all four workouts
    expect(days.filter((d) => d.future)).toHaveLength(4); // Thu-Sun of this week
  });
});

describe("exercise helpers", () => {
  it("groups exercises case-insensitively, most frequent first", () => {
    expect(exerciseSummaries(logs).map((e) => [e.name, e.sessions])).toEqual([
      ["Bench Press", 3],
      ["Running", 2],
    ]);
  });

  it("tracks the heaviest set for lifts and distance for cardio", () => {
    expect(exerciseProgress(logs, "bench press")).toMatchObject({
      unit: "kg",
      points: [{ value: 70 }, { value: 75 }, { value: 80 }],
    });
    expect(exerciseProgress(logs, "Running")).toMatchObject({ unit: "km", points: [{ value: 4 }, { value: 5 }] });
  });

  it("collapses identical sets", () => {
    expect(describeSets(lift("x", [[8, 80], [8, 80], [6, 80]]).sets)).toEqual(["2 × 8 reps · 80 kg", "6 reps · 80 kg"]);
  });
});

describe("metrics", () => {
  const metrics: Metric[] = [
    { id: "1", date: daysAgo(40).toISOString(), weight: 82 },
    { id: "2", date: daysAgo(20).toISOString(), weight: 80, bodyFat: 18 },
    { id: "3", date: daysAgo(2).toISOString(), weight: 79.5 },
  ];

  it("keeps one measurement type inside the window, oldest first", () => {
    expect(metricSeries(metrics, "weight", 30, NOW).map((p) => p.value)).toEqual([80, 79.5]);
    expect(metricSeries(metrics, "bodyFat", 90, NOW).map((p) => p.value)).toEqual([18]);
  });

  it("reports the latest value and the change across the series", () => {
    expect(latestWithChange(metricSeries(metrics, "weight", 90, NOW))).toEqual({ latest: 79.5, change: -2.5 });
    expect(latestWithChange([])).toBeNull();
  });
});

describe("formatMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(95)).toBe("1 h 35 min");
  });
});
