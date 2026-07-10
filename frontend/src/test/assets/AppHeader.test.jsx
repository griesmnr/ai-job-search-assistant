import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../supabase";

vi.mock("../../supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows the application title", () => {
    render(<AppHeader session={null} />);

    expect(
      screen.getByRole("heading", { name: "Resume Optimizer" })
    ).toBeInTheDocument();
  });

  test("shows the signed-in user's first name", () => {
    const session = {
      user: {
        email: "nicole@example.com",
        user_metadata: {
          full_name: "Nicole Griesmeyer",
        },
      },
    };

    render(<AppHeader session={session} />);

    expect(screen.getByText("Nicole")).toBeInTheDocument();
  });

  test("uses the email username when a full name is unavailable", () => {
    const session = {
      user: {
        email: "nicole@example.com",
        user_metadata: {},
      },
    };

    render(<AppHeader session={session} />);

    expect(screen.getByText("nicole")).toBeInTheDocument();
  });

  test("signs the user out when Log Out is clicked", async () => {
    const user = userEvent.setup();

    const session = {
      user: {
        email: "nicole@example.com",
        user_metadata: {
          full_name: "Nicole Griesmeyer",
        },
      },
    };

    render(<AppHeader session={session} />);

    await user.click(screen.getByRole("button", { name: "Log Out" }));

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  test("does not show user controls without a session", () => {
    render(<AppHeader session={null} />);

    expect(
      screen.queryByRole("button", { name: "Log Out" })
    ).not.toBeInTheDocument();
  });
});
