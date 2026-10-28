import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { useUserStore } from "../../stores/userStore";
import LogPage from "../LogPage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token", isLoaded: true, isSignedIn: true }),
}));

vi.mock("../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  parseVoiceText: vi.fn(),
  confirmVoiceLog: vi.fn(),
}));

const parsed: api.VoiceDraft = {
  transcript: "bench 3 by 5 at 85",
  workout: {
    date: new Date().toISOString(),
    exercises: [{ name: "Bench Press", category: "strength", sets: [{ reps: 5, weight: 85 }] }],
  },
  metric: null,
};

beforeEach(() => {
  vi.mocked(api.parseVoiceText).mockReset().mockResolvedValue(parsed);
  vi.mocked(api.confirmVoiceLog).mockReset();
  useUserStore.setState({ status: "ready", draft: "", logs: [], metrics: [], weightUnit: "kg" });
});

describe("logging a workout", () => {
  it("shows what was understood for review, then saves the edited version and celebrates records", async () => {
    vi.mocked(api.confirmVoiceLog).mockImplementation(async (_token, draft) => ({
      transcript: draft.transcript,
      workout: {
        id: "w1",
        date: draft.workout!.date!,
        createdAt: draft.workout!.date!,
        exercises: [
          {
            id: "e1",
            name: "Bench Press",
            category: "strength",
            aiTagged: true,
            sets: draft.workout!.exercises[0].sets.map((s, i) => ({ id: `s${i}`, ...s, intensity: null })),
          },
        ],
      },
      metric: null,
      records: [{ exercise: "Bench Press", kind: "weight", value: 87.5, previous: 85 }],
      goalsReached: [
        {
          id: "g1",
          type: "lift_weight",
          exercise: "Bench Press",
          target: 87.5,
          startValue: 80,
          current: 87.5,
          percent: 1,
          deadline: null,
          createdAt: "2026-10-01T00:00:00Z",
          achievedAt: new Date().toISOString(),
          status: "achieved",
          projectedDate: null,
          streakWeeks: null,
        },
      ],
    }));
    render(
      <MemoryRouter>
        <LogPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Workout description"), { target: { value: "bench 3 by 5 at 85" } });
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));

    // Nothing is saved yet: the user checks the AI's reading first.
    const weight = await screen.findByLabelText("Bench Press set 1 Weight");
    expect(api.confirmVoiceLog).not.toHaveBeenCalled();
    fireEvent.change(weight, { target: { value: "87.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(await screen.findByText("New personal record!")).toBeInTheDocument();
    expect(screen.getByText("Goal reached!")).toBeInTheDocument();
    expect(screen.getByText("Bench Press 87.5 kg")).toBeInTheDocument();
    expect(vi.mocked(api.confirmVoiceLog).mock.calls[0][1].workout!.exercises[0].sets[0].weight).toBe(87.5);
    expect(useUserStore.getState().logs).toHaveLength(1);
  });

  it("can repeat a recent workout without speaking", async () => {
    useUserStore.setState({
      logs: [
        {
          id: "old",
          date: "2026-10-20T18:00:00Z",
          createdAt: "2026-10-20T18:00:00Z",
          exercises: [
            { id: "e", name: "Squat", category: "strength", aiTagged: false, sets: [{ id: "s", reps: 5, weight: 100 }] },
          ],
        },
      ],
    });
    render(
      <MemoryRouter>
        <LogPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Repeat today/ }));

    expect(await screen.findByLabelText("Squat set 1 Weight")).toHaveValue("100");
    expect(api.parseVoiceText).not.toHaveBeenCalled();
  });
});
