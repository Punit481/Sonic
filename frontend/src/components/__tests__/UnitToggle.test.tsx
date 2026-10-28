import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { useUserStore } from "../../stores/userStore";
import AppLayout from "../AppLayout";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token", isLoaded: true, isSignedIn: true }),
  UserButton: () => null,
}));

vi.mock("../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  updateWeightUnit: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(api.updateWeightUnit).mockReset();
  // Keep the layout from loading real data.
  useUserStore.setState({ weightUnit: "kg", status: "ready", load: async () => {} });
});

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<AppLayout />} />
      </Routes>
    </MemoryRouter>
  );

describe("weight unit switch", () => {
  it("switches to pounds and saves it", async () => {
    vi.mocked(api.updateWeightUnit).mockResolvedValue({} as api.Me);
    renderLayout();

    fireEvent.click(screen.getByRole("tab", { name: "lb" }));

    await waitFor(() => expect(api.updateWeightUnit).toHaveBeenCalledWith("token", "lb"));
    expect(useUserStore.getState().weightUnit).toBe("lb");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so when saving fails, instead of quietly going back to kg", async () => {
    vi.mocked(api.updateWeightUnit).mockRejectedValue(new Error("network"));
    renderLayout();

    fireEvent.click(screen.getByRole("tab", { name: "lb" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
    expect(useUserStore.getState().weightUnit).toBe("kg");
  });
});
