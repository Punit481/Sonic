import { useUser } from "@clerk/clerk-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ActivityHeatmap, TrendLine, VolumeBars } from "../components/charts";
import { Icon, type IconName } from "../components/Icon";
import { CategoryDot, EmptyState, LinkButton, Panel, PanelHeader, Segmented, Spinner } from "../components/ui";
import { cx } from "../lib/cx";
import {
  activityGrid,
  exerciseProgress,
  exerciseSummaries,
  formatDay,
  formatMinutes,
  formatNumber,
  latestWithChange,
  metricSeries,
  sessionVolume,
  weeklyTotals,
  weekStreak,
  windowStats,
  type MetricKey,
} from "../lib/stats";
import { useUserStore } from "../stores/userStore";

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** Change against the 7 days before. */
function Delta({ now, before }: { now: number; before: number }) {
  if (before === 0) return <span className="text-faint">{now === 0 ? "Nothing logged yet" : "Nothing the week before"}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct > 0;
  if (pct === 0) return <span className="text-faint">Same as last week</span>;
  return (
    <span className={up ? "text-accent" : "text-warn"}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="text-faint">vs. last week</span>
    </span>
  );
}

function StatTile({ icon, label, value, unit, footer }: { icon: IconName; label: string; value: string; unit?: string; footer: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-muted">
        <Icon name={icon} className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="num text-3xl font-semibold">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      <div className="mt-2 text-xs">{footer}</div>
    </div>
  );
}

const METRICS: { value: MetricKey; label: string; unit: string; color: string }[] = [
  { value: "weight", label: "Weight", unit: "kg", color: "#c8ff3d" },
  { value: "bodyFat", label: "Body fat", unit: "%", color: "#9b8cff" },
  { value: "muscleMass", label: "Muscle", unit: "kg", color: "#5cc8ff" },
];

export default function OverviewPage() {
  const { user } = useUser();
  const { logs, metrics, status } = useUserStore();
  const [metric, setMetric] = useState<MetricKey>("weight");
  const exercises = useMemo(() => exerciseSummaries(logs), [logs]);
  const [chosenExercise, setChosenExercise] = useState<string | null>(null);
  const exercise = chosenExercise ?? exercises.find((e) => e.category === "strength")?.name ?? exercises[0]?.name;

  const thisWeek = useMemo(() => windowStats(logs, 7), [logs]);
  const lastWeek = useMemo(() => windowStats(logs, 7, 7), [logs]);
  const weeks = useMemo(() => weeklyTotals(logs, 8), [logs]);
  const streak = useMemo(() => weekStreak(logs), [logs]);
  const grid = useMemo(() => activityGrid(logs, 20), [logs]);
  const progress = useMemo(() => (exercise ? exerciseProgress(logs, exercise) : null), [logs, exercise]);
  const metricInfo = METRICS.find((m) => m.value === metric)!;
  const series = useMemo(() => metricSeries(metrics, metric, 90), [metrics, metric]);
  const weight = latestWithChange(metricSeries(metrics, "weight", 30));

  if (status === "loading" || status === "idle") {
    return (
      <div className="grid h-80 place-items-center text-muted">
        <Spinner />
      </div>
    );
  }

  const firstName = user?.firstName;

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <LinkButton to="/app/log" variant="primary" size="lg" icon="mic">
          Log a workout
        </LinkButton>
      </header>

      {logs.length === 0 && metrics.length === 0 ? (
        <Panel>
          <EmptyState
            icon="mic"
            title="Your training log is empty"
            action={
              <LinkButton to="/app/log" variant="primary" icon="mic">
                Log your first workout
              </LinkButton>
            }
          >
            Say something like "Squats, 4 sets of 6 at 80 kilos, then 20 minutes on the bike" and Sonic does the rest.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatTile
              icon="dumbbell"
              label="Volume · 7 days"
              value={formatNumber(thisWeek.volume)}
              unit="kg"
              footer={<Delta now={thisWeek.volume} before={lastWeek.volume} />}
            />
            <StatTile
              icon="flame"
              label="Workouts · 7 days"
              value={String(thisWeek.sessions)}
              footer={
                <span className="text-faint">
                  {streak > 0 ? `${streak}-week streak` : "Start a streak this week"}
                </span>
              }
            />
            <StatTile
              icon="pulse"
              label="Cardio · 7 days"
              value={formatMinutes(thisWeek.cardioMinutes).replace(/ min$/, "")}
              unit={thisWeek.cardioMinutes < 60 ? "min" : undefined}
              footer={<Delta now={thisWeek.cardioMinutes} before={lastWeek.cardioMinutes} />}
            />
            <StatTile
              icon="scale"
              label="Body weight"
              value={weight ? formatNumber(weight.latest, 1) : "—"}
              unit={weight ? "kg" : undefined}
              footer={
                weight?.change != null ? (
                  <span className="text-faint">
                    <span className="text-ink/80">
                      {weight.change > 0 ? "+" : ""}
                      {formatNumber(weight.change, 1)} kg
                    </span>{" "}
                    in 30 days
                  </span>
                ) : (
                  <span className="text-faint">Say "I weigh 80 kilos"</span>
                )
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <PanelHeader title="Weekly volume" hint="Total kilograms lifted, last 8 weeks" />
              <VolumeBars data={weeks} />
            </Panel>
            <Panel className="lg:col-span-2">
              <PanelHeader title="Recent workouts" action={<Link to="/app/history" className="text-sm text-muted hover:text-ink">See all</Link>} />
              <ul className="-mx-2 space-y-1">
                {logs.slice(0, 5).map((log) => (
                  <li key={log.id}>
                    <Link to={`/app/history#${log.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-raised">
                      <div className="flex -space-x-0.5">
                        {[...new Set(log.exercises.map((e) => e.category))].map((c) => (
                          <CategoryDot key={c} category={c} />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{log.exercises.map((e) => e.name).join(", ")}</div>
                        <div className="text-xs text-muted">{formatDay(log.date)}</div>
                      </div>
                      {sessionVolume(log) > 0 && (
                        <span className="num text-sm text-muted">{formatNumber(sessionVolume(log))} kg</span>
                      )}
                    </Link>
                  </li>
                ))}
                {logs.length === 0 && <li className="px-2 py-6 text-sm text-muted">No workouts yet.</li>}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Exercise progress"
                hint={progress ? `${progress.label} per session (${progress.unit})` : "Log a few sessions to see a trend"}
                action={
                  exercises.length > 0 && (
                    <div className="relative">
                      <select
                        aria-label="Exercise"
                        value={exercise}
                        onChange={(e) => setChosenExercise(e.target.value)}
                        className="h-9 cursor-pointer appearance-none rounded-xl border border-line bg-raised pr-9 pl-3 text-sm outline-none focus:border-accent/60"
                      >
                        {exercises.map((e) => (
                          <option key={e.name} value={e.name}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron" className="pointer-events-none absolute top-2.5 right-3 size-4 text-muted" />
                    </div>
                  )
                }
              />
              {progress && progress.points.length > 1 ? (
                <TrendLine points={progress.points} unit={progress.unit} color="#c8ff3d" />
              ) : (
                <EmptyState icon="dumbbell" title="Not enough sessions yet">
                  Log {exercise ?? "an exercise"} at least twice to see a trend.
                </EmptyState>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Body"
                hint="Last 90 days"
                action={<Segmented label="Measurement" value={metric} options={METRICS} onChange={setMetric} />}
              />
              {series.length > 1 ? (
                <TrendLine points={series} unit={metricInfo.unit} color={metricInfo.color} />
              ) : (
                <EmptyState icon="scale" title={`No ${metricInfo.label.toLowerCase()} trend yet`}>
                  Mention it when you log, e.g. "{metric === "bodyFat" ? "body fat is 18 percent" : metric === "muscleMass" ? "muscle mass 35 kilos" : "I weigh 78 kilos"}".
                </EmptyState>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              title="Consistency"
              hint="Every workout over the last 20 weeks"
              action={
                <div className="flex items-center gap-1.5 text-xs text-faint">
                  Rest
                  {["bg-raised", "bg-accent/30", "bg-accent/60", "bg-accent"].map((c) => (
                    <span key={c} className={cx("size-3 rounded-[3px]", c)} />
                  ))}
                  Heavy
                </div>
              }
            />
            <ActivityHeatmap grid={grid} />
          </Panel>
        </>
      )}
    </div>
  );
}
