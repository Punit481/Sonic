import type { Metric, WorkoutLog } from "../stores/types";
import type { ChartDataPoint } from "../components/charts/InteractiveContinuousChart";

export const filterByTimeRange = <T extends { date: string | Date }>(
  data: T[],
  timeRange: "week" | "month" | "year" | "custom",
  customRange?: { start: Date; end: Date }
): T[] => {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      if (!customRange)
        throw new Error("Custom range required for custom timeRange");
      startDate = customRange.start;
      break;
    default:
      throw new Error("Invalid time range");
  }

  const endDate = timeRange === "custom" && customRange ? customRange.end : now;

  return data.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= startDate && itemDate <= endDate;
  });
};

// Transform metrics data for charting (weight vs date, bodyFat vs date, etc.)
export const transformMetricsForChart = (
  metrics: Metric[],
  xParam: keyof Metric,
  yParam: keyof Metric,
  timeRange: "week" | "month" | "year" | "custom",
  customRange?: { start: Date; end: Date }
): ChartDataPoint[] => {
  // Filter by time range
  const filteredMetrics = filterByTimeRange(metrics, timeRange, customRange);

  // Filter out entries where either parameter is null/undefined
  const validMetrics = filteredMetrics.filter(
    (metric) =>
      metric[xParam] !== null &&
      metric[xParam] !== undefined &&
      metric[yParam] !== null &&
      metric[yParam] !== undefined
  );

  // Transform to chart format
  return validMetrics
    .map((metric) => {
      const chartPoint: ChartDataPoint = {};

      // Handle date fields specially
      if (xParam === "date") {
        chartPoint[xParam] = new Date(
          metric[xParam] as string | Date
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        chartPoint[xParam] = metric[xParam] as string | number;
      }

      chartPoint[yParam] = metric[yParam] as string | number;

      // Add all other fields for tooltip
      Object.keys(metric).forEach((key) => {
        if (key !== xParam && key !== yParam) {
          chartPoint[key] = metric[key as keyof Metric] as string | number;
        }
      });

      chartPoint.sortDate = new Date(metric.date).getTime();
      return chartPoint;
    })
    .sort((a, b) => (a.sortDate as number) - (b.sortDate as number))
    .map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sortDate, ...rest } = item;
      return rest;
    });
};

export const transformLogsForChart = (
  logs: WorkoutLog[],
  xParam: keyof WorkoutLog,
  exerciseName: string,
  metricType: "weight" | "duration" | "reps" = "weight",
  timeRange: "week" | "month" | "year" | "custom",
  customRange?: { start: Date; end: Date }
): ChartDataPoint[] => {
  const filteredLogs = filterByTimeRange(logs, timeRange, customRange);

  const validLogs = filteredLogs.filter(
    (log) => log[xParam] !== null && log[xParam] !== undefined
  );

  // Transform logs to chart data points
  return validLogs
    .map((log) => {
      // Find the specific exercise in this workout session
      const exercise = log.exercises.find(
        (ex) => ex.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (!exercise || !exercise.sets || exercise.sets.length === 0) {
        return null; // Skip if exercise not found or no sets
      }

      const chartPoint: ChartDataPoint = {};

      // Handle date fields specially for x-axis
      if (xParam === "date") {
        chartPoint[xParam] = new Date(
          log[xParam] as string | Date
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        chartPoint[xParam] = log[xParam] as string | number;
      }

      // Calculate the metric value from exercise sets
      let metricValue: number = 0;

      switch (metricType) {
        case "weight":
          // Get the maximum weight used in any set
          metricValue = Math.max(
            ...exercise.sets
              .filter((set) => set.weight !== null && set.weight !== undefined)
              .map((set) => set.weight as number)
          );
          break;
        case "duration":
          // Sum total duration across all sets
          metricValue = exercise.sets
            .filter(
              (set) => set.duration !== null && set.duration !== undefined
            )
            .reduce((sum, set) => sum + (set.duration as number), 0);
          break;
        case "reps":
          // Get the maximum reps in any set
          metricValue = Math.max(
            ...exercise.sets
              .filter((set) => set.reps !== null && set.reps !== undefined)
              .map((set) => set.reps as number)
          );
          break;
        default:
          metricValue = 0;
      }

      // Skip if no valid metric value found
      if (!isFinite(metricValue) || metricValue === 0) {
        return null;
      }

      chartPoint[metricType] = metricValue;

      // Add additional fields for tooltip
      chartPoint.exerciseName = exercise.name;
      chartPoint.category = exercise.category;
      chartPoint.totalSets = exercise.sets.length;

      // Calculate total volume if weight and reps are available
      const totalVolume = exercise.sets
        .filter((set) => set.weight && set.reps)
        .reduce(
          (sum, set) => sum + (set.weight as number) * (set.reps as number),
          0
        );

      if (totalVolume > 0) {
        chartPoint.totalVolume = totalVolume;
      }

      chartPoint.sortDate = new Date(log.date).getTime();
      return chartPoint;
    })
    .filter((point): point is ChartDataPoint => point !== null) // Remove null entries
    .sort((a, b) => (a.sortDate as number) - (b.sortDate as number))
    .map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sortDate, ...rest } = item;
      return rest;
    });
};
