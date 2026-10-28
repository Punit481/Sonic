import { useId, useState } from "react";
import type { DraftMetric, DraftWorkout, WeightUnit } from "../lib/api";
import { cx } from "../lib/cx";
import { dayKey } from "../lib/stats";
import { fromKg, roundWeight, toKg } from "../lib/units";
import type { ExerciseCategory } from "../stores/types";
import { Icon } from "./Icon";
import { Banner, Button, CategoryDot, Spinner } from "./ui";

/*
 * Edits a workout and/or a body measurement before it is saved. The form holds strings in the
 * units people think in (the user's weight unit, minutes); `toDrafts` converts back to the API's
 * kg, km and hours.
 */

interface FormSet {
  key: number;
  reps: string;
  weight: string;
  distance: string;
  minutes: string;
}

interface FormExercise {
  key: number;
  name: string;
  category: ExerciseCategory;
  sets: FormSet[];
}

interface FormMetric {
  weight: string;
  bodyFat: string;
  muscleMass: string;
}

interface Form {
  day: string;
  note: string;
  exercises: FormExercise[];
  metric: FormMetric | null;
}

let nextKey = 1;
const key = () => nextKey++;

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (s: string) => {
  const trimmed = s.trim().replace(",", ".");
  return trimmed === "" ? null : Number(trimmed);
};

const emptySet = (): FormSet => ({ key: key(), reps: "", weight: "", distance: "", minutes: "" });

function toForm(workout: DraftWorkout | null, metric: DraftMetric | null, unit: WeightUnit): Form {
  const weight = (kg: number | null | undefined) => (kg == null ? "" : String(roundWeight(fromKg(kg, unit), unit)));
  return {
    day: dayKey(workout?.date ?? metric?.date ?? new Date()),
    note: workout?.note ?? "",
    exercises: (workout?.exercises ?? []).map((e) => ({
      key: key(),
      name: e.name,
      category: e.category,
      sets: e.sets.map((s) => ({
        key: key(),
        reps: str(s.reps),
        weight: weight(s.weight),
        distance: str(s.distance),
        minutes: s.duration == null ? "" : String(Math.round(s.duration * 60 * 10) / 10),
      })),
    })),
    metric: metric
      ? { weight: weight(metric.weight), bodyFat: str(metric.bodyFat), muscleMass: weight(metric.muscleMass) }
      : null,
  };
}

/** The chosen day: keep the original time if the day didn't change, else now for today, else midday. */
function dateFor(day: string, original: string | null | undefined) {
  if (original && dayKey(original) === day) return original;
  if (day === dayKey(new Date())) return new Date().toISOString();
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

function validate(form: Form, hasWorkout: boolean): string | null {
  if (hasWorkout && form.exercises.length === 0 && !form.metric) return "Add at least one exercise.";
  for (const e of form.exercises) {
    if (!e.name.trim()) return "Every exercise needs a name.";
    if (e.sets.length === 0) return `${e.name} needs at least one set.`;
    for (const s of e.sets) {
      const values = [s.reps, s.weight, s.distance, s.minutes].map(num);
      if (values.some((v) => v != null && (Number.isNaN(v) || v < 0))) return `Check the numbers for ${e.name}.`;
      if (values.every((v) => v == null)) return `A set of ${e.name} is empty.`;
      if (s.reps.trim() && !Number.isInteger(num(s.reps))) return `Reps for ${e.name} must be whole numbers.`;
    }
  }
  if (form.metric) {
    const values = [form.metric.weight, form.metric.bodyFat, form.metric.muscleMass].map(num);
    if (values.every((v) => v == null)) return "The body measurement is empty.";
    if (values.some((v) => v != null && (Number.isNaN(v) || v <= 0))) return "Check the body measurement numbers.";
    if ((num(form.metric.bodyFat) ?? 0) > 100) return "Body fat can't be over 100%.";
  }
  return null;
}

function toDrafts(form: Form, unit: WeightUnit, originalWorkoutDate?: string | null, originalMetricDate?: string | null) {
  const kg = (s: string) => {
    const v = num(s);
    return v == null ? null : Math.round(toKg(v, unit) * 1000) / 1000;
  };
  const workout: DraftWorkout | null =
    form.exercises.length === 0
      ? null
      : {
          date: dateFor(form.day, originalWorkoutDate),
          note: form.note.trim() || null,
          exercises: form.exercises.map((e) => ({
            name: e.name.trim(),
            category: e.category,
            sets: e.sets.map((s) => {
              const minutes = num(s.minutes);
              return {
                reps: num(s.reps),
                weight: kg(s.weight),
                distance: num(s.distance),
                duration: minutes == null ? null : Math.round((minutes / 60) * 10000) / 10000,
              };
            }),
          })),
        };
  const metric: DraftMetric | null = form.metric
    ? {
        date: dateFor(form.day, originalMetricDate),
        weight: kg(form.metric.weight),
        bodyFat: num(form.metric.bodyFat),
        muscleMass: kg(form.metric.muscleMass),
      }
    : null;
  return { workout, metric };
}

/** Which inputs a set shows, by category. Values typed earlier in hidden fields are kept. */
const COLUMNS: Record<ExerciseCategory, (keyof Omit<FormSet, "key">)[]> = {
  strength: ["reps", "weight"],
  cardio: ["distance", "minutes"],
  mobility: ["reps", "minutes"],
  custom: ["reps", "weight", "minutes"],
};

function NumberField({
  value,
  onChange,
  label,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  suffix: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="h-10 w-full rounded-lg border border-line bg-raised pr-10 pl-3 text-right text-sm tabular-nums outline-none placeholder:text-faint focus:border-accent/60"
      />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-faint">
        {suffix}
      </span>
    </div>
  );
}

export interface WorkoutEditorProps {
  workout: DraftWorkout | null;
  metric?: DraftMetric | null;
  unit: WeightUnit;
  /** Offer "add body measurement" (the voice review does; editing a past workout doesn't). */
  allowMetric?: boolean;
  exerciseNames?: string[];
  saveLabel: string;
  saving?: boolean;
  error?: string | null;
  onSave: (result: { workout: DraftWorkout | null; metric: DraftMetric | null }) => void;
  onCancel: () => void;
}

export default function WorkoutEditor({
  workout,
  metric = null,
  unit,
  allowMetric = false,
  exerciseNames = [],
  saveLabel,
  saving = false,
  error,
  onSave,
  onCancel,
}: WorkoutEditorProps) {
  const [form, setForm] = useState<Form>(() => toForm(workout, metric, unit));
  const [problem, setProblem] = useState<string | null>(null);
  const listId = useId();

  const updateExercise = (k: number, change: Partial<FormExercise>) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e) => (e.key === k ? { ...e, ...change } : e)) }));
  const updateSet = (ek: number, sk: number, change: Partial<FormSet>) =>
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e) =>
        e.key === ek ? { ...e, sets: e.sets.map((s) => (s.key === sk ? { ...s, ...change } : s)) } : e
      ),
    }));

  const unitLabel: Record<keyof Omit<FormSet, "key">, string> = { reps: "reps", weight: unit, distance: "km", minutes: "min" };
  const fieldLabel: Record<keyof Omit<FormSet, "key">, string> = { reps: "Reps", weight: "Weight", distance: "Distance", minutes: "Minutes" };

  const save = () => {
    const issue = validate(form, workout !== null || form.exercises.length > 0);
    setProblem(issue);
    if (!issue) onSave(toDrafts(form, unit, workout?.date, metric?.date));
  };

  return (
    <div className="space-y-4">
      <datalist id={listId}>
        {exerciseNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Date
          <input
            type="date"
            value={form.day}
            max={dayKey(new Date())}
            onChange={(e) => e.target.value && setForm((f) => ({ ...f, day: e.target.value }))}
            className="h-9 rounded-lg border border-line bg-raised px-3 text-sm text-ink outline-none [color-scheme:dark] focus:border-accent/60"
          />
        </label>
      </div>

      {form.exercises.map((e, ei) => (
        <div key={e.key} className="rounded-xl border border-line bg-bg/40 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <CategoryDot category={e.category} />
            <input
              list={listId}
              value={e.name}
              onChange={(ev) => updateExercise(e.key, { name: ev.target.value })}
              placeholder="Exercise"
              aria-label={`Exercise ${ei + 1} name`}
              className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 font-medium outline-none hover:border-line focus:border-accent/60 focus:bg-raised"
            />
            <select
              value={e.category}
              onChange={(ev) => updateExercise(e.key, { category: ev.target.value as ExerciseCategory })}
              aria-label={`Exercise ${ei + 1} type`}
              className="h-9 cursor-pointer rounded-lg border border-line bg-raised px-2 text-sm text-muted outline-none focus:border-accent/60"
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="mobility">Mobility</option>
              <option value="custom">Other</option>
            </select>
            <button
              onClick={() => setForm((f) => ({ ...f, exercises: f.exercises.filter((x) => x.key !== e.key) }))}
              aria-label={`Remove ${e.name || "exercise"}`}
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
            >
              <Icon name="trash" className="size-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {e.sets.map((s, si) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-faint">Set {si + 1}</span>
                {COLUMNS[e.category].map((field) => (
                  <NumberField
                    key={field}
                    label={`${e.name} set ${si + 1} ${fieldLabel[field]}`}
                    value={s[field]}
                    suffix={unitLabel[field]}
                    onChange={(v) => updateSet(e.key, s.key, { [field]: v })}
                  />
                ))}
                <button
                  onClick={() => updateExercise(e.key, { sets: e.sets.filter((x) => x.key !== s.key) })}
                  aria-label={`Remove set ${si + 1}`}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
                >
                  <Icon name="close" className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const last = e.sets[e.sets.length - 1];
              updateExercise(e.key, { sets: [...e.sets, last ? { ...last, key: key() } : emptySet()] });
            }}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-ink"
          >
            <Icon name="plus" className="size-4" /> Add set
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon="plus"
          onClick={() =>
            setForm((f) => ({
              ...f,
              exercises: [...f.exercises, { key: key(), name: "", category: "strength", sets: [emptySet()] }],
            }))
          }
        >
          Add exercise
        </Button>
        {allowMetric && !form.metric && (
          <Button
            size="sm"
            icon="scale"
            onClick={() => setForm((f) => ({ ...f, metric: { weight: "", bodyFat: "", muscleMass: "" } }))}
          >
            Add body measurement
          </Button>
        )}
      </div>

      {form.metric && (
        <div className="rounded-xl border border-line bg-bg/40 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Icon name="scale" className="size-4 text-muted" /> Body measurement
            </span>
            <button
              onClick={() => setForm((f) => ({ ...f, metric: null }))}
              aria-label="Remove body measurement"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
            >
              <Icon name="trash" className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["weight", "Weight", unit],
                ["bodyFat", "Body fat", "%"],
                ["muscleMass", "Muscle", unit],
              ] as const
            ).map(([field, label, suffix]) => (
              <div key={field}>
                <div className="mb-1 text-xs text-faint">{label}</div>
                <NumberField
                  label={label}
                  value={form.metric![field]}
                  suffix={suffix}
                  onChange={(v) => setForm((f) => ({ ...f, metric: { ...f.metric!, [field]: v } }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {form.exercises.length > 0 && (
        <input
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Note (optional)"
          maxLength={2000}
          aria-label="Workout note"
          className="field h-10 py-0 text-sm"
        />
      )}

      {(problem || error) && <Banner onDismiss={() => setProblem(null)}>{problem ?? error}</Banner>}

      <div className={cx("flex flex-wrap items-center gap-2 pt-1")}>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="lg" className="ml-auto" onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Spinner className="size-4" /> Saving…
            </>
          ) : (
            <>
              <Icon name="check" className="size-4" /> {saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
