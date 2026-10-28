import type { Goal, GoalStatus, GoalType, WeightUnit } from "./api";
import { formatNumber, formatWeight } from "./stats";

export const GOAL_TYPES: { value: GoalType; label: string; hint: string }[] = [
  { value: "lift_weight", label: "Lift a weight", hint: "Heaviest set of an exercise" },
  { value: "exercise_reps", label: "Hit a rep count", hint: "Most reps in one bodyweight set" },
  { value: "body_weight", label: "Reach a body weight", hint: "Lose or gain, from your latest weigh-in" },
  { value: "weekly_workouts", label: "Train every week", hint: "Workouts per week, with a streak" },
];

/** Target or current value in the goal's own terms: "100 kg", "20 reps", "4 workouts". */
export const goalValue = (type: GoalType, value: number | null, unit: WeightUnit) => {
  if (value == null) return "—";
  switch (type) {
    case "lift_weight":
    case "body_weight":
      return formatWeight(value, unit);
    case "exercise_reps":
      return `${formatNumber(value)} reps`;
    case "weekly_workouts":
      return `${formatNumber(value)} workout${value === 1 ? "" : "s"}`;
  }
};

export const goalTitle = (goal: Goal, unit: WeightUnit) => {
  switch (goal.type) {
    case "lift_weight":
      return `${goal.exercise} ${goalValue(goal.type, goal.target, unit)}`;
    case "exercise_reps":
      return `${goal.exercise}: ${goalValue(goal.type, goal.target, unit)}`;
    case "body_weight":
      return `Weigh ${goalValue(goal.type, goal.target, unit)}`;
    case "weekly_workouts":
      return `Train ${formatNumber(goal.target)}× a week`;
  }
};

export const STATUS: Record<GoalStatus, { label: string; tone: string }> = {
  achieved: { label: "Achieved", tone: "bg-accent text-accent-ink" },
  met: { label: "Done this week", tone: "bg-accent/15 text-accent" },
  on_track: { label: "On track", tone: "bg-accent/15 text-accent" },
  behind: { label: "Behind", tone: "bg-warn/15 text-warn" },
  missed: { label: "Deadline passed", tone: "bg-danger/15 text-danger" },
  in_progress: { label: "In progress", tone: "bg-raised text-muted" },
};

/** "in 12 days", "tomorrow", "today", "3 days ago". */
export const relativeDays = (isoDate: string, now = new Date()) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
};

export const formatDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
