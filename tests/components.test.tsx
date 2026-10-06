// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  Field,
  Submit,
  FitnessContext,
  type FitnessContextValue,
} from "@/components/fitness/common";
import { Input } from "@/components/ui/input";
import Profile from "@/components/fitness/profile";
import Workouts from "@/components/fitness/workouts";
import Auth from "@/components/fitness/auth";
import { DEFAULT_PROFILE, type Snapshot } from "@/lib/types";
import { CATALOG } from "@/lib/catalog";
import { api } from "@/lib/api";
vi.mock("@/lib/api", () => ({ api: vi.fn(), download: vi.fn() }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const snapshot = {
  profile: DEFAULT_PROFILE,
  catalog: {
    exercises: CATALOG.filter((x) => x.kind === "exercises").map((x, i) => ({
      ...x,
      id: String(i),
      active: 1,
    })),
  },
  workouts: [],
} as unknown as Snapshot;
function provider(
  child: React.ReactNode,
  act = vi.fn().mockResolvedValue({ ok: true }),
  busy = false,
) {
  const navigate = vi.fn();
  const value = {
    s: snapshot,
    act,
    busy,
    navigate,
    reload: vi.fn(),
    logout: vi.fn(),
  } as FitnessContextValue;
  render(
    <FitnessContext.Provider value={value}>{child}</FitnessContext.Provider>,
  );
  return { act, navigate };
}
describe("Accessible forms and critical interactions", () => {
  it("connects a field label and hint to its control", () => {
    render(
      <Field label="Height" hint="Use centimetres">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Height");
    expect(input).toHaveAccessibleDescription("Use centimetres");
  });
  it("prevents repeat submission while busy", () => {
    const click = vi.fn();
    render(
      <Submit busy onClick={click}>
        Save session
      </Submit>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save session" }));
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });
  it("saves onboarding inputs and advances only after success", async () => {
    const { act, navigate } = provider(<Profile />);
    fireEvent.change(screen.getByLabelText("Weight (kg)"), {
      target: { value: "82" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("dashboard"));
    expect(act).toHaveBeenCalledWith(
      "profile",
      "PUT",
      expect.objectContaining({ weight: 82, onboarded: true }),
      "Your fitness profile is saved.",
    );
  });
  it("keeps failed onboarding on the same screen", async () => {
    const { navigate } = provider(
      <Profile />,
      vi.fn().mockResolvedValue(undefined),
    );
    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Save and continue/ }),
      ).toBeEnabled(),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
  it("records the actual sets, reps and duration from a manual workout", async () => {
    const { act } = provider(<Workouts />);
    fireEvent.click(screen.getByRole("button", { name: "Log a workout" }));
    fireEvent.change(screen.getByLabelText("Reps per set"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Duration (minutes)"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save workout" }));
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        "workouts",
        "POST",
        expect.objectContaining({
          source: "manual",
          reps: 16,
          sets: 2,
          duration: 720,
          metrics: [],
        }),
        "Workout saved. Your effort counts.",
      ),
    );
  });
  it("submits registration and surfaces API validation failures accessibly", async () => {
    vi.mocked(api).mockRejectedValue(
      new Error("An account with this email already exists."),
    );
    const signed = vi.fn();
    render(<Auth view="signup" navigate={vi.fn()} onAuthenticated={signed} />);
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "QA Athlete" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "qa@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Test-only password phrase" },
    });
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "already exists",
    );
    expect(signed).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith("auth/register", "POST", {
      name: "QA Athlete",
      email: "qa@example.test",
      password: "Test-only password phrase",
    });
  });
});
