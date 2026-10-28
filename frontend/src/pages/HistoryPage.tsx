import { useAuth } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Icon } from "../components/Icon";
import Records from "../components/Records";
import { Banner, Button, CategoryDot, EmptyState, LinkButton, Panel, Segmented, Spinner } from "../components/ui";
import WorkoutEditor from "../components/WorkoutEditor";
import {
  deleteBodyMetric,
  deleteWorkout,
  downloadExport,
  errorMessage,
  updateWorkout,
  type DraftWorkout,
  type PersonalRecord,
  type WeightUnit,
} from "../lib/api";
import { cx } from "../lib/cx";
import { displayWeight } from "../lib/units";
import { workoutToDraft } from "../lib/drafts";
import {
  describeSets,
  exerciseSummaries,
  formatDay,
  formatMinutes,
  formatNumber,
  formatWeight,
  sessionCardioMinutes,
  sessionVolume,
} from "../lib/stats";
import type { Metric, WorkoutLog } from "../stores/types";
import { useUserStore } from "../stores/userStore";

const monthOf = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" });

function groupByMonth<T extends { date: string | Date }>(items: T[]) {
  const groups: { month: string; items: T[] }[] = [];
  for (const item of items) {
    const month = monthOf(item.date);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

/** Trash button that asks once before deleting. */
function DeleteButton({ onConfirm, label }: { onConfirm: () => Promise<void>; label: string }) {
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");
  useEffect(() => {
    if (state !== "confirm") return;
    const t = window.setTimeout(() => setState("idle"), 4000);
    return () => window.clearTimeout(t);
  }, [state]);

  if (state === "idle") {
    return (
      <button
        onClick={() => setState("confirm")}
        aria-label={label}
        className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-danger"
      >
        <Icon name="trash" className="size-4" />
      </button>
    );
  }
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={state === "deleting"}
      onClick={async () => {
        setState("deleting");
        try {
          await onConfirm();
        } finally {
          setState("idle");
        }
      }}
    >
      {state === "deleting" ? <Spinner className="size-3.5" /> : "Delete?"}
    </Button>
  );
}

interface CardProps {
  log: WorkoutLog;
  unit: WeightUnit;
  highlighted: boolean;
  exerciseNames: string[];
  onDelete: () => Promise<void>;
  onSave: (workout: DraftWorkout) => Promise<PersonalRecord[]>;
}

function WorkoutCard({ log, unit, highlighted, exerciseNames, onDelete, onSave }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const volume = sessionVolume(log);
  const cardio = sessionCardioMinutes(log);

  return (
    <article
      id={log.id}
      className={cx("panel scroll-mt-24 p-5 transition-colors", (highlighted || editing) && "border-accent/50")}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">{formatDay(log.date)}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {[
              `${log.exercises.length} exercise${log.exercises.length === 1 ? "" : "s"}`,
              volume > 0 && `${formatWeight(volume, unit, 0)} volume`,
              cardio > 0 && `${formatMinutes(cardio)} cardio`,
              log.duration && `${formatMinutes(log.duration * 60)} total`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditing(true);
                setRecords([]);
              }}
              aria-label="Edit workout"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-ink"
            >
              <Icon name="edit" className="size-4" />
            </button>
            <DeleteButton label="Delete workout" onConfirm={onDelete} />
          </div>
        )}
      </header>

      {editing ? (
        <div className="mt-4">
          <WorkoutEditor
            workout={workoutToDraft(log)}
            unit={unit}
            exerciseNames={exerciseNames}
            saveLabel="Save changes"
            saving={saving}
            error={error}
            onCancel={() => {
              setEditing(false);
              setError(null);
            }}
            onSave={async ({ workout }) => {
              if (!workout) {
                setError("A workout needs at least one exercise. To remove it, delete the workout instead.");
                return;
              }
              setSaving(true);
              setError(null);
              try {
                setRecords(await onSave(workout));
                setEditing(false);
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setSaving(false);
              }
            }}
          />
        </div>
      ) : (
        <>
          {records.length > 0 && (
            <div className="mt-4">
              <Records records={records} unit={unit} />
            </div>
          )}
          {log.note && <p className="mt-3 text-sm text-ink/80 italic">"{log.note}"</p>}
          <ul className="mt-4 space-y-2.5">
            {log.exercises.map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span className="mt-[7px]">
                  <CategoryDot category={e.category} />
                </span>
                <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-3">
                  <Link
                    to={`/app/exercises/${encodeURIComponent(e.name)}`}
                    className="font-medium hover:text-accent sm:w-48 sm:shrink-0"
                  >
                    {e.name}
                  </Link>
                  <span className="block text-sm text-muted">{describeSets(e.sets, unit).join(" · ")}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function MetricRow({ metric, unit, onDelete }: { metric: Metric; unit: WeightUnit; onDelete: () => Promise<void> }) {
  const cell = (value: number | null | undefined, suffix: string) =>
    value != null ? (
      <span className="num">
        {formatNumber(suffix === "%" ? value : displayWeight(value, unit), 1)}
        <span className="ml-0.5 text-xs text-muted">{suffix === "%" ? "%" : unit}</span>
      </span>
    ) : (
      <span className="text-faint">—</span>
    );
  return (
    <tr className="border-t border-line">
      <td className="py-3 pr-4 text-sm">{formatDay(metric.date)}</td>
      <td className="py-3 pr-4 text-right">{cell(metric.weight, "kg")}</td>
      <td className="py-3 pr-4 text-right">{cell(metric.bodyFat, "%")}</td>
      <td className="py-3 pr-4 text-right">{cell(metric.muscleMass, "kg")}</td>
      <td className="w-10 py-2 text-right">
        <DeleteButton label="Delete measurement" onConfirm={onDelete} />
      </td>
    </tr>
  );
}

export default function HistoryPage() {
  const { getToken } = useAuth();
  const { logs, metrics, status, removeLog, removeMetric, replaceLog, weightUnit } = useUserStore();
  const exerciseNames = useMemo(() => exerciseSummaries(logs).map((e) => e.name), [logs]);
  const [tab, setTab] = useState<"workouts" | "body">("workouts");
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { hash } = useLocation();
  const target = hash.slice(1);

  const workoutGroups = useMemo(() => groupByMonth(logs), [logs]);

  useEffect(() => {
    if (target && status === "ready") document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [target, status]);

  const remove = (fn: () => Promise<void>) => async () => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">History</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Everything you've logged</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon="download"
            disabled={exporting || (tab === "workouts" ? logs.length === 0 : metrics.length === 0)}
            onClick={async () => {
              setExporting(true);
              setError(null);
              try {
                await downloadExport(await getToken(), tab === "workouts" ? "workouts" : "body-metrics");
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Segmented
            label="History type"
            value={tab}
            onChange={setTab}
            options={[
              { value: "workouts", label: `Workouts · ${logs.length}` },
              { value: "body", label: `Body · ${metrics.length}` },
            ]}
          />
        </div>
      </header>

      {error && <Banner onDismiss={() => setError(null)}>{error}</Banner>}

      {status !== "ready" && status !== "error" ? (
        <div className="grid h-60 place-items-center text-muted">
          <Spinner />
        </div>
      ) : tab === "workouts" ? (
        logs.length === 0 ? (
          <Panel>
            <EmptyState
              icon="list"
              title="No workouts yet"
              action={
                <LinkButton to="/app/log" variant="primary" icon="mic">
                  Log a workout
                </LinkButton>
              }
            >
              Workouts you log by voice show up here, newest first.
            </EmptyState>
          </Panel>
        ) : (
          <div className="space-y-8">
            {workoutGroups.map((group) => (
              <section key={group.month}>
                <h2 className="eyebrow mb-3">
                  {group.month} · {group.items.length} workout{group.items.length === 1 ? "" : "s"}
                </h2>
                <div className="space-y-3">
                  {group.items.map((log) => (
                    <WorkoutCard
                      key={log.id}
                      log={log}
                      unit={weightUnit}
                      exerciseNames={exerciseNames}
                      highlighted={log.id === target}
                      onDelete={remove(async () => {
                        await deleteWorkout(await getToken(), log.id);
                        removeLog(log.id);
                      })}
                      onSave={async (workout) => {
                        const saved = await updateWorkout(await getToken(), log.id, workout);
                        replaceLog(saved.workout);
                        return saved.records;
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
            {logs.length >= 100 && (
              <p className="text-center text-sm text-faint">Showing your latest 100 workouts.</p>
            )}
          </div>
        )
      ) : metrics.length === 0 ? (
        <Panel>
          <EmptyState icon="scale" title="No measurements yet">
            Say "I weigh 78 kilos" or "body fat 17 percent" on the Log page to start tracking.
          </EmptyState>
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pr-4 pb-3 font-medium">Date</th>
                <th className="pr-4 pb-3 text-right font-medium">Weight</th>
                <th className="pr-4 pb-3 text-right font-medium">Body fat</th>
                <th className="pr-4 pb-3 text-right font-medium">Muscle</th>
                <th className="pb-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <MetricRow
                  key={m.id}
                  metric={m}
                  unit={weightUnit}
                  onDelete={remove(async () => {
                    await deleteBodyMetric(await getToken(), m.id);
                    removeMetric(m.id);
                  })}
                />
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
