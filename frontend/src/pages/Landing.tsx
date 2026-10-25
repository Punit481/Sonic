import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Icon, type IconName } from "../components/Icon";
import { CategoryDot, LinkButton, Logo } from "../components/ui";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "mic",
    title: "Say it between sets",
    text: "Talk the way you would to a training partner. Kilos or pounds, \"yesterday\" or today, one exercise or the whole session.",
  },
  {
    icon: "list",
    title: "Sonic structures it",
    text: "AI turns your words into exercises, sets, reps, weights, distances and body measurements, and saves them.",
  },
  {
    icon: "spark",
    title: "See what's working",
    text: "Weekly volume, lift progress, body trends and an AI coach that reads your last 90 days and tells you what to change.",
  },
];

const FAQ = [
  {
    q: "What can I log?",
    a: "Strength work (sets, reps, weight), cardio (distance, time), mobility, and body measurements like weight, body fat and muscle mass.",
  },
  {
    q: "Which browsers work?",
    a: "All modern browsers. Chrome and Edge show your words live as you talk. Elsewhere Sonic records you and transcribes on the server. You can always type instead.",
  },
  {
    q: "Can I log a workout from yesterday?",
    a: "Yes. Say \"yesterday\" or the day, e.g. \"Monday I did squats 5 by 5 at 100 kilos\".",
  },
  {
    q: "How do insights work?",
    a: "After 3 workouts, the AI coach analyses your last 90 days: volume, frequency, top lifts and body trends. You can refresh it once a day.",
  },
  {
    q: "Can I fix a mistake?",
    a: "You can delete any workout or measurement from History and log it again.",
  },
];

function DemoCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-10 -z-10 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="panel p-5 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <Icon name="mic" className="size-5" />
          </span>
          <div className="flex h-8 flex-1 items-center gap-[3px]" aria-hidden="true">
            {[5, 9, 14, 8, 18, 12, 22, 10, 16, 7, 13, 20, 9, 15, 6, 11, 17, 8, 12, 5, 9, 14, 7, 4].map((h, i) => (
              <span
                key={i}
                className="w-[3px] animate-pulse rounded-full bg-accent/70"
                style={{ height: `${h + 6}px`, animationDelay: `${(i % 6) * 0.15}s` }}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/90">
          "Bench, four sets of eight at eighty. Then a 5k run in twenty-seven minutes. Oh, and I weighed 78.2 this morning."
        </p>
      </div>

      <div className="my-3 flex justify-center text-faint" aria-hidden="true">
        <Icon name="chevron" className="size-5" />
      </div>

      <div className="panel divide-y divide-line">
        {[
          { cat: "strength", name: "Bench Press", detail: "4 × 8 reps · 80 kg" },
          { cat: "cardio", name: "Running", detail: "5 km · 27 min" },
          { cat: "metric", name: "Body weight", detail: "78.2 kg" },
        ].map((row) => (
          <div key={row.name} className="flex items-center gap-3 px-5 py-3.5">
            <CategoryDot category={row.cat} />
            <span className="flex-1 font-medium">{row.name}</span>
            <span className="num text-sm text-muted">{row.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Sonic home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-ink sm:block">
            How it works
          </a>
          <a href="#faq" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-ink sm:block">
            FAQ
          </a>
          <SignedOut>
            <LinkButton to="/sign-in" variant="ghost">
              Sign in
            </LinkButton>
            <LinkButton to="/sign-up" variant="primary">
              Get started
            </LinkButton>
          </SignedOut>
          <SignedIn>
            <LinkButton to="/app" variant="primary">
              Open app
            </LinkButton>
          </SignedIn>
        </div>
      </nav>

      <header className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-20 lg:pb-28">
        <div className="animate-rise">
          <p className="eyebrow">Voice-first workout log</p>
          <h1 className="mt-5 font-display text-6xl leading-[0.95] font-bold tracking-tight sm:text-7xl lg:text-8xl">
            Speak it.
            <br />
            <span className="text-accent">Log it.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Keep your hands on the bar, not your phone. Say what you did and Sonic turns it into a clean training log, charts and coaching.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignedOut>
              <LinkButton to="/sign-up" variant="primary" size="lg" icon="mic">
                Start logging free
              </LinkButton>
            </SignedOut>
            <SignedIn>
              <LinkButton to="/app/log" variant="primary" size="lg" icon="mic">
                Log a workout
              </LinkButton>
            </SignedIn>
            <a
              href="#how"
              className="inline-flex h-12 items-center rounded-xl border border-line px-6 font-medium text-ink transition-colors hover:border-faint"
            >
              How it works
            </a>
          </div>
        </div>
        <DemoCard />
      </header>

      <section id="how" className="scroll-mt-8 border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            From voice to progress in seconds
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-raised text-accent">
                    <Icon name={step.icon} />
                  </span>
                  <span className="num text-sm text-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-8 px-4 py-20 sm:px-6">
        <p className="eyebrow">FAQ</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Questions</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <Icon name="plus" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="panel flex flex-col items-start gap-6 bg-gradient-to-br from-accent/10 to-transparent p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Your next set is the best time to start.</h2>
            <p className="mt-2 text-muted">Free while in beta. No typing required.</p>
          </div>
          <SignedOut>
            <LinkButton to="/sign-up" variant="primary" size="lg">
              Create your log <Icon name="arrow" className="size-4" />
            </LinkButton>
          </SignedOut>
          <SignedIn>
            <LinkButton to="/app" variant="primary" size="lg">
              Open Sonic <Icon name="arrow" className="size-4" />
            </LinkButton>
          </SignedIn>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-faint sm:px-6">
          <Logo className="opacity-70" />
          <span>© {new Date().getFullYear()} Sonic · MIT licensed</span>
        </div>
      </footer>
    </div>
  );
}
