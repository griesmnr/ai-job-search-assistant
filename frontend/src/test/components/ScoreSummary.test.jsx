import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreSummary from "../../components/ScoreSummary";

describe("ScoreSummary", () => {
  test("renders nothing when synthesis results are unavailable", () => {
    const { container } = render(<ScoreSummary synthResults={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  test("shows the original and estimated match scores", () => {
    const synthResults = {
      average_original_match_score: 64,
      estimated_new_match_score: 88,
    };

    render(<ScoreSummary synthResults={synthResults} />);

    expect(
      screen.getByRole("heading", {
        name: "Current Resume Job Match Score",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "New Resume Job Match Score",
      })
    ).toBeInTheDocument();

    expect(screen.getByText("64%")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });
});
