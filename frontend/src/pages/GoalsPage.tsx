import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { GoalCard, GoalForm } from "../components/Goals";
import { Banner, Button, EmptyState, Panel, PanelHeader, Spinner } from "../components/ui";
import { useExerciseStats } from "../hooks/useExerciseStats";
import { useGoals } from "../hooks/useGoals";
import { createGoal, deleteGoal, errorMessage, type GoalType } from "../lib/api";
import { useUserStore } from "../stores/userStore";

export default function GoalsPage() {
  const { getToken } = useAuth();
  const unit = useUserStore((s) => s.weightUnit);
  const { goals, error, reload } = useGoals();
  const { stats } = useExerciseStats();
  // Exercise pages link here with ?new=lift_weight&exercise=Squat to pre-fill the form.
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.has("new"));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const active = (goals ?? []).filter((g) => !g.achievedAt);
  const achieved = (goals ?? []).filter((g) => g.achievedAt);

  const closeForm = () => {
    setAdding(false);
    setFormError(null);
    if (params.has("new")) setParams({}, { replace: true });
  };

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Goals</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">What are you working toward?</h1>
        </div>
        {!adding && goals && goals.length > 0 && (
          <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
            New goal
          </Button>
        )}
      </header>

      {error && <Banner>{error}</Banner>}

      {adding && (
        <Panel className="animate-rise">
          <PanelHeader title="New goal" hint="Progress updates automatically from what you log." />
          <GoalForm
            unit={unit}
            exercises={stats ?? []}
            initialType={(params.get("new") as GoalType | null) ?? undefined}
            initialExercise={params.get("exercise") ?? undefined}
            saving={saving}
            error={formError}
            onCancel={closeForm}
            onSave={async (goal) => {
              setSaving(true);
              setFormError(null);
              try {
                await createGoal(await getToken(), goal);
                await reload();
                closeForm();
              } catch (e) {
                setFormError(errorMessage(e));
              } finally {
                setSaving(false);
              }
            }}
          />
        </Panel>
      )}

      {!goals && !error ? (
        <div className="grid h-60 place-items-center text-muted">
          <Spinner />
        </div>
      ) : goals && goals.length === 0 && !adding ? (
        <Panel>
          <EmptyState
            icon="target"
            title="No goals yet"
            action={
              <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
                Set your first goal
              </Button>
            }
          >
            Bench 100 kg, 20 pull-ups in a row, reach 75 kg, or train 4 times a week. Sonic tracks it from what you log and
            tells you when you'll get there.
          </EmptyState>
        </Panel>
      ) : (
        <>
          {active.length > 0 && (
            <section className="grid gap-4 md:grid-cols-2">
              {active.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  unit={unit}
                  onDelete={async () => {
                    await deleteGoal(await getToken(), g.id);
                    await reload();
                  }}
                />
              ))}
            </section>
          )}
          {achieved.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Achieved · {achieved.length}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {achieved.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    unit={unit}
                    onDelete={async () => {
                      await deleteGoal(await getToken(), g.id);
                      await reload();
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
