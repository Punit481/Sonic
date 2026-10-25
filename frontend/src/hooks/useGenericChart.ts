import { useMemo } from "react";
import { useUserStore } from "../stores/userStore";
import { transformLogsForChart, transformMetricsForChart } from "../lib/charts";
import type {
  ChartDataPoint,
  ChartConfig,
} from "../components/charts/InteractiveContinuousChart";
import type { Metric, WorkoutLog } from "../stores/types";

export interface UseGenericChartParams {
  dataSource: "metrics" | "logs";
  xParam: keyof Metric | keyof WorkoutLog;
  yParam?: keyof Metric; // Optional for logs
  exerciseName?: string; // For logs data source
  metricType?: "weight" | "duration" | "reps"; // For logs data source
  timeRange: "week" | "month" | "year" | "custom";
  customRange?: { start: Date; end: Date };
  chartTitle: string;
  yAxisLabel: string;
  lineColor?: string;
  lineName: string;
  yAxisDomain?: [string | number, string | number]; // Custom Y-axis range
}

interface UseGenericChartReturn {
  data: ChartDataPoint[];
  config: ChartConfig;
  hasData: boolean;
}

export const useGenericChart = (
  params: UseGenericChartParams
): UseGenericChartReturn => {
  const { metrics, logs } = useUserStore();

  const chartData = useMemo(() => {
    if (params.dataSource === "metrics") {
      if (!params.yParam) {
        throw new Error("yParam is required for metrics data source");
      }
      return transformMetricsForChart(
        metrics,
        params.xParam as keyof Metric,
        params.yParam,
        params.timeRange,
        params.customRange
      );
    } else if (params.dataSource === "logs") {
      if (!params.exerciseName) {
        throw new Error("exerciseName is required for logs data source");
      }
      return transformLogsForChart(
        logs,
        params.xParam as keyof WorkoutLog,
        params.exerciseName,
        params.metricType || "weight",
        params.timeRange,
        params.customRange
      );
    }
    return [];
  }, [metrics, params, logs]);

  const config: ChartConfig = useMemo(
    () => ({
      title: params.chartTitle,
      xAxisKey: params.xParam as string,
      yAxisKey:
        params.dataSource === "metrics"
          ? (params.yParam as string)
          : params.metricType || "weight",
      yAxisLabel: params.yAxisLabel,
      lineColor: params.lineColor || "#7f5af0",
      lineName: params.lineName,
      yAxisDomain: params.yAxisDomain,
    }),
    [params]
  );

  return {
    data: chartData,
    config,
    hasData: chartData.length > 0,
  };
};
