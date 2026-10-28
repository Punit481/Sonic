import { useState } from "react";
import type { ExerciseStats, Goal, GoalType, WeightUnit } from "../lib/api";
import { cx } from "../lib/cx";
import { dayKey } from "../lib/stats";
import { formatDate, GOAL_TYPES, goalTitle, goalValue, relativeDays, STATUS } from "../lib/goals";
import { toKg } from "../lib/units";
import { Icon } from "./Icon";
import { Banner, Button, Spinner } from "./ui";

export function ProgressBar({ percent, done, compact = false }: { percent: number; done: boolean; compact?: boolean }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent * 100)}
      className={cx("overflow-hidden rounded-full bg-raised", compact ? "h-1.5" : "h-2.5")}
    >
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", done ? "bg-accent" : "bg-accent/70")}
        style={{ width: `${Math.max(percent > 0 ? 3 : 0, percent * 100)}%` }}
      />
    </div>
  );
}

export function StatusPill({ goal }: { goal: Goal }) {
  const s = STATUS[goal.status];
  return <span className={cx("rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", s.tone)}>{s.label}</span>;
}

/** Where a goal stands, in a sentence: deadline, projection or streak. */
function GoalFootnote({ goal }: { goal: Goal }) {
  if (goal.type === "weekly_workouts") {
    const streak = goal.streakWeeks ?? 0;
    return <>{streak > 0 ? `🔥 ${streak}-week streak` : "Hit it this week to start a streak"}</>;
  }
  if (goal.achievedAt) return <>Reached {formatDate(dayKey(goal.achievedAt))}</>;
  const parts: string[] = [];
  if (goal.deadline) parts.push(`Deadline ${formatDate(goal.deadline)} (${relativeDays(goal.deadline)})`);
  if (goal.projectedDate) parts.push(`At your current pace: ${formatDate(goal.projectedDate)}`);
  else if (goal.current != null) parts.push("Log a few more sessions for a pace estimate");
  return <>{parts.join(" · ") || "No data yet"}</>;
}

export function GoalCard({ goal, unit, onDelete }: { goal: Goal; unit: WeightUnit; onDelete?: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const done = goal.status === "achieved" || goal.status === "met";
  return (
    <article className={cx("panel p-5", goal.status === "achieved" && "border-accent/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">
            {goal.status === "achieved" && "🎯 "}
            {goalTitle(goal, unit)}
          </h3>
          <div className="mt-1">
            <StatusPill goal={goal} />
          </div>
        </div>
        {onDelete &&
          (confirming ? (
            <Button
              size="sm"
              variant="danger"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                  setConfirming(false);
                }
              }}
            >
              {deleting ? <Spinner className="size-3.5" /> : "Remove?"}
            </Button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              aria-label="Remove goal"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
            >
              <Icon name="trash" className="size-4" />
            </button>
          ))}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 text-sm">
        <div>
          <div className="text-xs text-faint">{goal.type === "weekly_workouts" ? "This week" : "Now"}</div>
          <div className="num text-2xl font-semibold">{goalValue(goal.type, goal.current, unit)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-faint">Target</div>
          <div className="num font-medium text-muted">{goalValue(goal.type, goal.target, unit)}</div>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar percent={goal.percent} done={done} />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-xs text-faint">
        <span>
          <GoalFootnote goal={goal} />
        </span>
        {goal.startValue != null && goal.type !== "weekly_workouts" && (
          <span className="shrink-0">Started at {goalValue(goal.type, goal.startValue, unit)}</span>
        )}
      </div>
    </article>
  );
}

/** Celebrates goals a just-saved workout or weigh-in reached. */
export function GoalsReached({ goals, unit }: { goals: Goal[]; unit: WeightUnit }) {
  if (goals.length === 0) return null;
  return (
    <div className="rounded-xl border border-accent/40 bg-gradient-to-br from-accent/15 to-transparent p-4">
      <div className="flex items-center gap-2 font-display font-semibold text-accent">
        <span aria-hidden="true">🎯</span>
        {goals.length === 1 ? "Goal reached!" : `${goals.length} goals reached!`}
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {goals.map((g) => (
          <li key={g.id} className="font-medium">
            {goalTitle(g, unit)}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FormProps {
  unit: WeightUnit;
  exercises: ExerciseStats[];
  initialType?: GoalType;
  initialExercise?: string;
  saving: boolean;
  error: string | null;
  onSave: (goal: { type: GoalType; exercise: string | null; target: number; deadline: string | null }) => void;
  onCancel: () => void;
}

export function GoalForm({ unit, exercises, initialType, initialExercise, saving, error, onSave, onCancel }: FormProps) {
  const [type, setType] = useState<GoalType>(initialType ?? "lift_weight");
  const [exercise, setExercise] = useState(initialExercise ?? "");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const needsExercise = type === "lift_weight" || type === "exercise_reps";
  const choices = exercises.filter((e) => (type === "exercise_reps" ? e.bestReps : e.bestWeight));
  const chosen = exercises.find((e) => e.name.toLowerCase() === exercise.trim().toLowerCase());
  const suffix = type === "exercise_reps" ? "reps" : type === "weekly_workouts" ? "per week" : unit;
  const currentHint =
    type === "lift_weight" && chosen?.bestWeight
      ? `Your best: ${goalValue("lift_weight", chosen.bestWeight, unit)}`
      : type === "exercise_reps" && chosen?.bestReps
        ? `Your best: ${chosen.bestReps} reps`
        : null;

  const submit = () => {
    const value = Number(target.replace(",", "."));
    if (needsExercise && !exercise.trim()) return setProblem("Choose an exercise.");
    if (!target.trim() || !(value > 0)) return setProblem("Enter a target above zero.");
    if (type === "weekly_workouts" && (!Number.isInteger(value) || value > 14))
      return setProblem("Workouts per week must be a whole number from 1 to 14.");
    setProblem(null);
    const isWeight = type === "lift_weight" || type === "body_weight";
    onSave({
      type,
      exercise: needsExercise ? exercise.trim() : null,
      target: isWeight ? Math.round(toKg(value, unit) * 1000) / 1000 : value,
      deadline: deadline || null,
    });
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm text-muted">What kind of goal?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {GOAL_TYPES.map((t) => (
            <label
              key={t.value}
              className={cx(
                "cursor-pointer rounded-xl border p-3 transition-colors",
                type === t.value ? "border-accent/60 bg-accent/5" : "border-line hover:border-faint"
              )}
            >
              <input
                type="radio"
                name="goal-type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-muted">{t.hint}</div>
            </label>
          ))}
        </div>
      </fieldset>

      {needsExercise && (
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Exercise</span>
          <input
            list="goal-exercises"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder="e.g. Bench Press"
            className="field h-11 py-0"
          />
          <datalist id="goal-exercises">
            {choices.map((e) => (
              <option key={e.name} value={e.name} />
            ))}
          </datalist>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Target</span>
          <div className="relative">
            <input
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === "weekly_workouts" ? "4" : type === "exercise_reps" ? "20" : unit === "lb" ? "225" : "100"}
              aria-label="Target"
              className="field h-11 py-0 pr-20"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-faint">{suffix}</span>
          </div>
          {currentHint && <span className="mt-1 block text-xs text-faint">{currentHint}</span>}
        </label>
        {type !== "weekly_workouts" && (
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Deadline (optional)</span>
            <input
              type="date"
              value={deadline}
              min={dayKey(tomorrow)}
              onChange={(e) => setDeadline(e.target.value)}
              aria-label="Deadline"
              className="field h-11 py-0 [color-scheme:dark]"
            />
          </label>
        )}
      </div>

      {(problem || error) && <Banner onDismiss={() => setProblem(null)}>{problem ?? error}</Banner>}

      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" className="ml-auto" onClick={submit} disabled={saving}>
          {saving ? <Spinner className="size-4" /> : <Icon name="check" className="size-4" />} Set goal
        </Button>
      </div>
    </div>
  );
}

