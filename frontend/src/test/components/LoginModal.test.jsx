import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginModal from "../../components/LoginModal";
import { supabase } from "../../supabase";

vi.mock("../../supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe("LoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders the login modal", () => {
    render(<LoginModal onClose={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "Sign in to tailor your resume",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Continue with Google",
      })
    ).toBeInTheDocument();
  });

  test("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<LoginModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "×" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onBeforeSignIn before starting authentication", async () => {
    const user = userEvent.setup();

    const onBeforeSignIn = vi.fn();

    supabase.auth.signInWithOAuth.mockResolvedValue({
      error: null,
    });

    render(<LoginModal onClose={vi.fn()} onBeforeSignIn={onBeforeSignIn} />);

    await user.click(
      screen.getByRole("button", {
        name: "Continue with Google",
      })
    );

    expect(onBeforeSignIn).toHaveBeenCalledTimes(1);
  });

  test("starts Google OAuth", async () => {
    const user = userEvent.setup();

    supabase.auth.signInWithOAuth.mockResolvedValue({
      error: null,
    });

    render(<LoginModal onClose={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: "Continue with Google",
      })
    );

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  });

  test("shows an alert when sign-in fails", async () => {
    const user = userEvent.setup();

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    supabase.auth.signInWithOAuth.mockResolvedValue({
      error: {
        message: "Authentication failed",
      },
    });

    render(<LoginModal onClose={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: "Continue with Google",
      })
    );

    expect(alertSpy).toHaveBeenCalledWith("Authentication failed");

    alertSpy.mockRestore();
  });
});
