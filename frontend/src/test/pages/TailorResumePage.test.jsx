import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TailorResumePage from "../../pages/TailorResumePage";

vi.mock("../../components/TailorForm", () => ({
  default: ({ resumeText, jobDescription, isTailoring, loadingMessage }) => (
    <div data-testid="tailor-form">
      <span>{resumeText}</span>
      <span>{jobDescription}</span>
      <span>{isTailoring ? loadingMessage : "Not loading"}</span>
    </div>
  ),
}));

vi.mock("../../components/ScoreSummary", () => ({
  default: ({ synthResults }) => (
    <div data-testid="score-summary">
      {synthResults?.estimated_new_match_score}
    </div>
  ),
}));

vi.mock("../../components/MoreInfoSection", () => ({
  default: ({ results, moreInfoExpanded }) => (
    <div data-testid="more-info-section">
      <span>{results?.length}</span>
      <span>{moreInfoExpanded ? "Expanded" : "Collapsed"}</span>
    </div>
  ),
}));

vi.mock("../../components/DiffReview", () => ({
  default: ({ diffGroups, changeDecisions }) => (
    <div data-testid="diff-review">
      <span>{diffGroups?.length}</span>
      <span>{changeDecisions?.[1]}</span>
    </div>
  ),
}));

vi.mock("../../components/FinalResume", () => ({
  default: ({ allChangesReviewed, finalResumeText }) => (
    <div data-testid="final-resume">
      <span>{allChangesReviewed ? "Reviewed" : "Not reviewed"}</span>
      <span>{finalResumeText}</span>
    </div>
  ),
}));

describe("TailorResumePage", () => {
  function renderPage(overrides = {}) {
    const props = {
      resumeText: "Nicole's resume",
      setResumeText: vi.fn(),
      resumeError: "",
      setResumeError: vi.fn(),

      jobDescription: "Software Engineer job posting",
      setJobDescription: vi.fn(),
      jobDescriptionError: "",
      setJobDescriptionError: vi.fn(),

      handleTailorClick: vi.fn(),
      isTailoring: false,
      loadingMessage: "Consulting AI models...",

      synthResults: {
        estimated_new_match_score: 88,
        cover_letter: "Example cover letter",
      },

      results: [
        {
          provider: "OpenAI",
          success: true,
        },
        {
          provider: "Claude",
          success: true,
        },
      ],

      moreInfoExpanded: true,
      setMoreInfoExpanded: vi.fn(),

      approveAllChanges: vi.fn(),

      diffGroups: [
        {
          type: "unchanged",
          value: "Software Developer",
        },
        {
          type: "changed",
          removed: "Old bullet",
          added: "New bullet",
        },
      ],

      changeDecisions: {
        1: "approved",
      },

      setDecision: vi.fn(),
      allChangesReviewed: true,
      finalResumeText: "Final optimized resume",

      ...overrides,
    };

    render(<TailorResumePage {...props} />);

    return props;
  }

  test("renders every section of the resume optimization workflow", () => {
    renderPage();

    expect(screen.getByTestId("tailor-form")).toBeInTheDocument();
    expect(screen.getByTestId("score-summary")).toBeInTheDocument();
    expect(screen.getByTestId("more-info-section")).toBeInTheDocument();
    expect(screen.getByTestId("diff-review")).toBeInTheDocument();
    expect(screen.getByTestId("final-resume")).toBeInTheDocument();
  });

  test("passes form data to TailorForm", () => {
    renderPage();

    const form = screen.getByTestId("tailor-form");

    expect(form).toHaveTextContent("Nicole's resume");
    expect(form).toHaveTextContent("Software Engineer job posting");
    expect(form).toHaveTextContent("Not loading");
  });

  test("passes synthesis data to ScoreSummary", () => {
    renderPage();

    expect(screen.getByTestId("score-summary")).toHaveTextContent("88");
  });

  test("passes provider results and expansion state to MoreInfoSection", () => {
    renderPage();

    const moreInfo = screen.getByTestId("more-info-section");

    expect(moreInfo).toHaveTextContent("2");
    expect(moreInfo).toHaveTextContent("Expanded");
  });

  test("passes diff groups and decisions to DiffReview", () => {
    renderPage();

    const diffReview = screen.getByTestId("diff-review");

    expect(diffReview).toHaveTextContent("2");
    expect(diffReview).toHaveTextContent("approved");
  });

  test("passes the reviewed final resume to FinalResume", () => {
    renderPage();

    const finalResume = screen.getByTestId("final-resume");

    expect(finalResume).toHaveTextContent("Reviewed");
    expect(finalResume).toHaveTextContent("Final optimized resume");
  });

  test("passes the loading state to TailorForm", () => {
    renderPage({
      isTailoring: true,
      loadingMessage: "Synthesizing recommendations...",
    });

    expect(screen.getByTestId("tailor-form")).toHaveTextContent(
      "Synthesizing recommendations..."
    );
  });
});
