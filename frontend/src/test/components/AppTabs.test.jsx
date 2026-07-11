import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppTabs from "../../components/AppTabs";

describe("AppTabs", () => {
  test("shows all application tabs", () => {
    render(<AppTabs activeTab="tailor" setActiveTab={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Optimize a Resume" })
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Brush Ups" })
    ).toBeInTheDocument();
  });

  test("marks the current tab as active", () => {
    render(<AppTabs activeTab="history" setActiveTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "History" })).toHaveClass(
      "active-tab"
    );

    expect(
      screen.getByRole("button", { name: "Optimize a Resume" })
    ).not.toHaveClass("active-tab");
  });

  test.each([
    ["Optimize a Resume", "tailor"],
    ["History", "history"],
    ["Brush Ups", "brushups"],
  ])("selects %s when clicked", async (buttonName, expectedTab) => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();

    render(<AppTabs activeTab="tailor" setActiveTab={setActiveTab} />);

    await user.click(screen.getByRole("button", { name: buttonName }));

    expect(setActiveTab).toHaveBeenCalledWith(expectedTab);
  });
});
