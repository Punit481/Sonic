import { describe, it, expect } from "vitest";
import { filterByTimeRange, transformMetricsForChart } from "../charts";
import type { Metric } from "../../stores/types";

describe("Charts Utils", () => {
  const now = new Date("2025-11-04T12:00:00Z");
  const mockMetrics: Metric[] = [
    {
      id: "1",
      date: new Date("2025-11-01T12:00:00Z"), // 3 days ago
      weight: 180,
      bodyFat: 15,
      muscleMass: 153,
    },
    {
      id: "2",
      date: new Date("2025-10-28T12:00:00Z"), // 7 days ago
      weight: 181,
      bodyFat: 15.5,
      muscleMass: 152,
    },
    {
      id: "3",
      date: new Date("2025-10-15T12:00:00Z"), // 20 days ago
      weight: 183,
      bodyFat: 16,
      muscleMass: 151,
    },
  ];

  describe("filterByTimeRange", () => {
    it("should filter data by week", () => {
      // Mock current time
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const testData = [
        { id: "1", date: now },
        { id: "2", date: weekAgo },
        { id: "3", date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
      ];

      const result = filterByTimeRange(testData, "week");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter data by month", () => {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const testData = [
        { id: "1", date: now },
        { id: "2", date: firstOfMonth },
        { id: "3", date: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
      ];

      const result = filterByTimeRange(testData, "month");
      expect(result).toHaveLength(2);
    });

    it("should filter data by year", () => {
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      const testData = [
        { id: "1", date: now },
        { id: "2", date: firstOfYear },
        { id: "3", date: new Date(now.getFullYear() - 1, 11, 31) },
      ];

      const result = filterByTimeRange(testData, "year");
      expect(result).toHaveLength(2);
    });

    it("should filter data by custom range", () => {
      const customRange = {
        start: new Date("2025-10-25T00:00:00Z"),
        end: new Date("2025-11-02T23:59:59Z"),
      };

      const result = filterByTimeRange(mockMetrics, "custom", customRange);
      expect(result).toHaveLength(2); // Should include Oct 28 and Nov 1
    });

    it("should throw error for custom range without customRange param", () => {
      expect(() => {
        filterByTimeRange(mockMetrics, "custom");
      }).toThrow("Custom range required for custom timeRange");
    });
  });

  describe("transformMetricsForChart", () => {
    it("should transform metrics data for chart", () => {
      const result = transformMetricsForChart(
        mockMetrics,
        "date",
        "weight",
        "year"
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("weight");
      expect(result[0].weight).toBe(183); // First in the filtered list
    });

    it("should filter out entries with null values", () => {
      const metricsWithNull: Metric[] = [
        {
          id: "1",
          date: new Date("2025-11-01T12:00:00Z"),
          weight: 180,
        },
        {
          id: "2",
          date: new Date("2025-10-28T12:00:00Z"),
          weight: undefined, // Should be filtered out
        },
      ];

      const result = transformMetricsForChart(
        metricsWithNull,
        "date",
        "weight",
        "year"
      );

      expect(result).toHaveLength(1);
    });

    it("should handle empty data", () => {
      const result = transformMetricsForChart([], "date", "weight", "week");
      expect(result).toHaveLength(0);
    });
  });
});
