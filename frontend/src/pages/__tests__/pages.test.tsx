import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkoutLog } from "../../stores/types";
import { useUserStore } from "../../stores/userStore";
import HistoryPage from "../HistoryPage";
import LogPage from "../LogPage";
import OverviewPage from "../OverviewPage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token", isLoaded: true, isSignedIn: true }),
  useUser: () => ({ user: { firstName: "Sam" } }),
}));

beforeAll(() => {
  // Recharts measures its container.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const day = (ago: number) => new Date(Date.now() - ago * 86_400_000).toISOString();

const workout = (ago: number, weight: number): WorkoutLog => ({
  id: `w${ago}`,
  date: day(ago),
  createdAt: day(ago),
  duration: 1.25,
  exercises: [
    {
      id: `b${ago}`,
      name: "Bench Press",
      category: "strength",
      aiTagged: true,
      sets: [
        { id: `s${ago}a`, reps: 8, weight },
        { id: `s${ago}b`, reps: 8, weight },
      ],
    },
    { id: `r${ago}`, name: "Running", category: "cardio", aiTagged: true, sets: [{ id: `r${ago}s`, distance: 5, duration: 0.45 }] },
  ],
});

beforeEach(() => {
  useUserStore.setState({
    status: "ready",
    error: null,
    draft: "",
    isPremium: false,
    logs: [workout(1, 82.5), workout(8, 80), workout(15, 77.5)],
    metrics: [
      { id: "m1", date: day(2), weight: 78.1, bodyFat: 17.5 },
      { id: "m2", date: day(20), weight: 79.4, bodyFat: 18.4 },
    ],
  });
});

const renderAt = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("signed-in pages", () => {
  it("overview shows this week's numbers", () => {
    renderAt(<OverviewPage />);
    expect(screen.getByText(/, Sam$/)).toBeInTheDocument();
    expect(screen.getByText("1,320")).toBeInTheDocument(); // 2 × 8 × 82.5 kg
    expect(screen.getByText("78.1")).toBeInTheDocument();
    expect(screen.getByText("-1.3 kg")).toBeInTheDocument();
  });

  it("history lists workouts with their sets", () => {
    renderAt(<HistoryPage />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText("2 × 8 reps · 82.5 kg")).toBeInTheDocument();
  });

  it("log page restores a saved draft", () => {
    useUserStore.setState({ draft: "squats 5 by 5 at 100" });
    renderAt(<LogPage />);
    expect(screen.getByRole("textbox")).toHaveValue("squats 5 by 5 at 100");
    expect(screen.getByText(/Restored the workout/)).toBeInTheDocument();
  });
});
