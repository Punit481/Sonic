import { useGenericChart, type UseGenericChartParams } from "./useGenericChart";
import type {
  ChartDataPoint,
  ChartConfig,
} from "../components/charts/InteractiveContinuousChart";
import type { Metric } from "../stores/types";

interface useMetricChartReturn {
  data: ChartDataPoint[];
  config: ChartConfig;
  hasData: boolean;
}

export const useMetricChart = (
  yParam: keyof Metric,
  timeRange: UseGenericChartParams["timeRange"]
): useMetricChartReturn => {
  return useGenericChart({
    dataSource: "metrics",
    xParam: "date",
    yParam: yParam,
    timeRange: timeRange,
    chartTitle: `${yParam.charAt(0).toUpperCase() + yParam.slice(1)} Progress`,
    yAxisLabel: `${yParam.charAt(0).toUpperCase() + yParam.slice(1)}`,
    lineColor: "#7f5af0",
    lineName: yParam.charAt(0).toUpperCase() + yParam.slice(1),
  });
};
