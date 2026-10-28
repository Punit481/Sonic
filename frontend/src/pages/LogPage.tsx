import { useAuth } from "@clerk/clerk-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { GoalsReached } from "../components/Goals";
import Records from "../components/Records";
import { Banner, Button, CategoryDot, LinkButton, Panel, Segmented, Spinner } from "../components/ui";
import WorkoutEditor from "../components/WorkoutEditor";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import {
  confirmVoiceLog,
  deleteDraft,
  errorMessage,
  parseVoiceAudio,
  parseVoiceText,
  saveDraft,
  type VoiceDraft,
  type VoiceLogResult,
  type WeightUnit,
} from "../lib/api";
import { cx } from "../lib/cx";
import { recentDistinctWorkouts, workoutToDraft } from "../lib/drafts";
import { describeSets, exerciseSummaries, formatDay, formatNumber, formatWeight } from "../lib/stats";
import { useUserStore } from "../stores/userStore";

const EXAMPLES = [
  "Bench press 4 sets of 8 at 80 kilos",
  "Ran 5 k in 28 minutes",
  "Squats 5 by 5 at 100 kg, then 10 minutes stretching",
  "I weigh 78.4 kilos this morning",
  "Yesterday: deadlifts 3 sets of 5 at 140",
];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Result({ result, unit, onAgain }: { result: VoiceLogResult; unit: WeightUnit; onAgain: () => void }) {
  const { workout, metric } = result;
  return (
    <Panel className="animate-rise space-y-5 border-accent/30">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name="check" className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Logged</h2>
          <p className="text-sm text-muted">{workout ? formatDay(workout.date) : metric ? formatDay(metric.date) : ""}</p>
        </div>
      </div>

      <GoalsReached goals={result.goalsReached ?? []} unit={unit} />
      <Records records={result.records} unit={unit} />

      {workout && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {workout.exercises.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-1.5">
                <CategoryDot category={e.category} />
              </span>
              <div className="flex-1">
                <div className="font-medium">{e.name}</div>
                <div className="text-sm text-muted">{describeSets(e.sets, unit).join(" · ")}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {metric && (
        <div className="flex flex-wrap gap-2">
          {metric.weight != null && <Chip label="Weight" value={formatWeight(metric.weight, unit)} />}
          {metric.bodyFat != null && <Chip label="Body fat" value={`${formatNumber(metric.bodyFat, 1)}%`} />}
          {metric.muscleMass != null && <Chip label="Muscle" value={formatWeight(metric.muscleMass, unit)} />}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" icon="mic" onClick={onAgain}>
          Log another
        </Button>
        <LinkButton to="/app/history">View history</LinkButton>
      </div>
    </Panel>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl border border-line bg-raised px-3 py-2 text-sm">
      <span className="text-muted">{label}</span> <span className="num font-semibold">{value}</span>
    </span>
  );
}

type Busy = null | "reading" | "transcribing" | "saving" | "drafting";

export default function LogPage() {
  const { getToken } = useAuth();
  const { draft, setDraft, addLog, addMetric, status, logs, weightUnit } = useUserStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  /** What the AI understood (or a repeated workout), being reviewed before it's saved. */
  const [review, setReview] = useState<VoiceDraft | null>(null);
  const [result, setResult] = useState<VoiceLogResult | null>(null);
  // Kept after a failed upload so the user can retry without recording again.
  const [failedRecording, setFailedRecording] = useState<Blob | null>(null);
  const restored = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const exerciseNames = useMemo(() => exerciseSummaries(logs).map((e) => e.name), [logs]);
  const recent = useMemo(() => recentDistinctWorkouts(logs, 3), [logs]);

  // Bring back a transcript saved for later, once.
  useEffect(() => {
    if (!restored.current && status === "ready") {
      restored.current = true;
      if (draft) {
        setText(draft);
        setInfo("Restored the workout you saved for later.");
      }
    }
  }, [status, draft]);

  const uploadRecording = async (audio: Blob) => {
    setBusy("transcribing");
    setError(null);
    setFailedRecording(null);
    try {
      setReview(await parseVoiceAudio(await getToken(), audio));
    } catch (e) {
      setError(errorMessage(e));
      setFailedRecording(audio);
    } finally {
      setBusy(null);
    }
  };

  const voice = useVoiceCapture({ text, onText: setText, onRecording: uploadRecording });

  const readText = async () => {
    if (!text.trim() || busy) return;
    if (voice.active) voice.stop();
    setBusy("reading");
    setError(null);
    try {
      setReview(await parseVoiceText(await getToken(), text.trim()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async (edited: Pick<VoiceDraft, "workout" | "metric">) => {
    if (!review) return;
    setBusy("saving");
    setError(null);
    try {
      const saved = await confirmVoiceLog(await getToken(), { transcript: review.transcript, ...edited });
      if (saved.workout) addLog(saved.workout);
      if (saved.metric) addMetric(saved.metric);
      setResult(saved);
      setReview(null);
      setText("");
      setInfo(null);
      if (draft) {
        setDraft("");
        deleteDraft(await getToken()).catch(() => {});
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const saveForLater = async () => {
    if (!text.trim() || busy) return;
    if (voice.active) voice.stop();
    setBusy("drafting");
    setError(null);
    try {
      await saveDraft(await getToken(), text.trim());
      setDraft(text.trim());
      setInfo("Saved. It'll be here next time you open this page.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const clearAll = async () => {
    if (voice.active) voice.stop();
    setText("");
    setError(null);
    setInfo(null);
    if (draft) {
      setDraft("");
      deleteDraft(await getToken()).catch(() => {});
    }
  };

  const toggleMic = () => {
    setResult(null);
    setError(null);
    setFailedRecording(null);
    if (voice.active) voice.stop();
    else voice.start();
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Header title="Nice work." />
        <Result
          result={result}
          unit={weightUnit}
          onAgain={() => {
            setResult(null);
            voice.start();
          }}
        />
      </div>
    );
  }

  if (review) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Header title="Check it over" />
        <Panel className="animate-rise space-y-4">
          {review.transcript && (
            <p className="rounded-xl bg-raised px-4 py-3 text-sm text-muted">
              <Icon name="wave" className="mr-2 inline size-4 text-accent" />"{review.transcript}"
            </p>
          )}
          <p className="text-sm text-muted">Fix anything Sonic got wrong, then save.</p>
          <WorkoutEditor
            workout={review.workout}
            metric={review.metric}
            unit={weightUnit}
            allowMetric
            exerciseNames={exerciseNames}
            saveLabel="Save"
            saving={busy === "saving"}
            error={error}
            onSave={confirm}
            onCancel={() => {
              setReview(null);
              setError(null);
            }}
          />
        </Panel>
      </div>
    );
  }

  const listening = voice.state === "listening" || voice.state === "recording";
  const statusText =
    busy === "transcribing"
      ? "Transcribing…"
      : voice.state === "starting"
        ? "Starting microphone…"
        : voice.state === "listening"
          ? `Listening · ${clock(voice.elapsed)}`
          : voice.state === "recording"
            ? `Recording · ${clock(voice.elapsed)} · tap to finish`
            : voice.mode === "record"
              ? "Tap to record. Sonic transcribes when you stop."
              : "Tap and say what you did";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Header title="What did you train?" />

      <Panel className="p-0 sm:p-0">
        <div className="flex flex-col items-center px-5 pt-10 pb-8">
          <div className="relative grid size-36 place-items-center">
            {listening && (
              <>
                <span className="absolute inset-4 animate-pulse-ring rounded-full bg-accent/40" />
                <span className="absolute inset-4 animate-pulse-ring rounded-full bg-accent/30 [animation-delay:0.6s]" />
              </>
            )}
            <button
              onClick={toggleMic}
              disabled={!voice.supported || busy === "transcribing" || busy === "reading"}
              aria-label={voice.active ? "Stop" : voice.mode === "record" ? "Start recording" : "Start listening"}
              aria-pressed={voice.active}
              className={cx(
                "relative grid size-24 cursor-pointer place-items-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
                voice.active
                  ? "scale-105 bg-accent text-accent-ink shadow-[0_0_60px_-10px] shadow-accent"
                  : "border border-line bg-raised text-ink hover:border-accent/50 hover:text-accent"
              )}
            >
              {busy === "transcribing" ? (
                <Spinner className="size-8" />
              ) : (
                <Icon name={voice.active ? "stop" : "mic"} className="size-9" />
              )}
            </button>
          </div>
          <p className={cx("mt-4 text-sm", listening ? "text-accent" : "text-muted")} aria-live="polite">
            {statusText}
          </p>
          {voice.liveAvailable && voice.recordAvailable && (
            <div className="mt-5">
              <Segmented
                label="Voice mode"
                value={voice.mode}
                onChange={voice.setMode}
                options={[
                  { value: "live", label: "Live transcript" },
                  { value: "record", label: "Record & upload" },
                ]}
              />
            </div>
          )}
        </div>

        <div className="border-t border-line p-5">
          <label htmlFor="transcript" className="sr-only">
            Workout description
          </label>
          <textarea
            id="transcript"
            ref={textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) readText();
            }}
            rows={4}
            maxLength={5000}
            placeholder={'Talk, or type here. "Bench press 4 sets of 8 at 80 kg, then 20 minutes on the bike."'}
            className="field min-h-28 resize-y text-base leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setText(ex);
                  textarea.current?.focus();
                }}
                className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-faint hover:text-ink"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line p-5">
          <Button variant="ghost" icon="trash" onClick={clearAll} disabled={!text && !draft}>
            Clear
          </Button>
          <Button variant="ghost" onClick={saveForLater} disabled={!text.trim() || !!busy}>
            {busy === "drafting" ? "Saving…" : "Save for later"}
          </Button>
          <Button variant="primary" size="lg" className="ml-auto" onClick={readText} disabled={!text.trim() || !!busy}>
            {busy === "reading" ? (
              <>
                <Spinner className="size-4" /> Reading…
              </>
            ) : (
              <>
                Review <Icon name="arrow" className="size-4" />
              </>
            )}
          </Button>
        </div>
      </Panel>

      <div className="space-y-3">
        {voice.error && (
          <Banner tone="warn" onDismiss={voice.clearError}>
            {voice.error}
          </Banner>
        )}
        {error && (
          <Banner onDismiss={() => setError(null)}>
            {error}
            {failedRecording && (
              <button
                onClick={() => uploadRecording(failedRecording)}
                disabled={!!busy}
                className="ml-2 cursor-pointer font-medium text-ink underline underline-offset-2"
              >
                Retry recording
              </button>
            )}
          </Banner>
        )}
        {info && !error && (
          <Banner tone="success" onDismiss={() => setInfo(null)}>
            {info}
          </Banner>
        )}
        {!voice.supported && (
          <Banner tone="warn">This browser can't use the microphone here. Type your workout instead.</Banner>
        )}
      </div>

      {recent.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Or repeat a recent workout</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {recent.map((log) => (
              <button
                key={log.id}
                onClick={() => setReview({ transcript: null, workout: workoutToDraft(log, true), metric: null })}
                className="panel cursor-pointer p-4 text-left transition-colors hover:border-faint"
              >
                <div className="text-xs text-faint">{formatDay(log.date)}</div>
                <div className="mt-1 line-clamp-2 text-sm font-medium">{log.exercises.map((e) => e.name).join(", ")}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-accent">
                  Repeat today <Icon name="arrow" className="size-3.5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-faint">
        Say the exercise, sets, reps and weight. Add "yesterday" or a day to log the past. You'll check it before it's
        saved. <kbd className="rounded border border-line px-1">⌘</kbd> +{" "}
        <kbd className="rounded border border-line px-1">Enter</kbd> reviews.
      </p>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <header>
      <p className="eyebrow">Voice log</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
    </header>
  );
}
