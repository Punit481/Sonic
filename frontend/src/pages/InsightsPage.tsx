import type { ReactNode } from "react";
import { Icon, type IconName } from "../components/Icon";
import { Banner, Button, EmptyState, Panel, Spinner } from "../components/ui";
import { useInsights } from "../hooks/useInsights";
import { cx } from "../lib/cx";
import { useUserStore } from "../stores/userStore";

const MIN_WORKOUTS = 3;

const timeUntil = (date: Date) => {
  const minutes = Math.max(0, Math.round((date.getTime() - Date.now()) / 60000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h} h ${minutes % 60} min` : `${minutes} min`;
};

function Section({ icon, title, tone, children }: { icon: IconName; title: string; tone: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={cx("grid size-8 place-items-center rounded-lg", tone)}>
          <Icon name={icon} className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </Panel>
  );
}

const PRIORITY = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warn/15 text-warn",
  low: "bg-sky/15 text-sky",
};

export default function InsightsPage() {
  const { insights, isLoading, isGenerating, error, canRegenerate, canRegenerateAt, generateInsights } = useInsights();
  const { logs } = useUserStore();
  const tooFew = logs.length < MIN_WORKOUTS;

  const generateButton = (
    <Button
      variant={insights ? "secondary" : "primary"}
      size={insights ? "md" : "lg"}
      icon={isGenerating ? undefined : "spark"}
      onClick={generateInsights}
      disabled={isGenerating || !canRegenerate || tooFew}
      title={!canRegenerate && canRegenerateAt ? `Available ${canRegenerateAt.toLocaleString()}` : undefined}
    >
      {isGenerating ? (
        <>
          <Spinner className="size-4" /> Analysing your training…
        </>
      ) : !canRegenerate && canRegenerateAt ? (
        `Refresh in ${timeUntil(canRegenerateAt)}`
      ) : insights ? (
        "Refresh insights"
      ) : (
        "Generate insights"
      )}
    </Button>
  );

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">AI coach</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Insights</h1>
          {insights && (
            <p className="mt-2 text-sm text-muted">
              Based on your last 90 days · updated{" "}
              {insights.generatedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
        {insights && generateButton}
      </header>

      {error && <Banner>{error}</Banner>}

      {isLoading ? (
        <div className="grid h-60 place-items-center text-muted">
          <Spinner />
        </div>
      ) : !insights ? (
        <Panel>
          <EmptyState icon="spark" title="Get a read on your training" action={generateButton}>
            {tooFew
              ? `Log at least ${MIN_WORKOUTS} workouts and Sonic's AI coach will review your volume, consistency and body trends. You have ${logs.length}.`
              : "Sonic's AI coach reviews your volume, consistency and body trends from the last 90 days, then suggests what to change. You can refresh once a day."}
          </EmptyState>
        </Panel>
      ) : (
        <>
          <Panel className="border-accent/20 bg-gradient-to-br from-accent/[0.07] to-transparent">
            <p className="eyebrow text-accent">Summary</p>
            <p className="mt-3 text-lg leading-relaxed text-ink/90">{insights.summary}</p>
          </Panel>

          {(insights.trends.volume || insights.trends.frequency || insights.trends.bodyComposition) && (
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["Volume", insights.trends.volume, "dumbbell"],
                  ["Frequency", insights.trends.frequency, "flame"],
                  ["Body", insights.trends.bodyComposition, "scale"],
                ] as const
              )
                .filter(([, text]) => text)
                .map(([label, text, icon]) => (
                  <div key={label} className="panel p-5">
                    <div className="flex items-center gap-2 text-muted">
                      <Icon name={icon} className="size-4" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink/85">{text}</p>
                  </div>
                ))}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {insights.recommendations.length > 0 && (
              <Section icon="arrow" title="Recommendations" tone="bg-accent/15 text-accent">
                <ul className="space-y-4">
                  {insights.recommendations.map((r, i) => (
                    <li key={i}>
                      <div className="flex items-start gap-2">
                        <span className={cx("mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase", PRIORITY[r.priority])}>
                          {r.priority}
                        </span>
                        <p className="font-medium">{r.action}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted">{r.reasoning}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="space-y-6">
              {insights.achievements.length > 0 && (
                <Section icon="trophy" title="Wins" tone="bg-violet/15 text-violet">
                  <ul className="space-y-2.5">
                    {insights.achievements.map((a, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-ink/85">
                        <Icon name="check" className="mt-0.5 size-4 shrink-0 text-violet" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {insights.warnings.length > 0 && (
                <Section icon="alert" title="Watch out" tone="bg-warn/15 text-warn">
                  <ul className="space-y-2.5">
                    {insights.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-ink/85">
                        {w}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </div>

          {insights.nextSteps.length > 0 && (
            <Panel>
              <h2 className="font-display text-lg font-semibold">This week</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insights.nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-line bg-raised p-4 text-sm">
                    <span className="num text-lg font-bold text-accent">{i + 1}</span>
                    <span className="text-ink/85">{step}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
