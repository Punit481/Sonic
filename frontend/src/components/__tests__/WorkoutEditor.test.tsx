import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkoutEditor from "../WorkoutEditor";

const bench = {
  date: "2026-10-20T18:00:00.000Z",
  exercises: [{ name: "Bench Press", category: "strength" as const, sets: [{ reps: 8, weight: 80 }] }],
};

describe("WorkoutEditor", () => {
  it("shows weights in pounds and saves them back in kilograms", () => {
    const onSave = vi.fn();
    render(<WorkoutEditor workout={bench} unit="lb" saveLabel="Save" onSave={onSave} onCancel={() => {}} />);

    const weight = screen.getByLabelText("Bench Press set 1 Weight");
    expect(weight).toHaveValue("176.5");
    fireEvent.change(weight, { target: { value: "185" } });
    fireEvent.click(screen.getByText("Add set"));
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    const { workout } = onSave.mock.calls[0][0];
    expect(workout.date).toBe(bench.date); // the day didn't change, so the time is kept
    expect(workout.exercises[0].sets).toHaveLength(2); // "Add set" copies the last set
    expect(workout.exercises[0].sets[1].weight).toBeCloseTo(83.915, 2); // 185 lb
    expect(workout.exercises[0].sets[1].reps).toBe(8);
  });

  it("converts minutes back to hours", () => {
    const onSave = vi.fn();
    const run = { exercises: [{ name: "Running", category: "cardio" as const, sets: [{ distance: 5, duration: 0.5 }] }] };
    render(<WorkoutEditor workout={run} unit="kg" saveLabel="Save" onSave={onSave} onCancel={() => {}} />);

    expect(screen.getByLabelText("Running set 1 Minutes")).toHaveValue("30");
    fireEvent.change(screen.getByLabelText("Running set 1 Minutes"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(onSave.mock.calls[0][0].workout.exercises[0].sets[0].duration).toBe(0.75);
  });

  it("explains what's wrong instead of saving", () => {
    const onSave = vi.fn();
    render(<WorkoutEditor workout={bench} unit="kg" saveLabel="Save" onSave={onSave} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText("Exercise 1 name"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Every exercise needs a name.");
  });
});
