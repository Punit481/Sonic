import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityDay, ProgressPoint, WeekBucket } from "../lib/stats";
import { formatNumber } from "../lib/stats";
import { cx } from "../lib/cx";

const AXIS = { fill: "#5e5e69", fontSize: 12 };
const shortDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-sm shadow-xl">
      <div className="text-muted">{title}</div>
      <div className="num mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}

export function VolumeBars({ data, unit = "kg" }: { data: WeekBucket[]; unit?: string }) {
  const last = data.length - 1;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#26262f" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => (v >= 1000 ? `${formatNumber(v / 1000, 1)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "#1b1b22" }}
            content={({ active, payload }) => {
              const week = payload?.[0]?.payload as WeekBucket | undefined;
              return active && week ? (
                <TooltipBox
                  title={`Week of ${week.label} · ${week.sessions} session${week.sessions === 1 ? "" : "s"}`}
                  value={`${formatNumber(week.volume)} ${unit}`}
                />
              ) : null;
            }}
          />
          <Bar dataKey="volume" radius={[6, 6, 2, 2]} maxBarSize={36}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === last ? "#c8ff3d" : "#3a3a46"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLine({
  points,
  unit,
  color = "#c8ff3d",
  digits = 1,
  height = "h-56",
}: {
  points: ProgressPoint[];
  unit: string;
  color?: string;
  digits?: number;
  height?: string;
}) {
  const id = `fill-${color.slice(1)}`;
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#26262f" />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={shortDate}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[(min: number) => Math.floor(min * 0.97), (max: number) => Math.ceil(max * 1.02)]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "#5e5e69", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as ProgressPoint | undefined;
              return active && p ? (
                <TooltipBox title={shortDate(p.date)} value={`${formatNumber(p.value, digits)} ${unit}`} />
              ) : null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${id})`}
            dot={points.length < 20 ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: color, stroke: "#0a0a0d", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const LEVELS = ["bg-raised", "bg-accent/30", "bg-accent/60", "bg-accent"];
const DAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function ActivityHeatmap({ grid }: { grid: ActivityDay[][] }) {
  return (
    <div className="flex gap-2">
      <div className="hidden flex-col gap-1 pt-5 text-[10px] leading-3 text-faint sm:flex">
        {DAYS.map((d, i) => (
          <span key={i} className="h-3.5">
            {d}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex w-max gap-1">
          {grid.map((week, w) => {
            const first = week[0].date;
            const showMonth = w === 0 || first.getDate() <= 7;
            return (
              <div key={w} className="flex flex-col gap-1">
                <span className="h-4 text-[10px] whitespace-nowrap text-faint">
                  {showMonth ? first.toLocaleDateString("en-US", { month: "short" }) : ""}
                </span>
                {week.map((day) => (
                  <span
                    key={day.key}
                    title={
                      day.future
                        ? undefined
                        : `${day.date.toDateString()}: ${day.sessions ? `${day.sessions} workout${day.sessions > 1 ? "s" : ""}` : "rest"}`
                    }
                    className={cx("size-3.5 rounded-[4px]", day.future ? "bg-transparent" : LEVELS[day.level])}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
