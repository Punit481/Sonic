import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Banner, CategoryDot, EmptyState, LinkButton, Panel, Spinner } from "../components/ui";
import { useExerciseStats } from "../hooks/useExerciseStats";
import { headlineBest } from "../lib/records";
import { formatDay } from "../lib/stats";
import { useUserStore } from "../stores/userStore";

export default function ExercisesPage() {
  const { stats, error } = useExerciseStats();
  const unit = useUserStore((s) => s.weightUnit);
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => (stats ?? []).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())),
    [stats, query]
  );

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Exercises</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Your lifts and bests</h1>
        </div>
        {stats && stats.length > 6 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="field h-10 w-full py-0 text-sm sm:w-64"
          />
        )}
      </header>

      {error && <Banner>{error}</Banner>}

      {!stats && !error ? (
        <div className="grid h-60 place-items-center text-muted">
          <Spinner />
        </div>
      ) : stats && stats.length === 0 ? (
        <Panel>
          <EmptyState
            icon="trophy"
            title="No exercises yet"
            action={
              <LinkButton to="/app/log" variant="primary" icon="mic">
                Log a workout
              </LinkButton>
            }
          >
            Every exercise you log gets a page with its history and personal records.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => {
            const best = headlineBest(s, unit);
            return (
              <Link
                key={s.name}
                to={`/app/exercises/${encodeURIComponent(s.name)}`}
                className="panel group p-5 transition-colors hover:border-faint"
              >
                <div className="flex items-center gap-2">
                  <CategoryDot category={s.category} />
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                  <Icon name="arrow" className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  {best ? (
                    <div>
                      <div className="text-xs text-faint">{best.label}</div>
                      <div className="num text-2xl font-semibold">{best.value}</div>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="text-right text-xs text-muted">
                    {s.sessions} session{s.sessions === 1 ? "" : "s"}
                    <br />
                    Last: {formatDay(s.lastPerformed)}
                  </div>
                </div>
              </Link>
            );
          })}
          {shown.length === 0 && <p className="text-sm text-muted">No exercise matches "{query}".</p>}
        </div>
      )}
    </div>
  );
}
