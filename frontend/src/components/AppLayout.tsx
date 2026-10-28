import { useAuth, UserButton } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router";
import { updateWeightUnit, type WeightUnit } from "../lib/api";
import { cx } from "../lib/cx";
import { useUserStore } from "../stores/userStore";
import { Icon, type IconName } from "./Icon";
import { Banner, LinkButton, Logo, Segmented, Spinner } from "./ui";

const nav: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/app", label: "Overview", icon: "home", end: true },
  { to: "/app/log", label: "Log", icon: "mic" },
  { to: "/app/history", label: "History", icon: "list" },
  { to: "/app/exercises", label: "Exercises", icon: "trophy" },
  { to: "/app/goals", label: "Goals", icon: "target" },
  { to: "/app/insights", label: "Insights", icon: "spark" },
];

/** kg/lb switch. Saved to the account, so the AI also assumes it when no unit is said. */
function UnitToggle({ compact = false }: { compact?: boolean }) {
  const { getToken } = useAuth();
  const { weightUnit, setWeightUnit } = useUserStore();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return;
    const t = window.setTimeout(() => setFailed(false), 4000);
    return () => window.clearTimeout(t);
  }, [failed]);

  const change = async (unit: WeightUnit) => {
    if (unit === weightUnit) return;
    setWeightUnit(unit);
    setFailed(false);
    try {
      await updateWeightUnit(await getToken(), unit);
    } catch {
      // Put it back and say so, rather than silently showing the old unit.
      setWeightUnit(weightUnit);
      setFailed(true);
    }
  };

  const problem = failed && (
    <span role="alert" className="text-xs text-danger">
      Couldn't save
    </span>
  );

  if (compact) {
    return (
      <span className="flex items-center gap-2">
        {problem}
        <button
          onClick={() => change(weightUnit === "kg" ? "lb" : "kg")}
          aria-label={`Weight unit: ${weightUnit}. Switch to ${weightUnit === "kg" ? "lb" : "kg"}`}
          className="h-8 cursor-pointer rounded-lg border border-line px-2.5 text-xs font-medium text-muted hover:text-ink"
        >
          {weightUnit}
        </button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      {problem}
      <Segmented
        label="Weight unit"
        value={weightUnit}
        onChange={change}
        options={[
          { value: "kg", label: "kg" },
          { value: "lb", label: "lb" },
        ]}
      />
    </span>
  );
}

/** Signed-in shell: sidebar on desktop, bottom tabs on phones. Loads the user's data once. */
export default function AppLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { status, error, load, clear } = useUserStore();

  const reload = useCallback(async () => {
    const token = await getToken();
    if (token) await load(token);
  }, [getToken, load]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) void reload();
    else clear();
  }, [isLoaded, isSignedIn, reload, clear]);

  if (!isLoaded) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner />
      </div>
    );
  }
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface/60 px-4 py-6 lg:flex">
        <Link to="/" className="px-3">
          <Logo />
        </Link>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-raised text-ink" : "text-muted hover:bg-raised/60 hover:text-ink"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} className={cx("size-[18px]", isActive && "text-accent")} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <LinkButton to="/app/log" variant="primary" className="mt-6 w-full" icon="mic">
          Log a workout
        </LinkButton>
        <div className="mt-auto flex items-center justify-between px-3 pb-4 text-sm text-muted">
          Units
          <UnitToggle />
        </div>
        <div className="flex items-center gap-3 border-t border-line px-3 pt-5">
          <UserButton showName appearance={{ elements: { userButtonOuterIdentifier: { color: "#f4f4f5" } } }} />
        </div>
      </aside>

      {/* Phone header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/app">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <UnitToggle compact />
          <UserButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        {status === "error" && error && (
          <div className="mb-6">
            <Banner>
              Couldn't load your data. {error}{" "}
              <button
                className="cursor-pointer font-medium text-ink underline underline-offset-2"
                onClick={reload}
              >
                Retry
              </button>
            </Banner>
          </div>
        )}
        <Outlet />
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-surface/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium",
                isActive ? "text-accent" : "text-muted"
              )
            }
          >
            <Icon name={item.icon} className="size-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
