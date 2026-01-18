import { useGenericChart, type UseGenericChartParams } from "./useGenericChart";
import type {
  ChartDataPoint,
  ChartConfig,
} from "../components/charts/InteractiveContinuousChart";

interface UseExerciseChartReturn {
  data: ChartDataPoint[];
  config: ChartConfig;
  hasData: boolean;
}

export const useExerciseChart = (
  exerciseName: string,
  metricType: "weight" | "duration" | "reps" = "weight",
  timeRange: UseGenericChartParams["timeRange"]
): UseExerciseChartReturn => {
  const metricLabel =
    metricType === "weight"
      ? "Weight (kg)"
      : metricType === "duration"
      ? "Duration (hrs)"
      : "Reps";

  return useGenericChart({
    dataSource: "logs",
    xParam: "date",
    exerciseName: exerciseName,
    metricType: metricType,
    timeRange: timeRange,
    chartTitle: `${exerciseName}`,
    yAxisLabel: metricLabel,
    lineColor: "#7f5af0",
    lineName: `${exerciseName} ${metricType}`,
  });
};
