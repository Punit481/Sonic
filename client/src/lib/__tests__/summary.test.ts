import { describe, it, expect, beforeEach } from "vitest";
import { getVolume, getCardioDuration, getSessionCount } from "../summary";
import type { WorkoutLog } from "../../stores/types";

describe("Summary Utils", () => {
  let mockLogs: WorkoutLog[];

  beforeEach(() => {
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);

    mockLogs = [
      {
        id: "1",
        userId: "user1",
        date: threeDaysAgo,
        duration: 60,
        note: "Chest day",
        createdAt: threeDaysAgo,
        exercises: [
          {
            id: "e1",
            name: "Bench Press",
            category: "strength",
            isCustom: false,
            aiTagged: true,
            sets: [
              { id: "s1", reps: 10, weight: 100 },
              { id: "s2", reps: 8, weight: 110 },
            ],
          },
        ],
      },
      {
        id: "2",
        userId: "user1",
        date: fiveDaysAgo,
        duration: 45,
        note: "Cardio session",
        createdAt: fiveDaysAgo,
        exercises: [
          {
            id: "e2",
            name: "Running",
            category: "cardio",
            isCustom: false,
            aiTagged: true,
            sets: [{ id: "s3", duration: 30, distance: 5 }],
          },
        ],
      },
      {
        id: "3",
        userId: "user1",
        date: tenDaysAgo,
        duration: 50,
        note: "Legs day",
        createdAt: tenDaysAgo,
        exercises: [
          {
            id: "e3",
            name: "Squats",
            category: "strength",
            isCustom: false,
            aiTagged: true,
            sets: [{ id: "s4", reps: 12, weight: 150 }],
          },
        ],
      },
    ];
  });

  describe("getVolume", () => {
    it("should calculate total volume for workouts within time range", () => {
      // Last 7 days: should include logs from 3 and 5 days ago
      // Volume = (10*100 + 8*110) = 1000 + 880 = 1880
      const volume = getVolume(mockLogs, 7);
      expect(volume).toBe(1880);
    });

    it("should exclude workouts outside time range", () => {
      // Last 4 days: should only include log from 3 days ago
      // Volume = (10*100 + 8*110) = 1880
      const volume = getVolume(mockLogs, 4);
      expect(volume).toBe(1880);
    });

    it("should return 0 for empty logs", () => {
      const volume = getVolume([], 7);
      expect(volume).toBe(0);
    });

    it("should ignore sets without weight or reps", () => {
      const logsWithIncomplete: WorkoutLog[] = [
        {
          id: "4",
          userId: "user1",
          date: new Date(),
          duration: 30,
          note: "Test",
          createdAt: new Date(),
          exercises: [
            {
              id: "e4",
              name: "Test",
              category: "strength",
              isCustom: false,
              aiTagged: false,
              sets: [
                { id: "s5", reps: 10 }, // weight missing
                { id: "s6", weight: 100 }, // reps missing
              ],
            },
          ],
        },
      ];
      const volume = getVolume(logsWithIncomplete, 7);
      expect(volume).toBe(0);
    });
  });

  describe("getCardioDuration", () => {
    it("should calculate total cardio duration within time range", () => {
      // Last 7 days: cardio from 5 days ago has 30 min duration
      const duration = getCardioDuration(mockLogs, 7);
      expect(duration).toBe(30);
    });

    it('should only count exercises with category "cardio"', () => {
      // Even with 7 days, strength exercises shouldn't be counted
      const duration = getCardioDuration(mockLogs, 7);
      expect(duration).toBe(30); // Only the running session
    });

    it("should return 0 when no cardio exercises exist", () => {
      const strengthOnly = mockLogs.filter((log) =>
        log.exercises.some((ex) => ex.category === "strength")
      );
      const duration = getCardioDuration(strengthOnly, 7);
      expect(duration).toBe(0);
    });

    it("should return 0 for empty logs", () => {
      const duration = getCardioDuration([], 7);
      expect(duration).toBe(0);
    });
  });

  describe("getSessionCount", () => {
    it("should count sessions within time range", () => {
      // Last 7 days: logs from 3 and 5 days ago = 2 sessions
      const count = getSessionCount(mockLogs, 7);
      expect(count).toBe(2);
    });

    it("should exclude sessions outside time range", () => {
      // Last 4 days: only log from 3 days ago = 1 session
      const count = getSessionCount(mockLogs, 4);
      expect(count).toBe(1);
    });

    it("should return 0 for empty logs", () => {
      const count = getSessionCount([], 7);
      expect(count).toBe(0);
    });

    it("should count all sessions within longer time range", () => {
      // Last 30 days: all 3 logs
      const count = getSessionCount(mockLogs, 30);
      expect(count).toBe(3);
    });
  });
});
