import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import FinalResume from "../../components/FinalResume";

describe("FinalResume", () => {
  const synthResults = {
    cover_letter: "Dear Hiring Manager,\n\nThank you for your consideration.",
  };

  test("renders nothing when synthesis results are unavailable", () => {
    const { container } = render(
      <FinalResume
        synthResults={null}
        allChangesReviewed={true}
        finalResumeText="Resume"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing until all changes are reviewed", () => {
    const { container } = render(
      <FinalResume
        synthResults={synthResults}
        allChangesReviewed={false}
        finalResumeText="Resume"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders the final resume and cover letter", () => {
    const finalResumeText = `Nicole Griesmeyer

Software Engineer`;

    render(
      <FinalResume
        synthResults={synthResults}
        allChangesReviewed={true}
        finalResumeText={finalResumeText}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Final Resume" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Cover Letter" })
    ).toBeInTheDocument();

    const textareas = screen.getAllByRole("textbox");

    expect(textareas).toHaveLength(2);

    expect(textareas[0].value).toContain("Nicole Griesmeyer");
    expect(textareas[0].value).toContain("Software Engineer");

    expect(textareas[1]).toHaveValue(synthResults.cover_letter);
  });

  test("renders read-only text areas", () => {
    render(
      <FinalResume
        synthResults={synthResults}
        allChangesReviewed={true}
        finalResumeText="Resume"
      />
    );

    const textAreas = screen.getAllByRole("textbox");

    expect(textAreas).toHaveLength(2);

    textAreas.forEach((textArea) => {
      expect(textArea).toHaveAttribute("readonly");
    });
  });
});
