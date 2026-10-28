import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { goalTitle, relativeDays } from "../../lib/goals";
import { useUserStore } from "../../stores/userStore";
import GoalsPage from "../GoalsPage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token", isLoaded: true, isSignedIn: true }),
}));

vi.mock("../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  fetchGoals: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  fetchExercises: vi.fn(),
}));

const goal = (over: Partial<api.Goal>): api.Goal => ({
  id: "g",
  type: "lift_weight",
  exercise: "Bench Press",
  target: 100,
  startValue: 80,
  current: 90,
  percent: 0.5,
  deadline: null,
  createdAt: "2026-10-01T00:00:00Z",
  achievedAt: null,
  status: "in_progress",
  projectedDate: null,
  streakWeeks: null,
  ...over,
});

beforeEach(() => {
  vi.mocked(api.fetchGoals).mockReset();
  vi.mocked(api.createGoal).mockReset().mockResolvedValue(goal({}));
  vi.mocked(api.fetchExercises).mockReset().mockResolvedValue([]);
  useUserStore.setState({ status: "ready", logs: [], metrics: [], weightUnit: "kg" });
});

const renderPage = (url = "/app/goals") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <GoalsPage />
    </MemoryRouter>
  );

describe("goals page", () => {
  it("shows active and achieved goals with their progress", async () => {
    vi.mocked(api.fetchGoals).mockResolvedValue([
      goal({ id: "a", projectedDate: "2026-12-01", status: "on_track", deadline: "2027-01-31" }),
      goal({ id: "w", type: "weekly_workouts", exercise: null, target: 4, current: 2, startValue: null, streakWeeks: 3 }),
      goal({ id: "b", type: "body_weight", exercise: null, target: 75, achievedAt: "2026-10-20T08:00:00Z", status: "achieved", percent: 1 }),
    ]);
    renderPage();

    expect(await screen.findByText("Bench Press 100 kg")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.getByText(/At your current pace: Dec 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Train 4× a week")).toBeInTheDocument();
    expect(screen.getByText("🔥 3-week streak")).toBeInTheDocument();
    expect(screen.getByText("Achieved · 1")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute("aria-valuenow", "50");
  });

  it("creates a goal from an exercise link, sending pounds as kilograms", async () => {
    useUserStore.setState({ weightUnit: "lb" });
    vi.mocked(api.fetchGoals).mockResolvedValue([]);
    renderPage("/app/goals?new=lift_weight&exercise=Squat");

    fireEvent.change(await screen.findByLabelText("Target"), { target: { value: "315" } });
    fireEvent.click(screen.getByRole("button", { name: /Set goal/ }));

    await waitFor(() => expect(api.createGoal).toHaveBeenCalled());
    const sent = vi.mocked(api.createGoal).mock.calls[0][1];
    expect(sent.type).toBe("lift_weight");
    expect(sent.exercise).toBe("Squat");
    expect(sent.target).toBeCloseTo(142.882, 2);
  });

  it("doesn't submit without a target", async () => {
    vi.mocked(api.fetchGoals).mockResolvedValue([]);
    renderPage("/app/goals?new=body_weight");

    fireEvent.click(await screen.findByRole("button", { name: /Set goal/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a target above zero.");
    expect(api.createGoal).not.toHaveBeenCalled();
  });
});

describe("goal helpers", () => {
  it("names goals in the user's unit", () => {
    expect(goalTitle(goal({}), "lb")).toBe("Bench Press 220.5 lb");
    expect(goalTitle(goal({ type: "exercise_reps", exercise: "Pull Up", target: 20 }), "kg")).toBe("Pull Up: 20 reps");
  });

  it("describes dates relative to today", () => {
    const now = new Date(2026, 9, 29);
    expect(relativeDays("2026-10-29", now)).toBe("today");
    expect(relativeDays("2026-10-30", now)).toBe("tomorrow");
    expect(relativeDays("2026-11-08", now)).toBe("in 10 days");
  });
});
