import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { TrendLine } from "../components/charts";
import { Icon } from "../components/Icon";
import { Banner, CategoryDot, EmptyState, Panel, PanelHeader, Spinner } from "../components/ui";
import { useExerciseStats } from "../hooks/useExerciseStats";
import type { PersonalRecord } from "../lib/api";
import { formatRecordValue, RECORD_LABEL } from "../lib/records";
import { describeSets, exerciseProgress, exerciseVolume, formatDay, formatWeight } from "../lib/stats";
import { displayWeight } from "../lib/units";
import { useUserStore } from "../stores/userStore";

export default function ExercisePage() {
  const name = decodeURIComponent(useParams().name ?? "");
  const { logs, weightUnit: unit, status } = useUserStore();
  const { stats, error } = useExerciseStats();
  const exercise = stats?.find((s) => s.name.toLowerCase() === name.toLowerCase());

  // Every session with this exercise, newest first, from the loaded workouts.
  const sessions = useMemo(
    () =>
      logs.flatMap((log) =>
        log.exercises
          .filter((e) => e.name.toLowerCase() === name.toLowerCase())
          .map((e) => ({ log, exercise: e }))
      ),
    [logs, name]
  );

  const progress = useMemo(() => {
    const p = exerciseProgress(logs, name);
    return p.unit === "kg"
      ? { ...p, unit, points: p.points.map((pt) => ({ ...pt, value: displayWeight(pt.value, unit) })) }
      : p;
  }, [logs, name, unit]);

  const bests: { kind: PersonalRecord["kind"]; value: number | null }[] = exercise
    ? [
        { kind: "weight", value: exercise.bestWeight },
        { kind: "e1rm", value: exercise.bestE1rm },
        { kind: "reps", value: exercise.bestReps },
        { kind: "distance", value: exercise.bestDistance },
        { kind: "duration", value: exercise.bestDuration },
      ]
    : [];
  const shownBests = bests.filter((b) => b.value != null && b.value > 0);

  if ((!stats && !error) || status === "loading") {
    return (
      <div className="grid h-80 place-items-center text-muted">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <header>
        <Link to="/app/exercises" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <Icon name="arrow" className="size-4 rotate-180" /> All exercises
        </Link>
        <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {exercise && <CategoryDot category={exercise.category} />}
          {exercise?.name ?? name}
        </h1>
        {exercise && (
          <p className="mt-2 text-sm text-muted">
            {exercise.sessions} session{exercise.sessions === 1 ? "" : "s"} · last {formatDay(exercise.lastPerformed)}
          </p>
        )}
      </header>

      {error && <Banner>{error}</Banner>}

      {!exercise && !error ? (
        <Panel>
          <EmptyState icon="dumbbell" title="Not logged yet">
            Once you log {name}, its history and personal records show up here.
          </EmptyState>
        </Panel>
      ) : (
        <>
          {shownBests.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {shownBests.map((b) => (
                <div key={b.kind} className="panel p-5">
                  <div className="flex items-center gap-2 text-muted">
                    <Icon name="trophy" className="size-4 text-warn" />
                    <span className="text-sm">{RECORD_LABEL[b.kind]}</span>
                  </div>
                  <div className="num mt-3 text-2xl font-semibold">{formatRecordValue(b.kind, b.value!, unit)}</div>
                </div>
              ))}
            </div>
          )}

          <Panel>
            <PanelHeader title="Progress" hint={`${progress.label} per session (${progress.unit})`} />
            {progress.points.length > 1 ? (
              <TrendLine points={progress.points} unit={progress.unit} />
            ) : (
              <EmptyState icon="pulse" title="One more session for a trend">
                The chart appears after you've logged {exercise?.name ?? name} twice.
              </EmptyState>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="History" hint={sessions.length >= 1 ? `${sessions.length} recent sessions` : undefined} />
            <ul className="-mx-2 divide-y divide-line">
              {sessions.map(({ log, exercise: e }) => {
                const volume = exerciseVolume(e);
                return (
                  <li key={e.id}>
                    <Link to={`/app/history#${log.id}`} className="flex items-start gap-4 rounded-xl px-2 py-3 hover:bg-raised">
                      <span className="w-24 shrink-0 text-sm text-muted">{formatDay(log.date)}</span>
                      <span className="flex-1 text-sm">{describeSets(e.sets, unit).join(" · ")}</span>
                      {volume > 0 && <span className="num text-sm text-faint">{formatWeight(volume, unit, 0)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
