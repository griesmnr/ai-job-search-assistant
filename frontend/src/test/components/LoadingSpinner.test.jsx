import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../../components/LoadingSpinner";

describe("LoadingSpinner", () => {
  test("shows the provided loading message", () => {
    render(<LoadingSpinner message="Comparing AI recommendations..." />);

    expect(
      screen.getByText("Comparing AI recommendations...")
    ).toBeInTheDocument();
  });

  test("renders the spinner element", () => {
    const { container } = render(
      <LoadingSpinner message="Optimizing your resume..." />
    );

    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });
});
