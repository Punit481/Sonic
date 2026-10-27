import { describe, expect, it } from "vitest";
import { recentDistinctWorkouts } from "../drafts";
import { displayWeight, fromKg, toKg } from "../units";
import type { WorkoutLog } from "../../stores/types";

describe("units", () => {
  it("round-trips through pounds", () => {
    expect(toKg(fromKg(100, "lb"), "lb")).toBeCloseTo(100, 9);
    expect(fromKg(100, "kg")).toBe(100);
  });

  it("rounds to what people use: 0.1 kg, 0.5 lb", () => {
    expect(displayWeight(80, "lb")).toBe(176.5);
    expect(displayWeight(82.46, "kg")).toBe(82.5);
  });
});

describe("recentDistinctWorkouts", () => {
  const log = (id: string, ...names: string[]): WorkoutLog => ({
    id,
    date: "2026-10-20T10:00:00Z",
    createdAt: "2026-10-20T10:00:00Z",
    exercises: names.map((name) => ({ id: name, name, category: "strength", aiTagged: false, sets: [] })),
  });

  it("skips workouts with the same exercises, in any order", () => {
    const logs = [log("1", "Bench", "Row"), log("2", "row", "bench"), log("3", "Squat"), log("4", "Run")];
    expect(recentDistinctWorkouts(logs, 3).map((l) => l.id)).toEqual(["1", "3", "4"]);
  });
});
