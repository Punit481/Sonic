import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ChartDataPoint {
  [key: string]: string | number; // Flexible data structure
}

export interface ChartConfig {
  title: string;
  xAxisKey: string; // Which field to use for X-axis (e.g., "date")
  yAxisKey: string; // Which field to use for Y-axis (e.g., "volume", "weight")
  yAxisLabel: string; // Label for Y-axis (e.g., "Volume (kg)", "Weight (kg)")
  lineColor?: string; // Color of the line (optional)
  lineName: string; // Name shown in legend (e.g., "Bench Press Volume")
  yAxisDomain?: [string | number, string | number]; // Custom Y-axis range (optional)
}

interface InteractiveContinuousChartProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  tooltipFields?: string[]; // Optional: specific fields to show in tooltip
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

function InteractiveContinuousChart({
  data,
  config,
  tooltipFields,
}: InteractiveContinuousChartProps) {
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;

      return (
        <div className="bg-white p-3 border border-black-200 rounded-lg shadow-lg">
          <p className="font-semibold text-black-900">{`${config.xAxisKey}: ${label}`}</p>
          <p className="text-primary-600 font-medium">
            {`${config.yAxisLabel}: ${
              dataPoint[config.yAxisKey]?.toLocaleString?.() ||
              dataPoint[config.yAxisKey]
            }`}
          </p>

          {/* Show additional tooltip fields if specified */}
          {tooltipFields?.map((field) =>
            dataPoint[field] !== undefined &&
            field !== config.xAxisKey &&
            field !== config.yAxisKey ? (
              <p key={field} className="text-black-700 text-sm">
                {`${field}: ${dataPoint[field]}`}
              </p>
            ) : null
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-90 card py-8 px-2 md-lg:flex-1 3xl:flex-none">
      <h3 className="text-lg font-semibold text-center mb-4 text-black-900">
        {config.title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey={config.xAxisKey}
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
            domain={config.yAxisDomain || ["dataMin - 5", "dataMax + 5"]}
            label={{
              value: config.yAxisLabel,
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={config.yAxisKey}
            stroke={config.lineColor || "#7f5af0"}
            strokeWidth={3}
            dot={{ fill: config.lineColor || "#7f5af0", strokeWidth: 2, r: 5 }}
            activeDot={{
              r: 7,
              stroke: config.lineColor || "#7f5af0",
              strokeWidth: 2,
            }}
            name={config.lineName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default InteractiveContinuousChart;
