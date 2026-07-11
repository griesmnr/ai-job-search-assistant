import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TailorForm from "../../components/TailorForm";

describe("TailorForm", () => {
  function renderComponent(overrides = {}) {
    return render(
      <TailorForm
        resumeText=""
        setResumeText={vi.fn()}
        resumeError=""
        setResumeError={vi.fn()}
        jobDescription=""
        setJobDescription={vi.fn()}
        jobDescriptionError=""
        setJobDescriptionError={vi.fn()}
        handleTailorClick={vi.fn()}
        isTailoring={false}
        loadingMessage="Thinking..."
        {...overrides}
      />
    );
  }

  test("renders both textareas", () => {
    renderComponent();

    expect(
      screen.getByPlaceholderText(/paste your current resume/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/paste the job description/i)
    ).toBeInTheDocument();
  });

  test("updates the resume text", async () => {
    const user = userEvent.setup();

    const setResumeText = vi.fn();
    const setResumeError = vi.fn();

    renderComponent({
      setResumeText,
      setResumeError,
    });

    await user.type(
      screen.getByPlaceholderText(/paste your current resume/i),
      "Software Engineer"
    );

    expect(setResumeText).toHaveBeenCalled();
    expect(setResumeError).toHaveBeenCalledWith("");
  });

  test("updates the job description", async () => {
    const user = userEvent.setup();

    const setJobDescription = vi.fn();
    const setJobDescriptionError = vi.fn();

    renderComponent({
      setJobDescription,
      setJobDescriptionError,
    });

    await user.type(
      screen.getByPlaceholderText(/paste the job description/i),
      "Azure PostgreSQL"
    );

    expect(setJobDescription).toHaveBeenCalled();
    expect(setJobDescriptionError).toHaveBeenCalledWith("");
  });

  test("shows validation errors", () => {
    renderComponent({
      resumeError: "Resume required",
      jobDescriptionError: "Job description required",
    });

    expect(screen.getByText("Resume required")).toBeInTheDocument();
    expect(screen.getByText("Job description required")).toBeInTheDocument();
  });

  test("calls Optimize when the button is clicked", async () => {
    const user = userEvent.setup();

    const handleTailorClick = vi.fn();

    renderComponent({
      handleTailorClick,
    });

    await user.click(
      screen.getByRole("button", {
        name: "Optimize My Resume",
      })
    );

    expect(handleTailorClick).toHaveBeenCalledTimes(1);
  });

  test("shows the loading state", () => {
    renderComponent({
      isTailoring: true,
      loadingMessage: "Consulting AI models...",
    });

    expect(
      screen.getByRole("button", {
        name: "Optimizing...",
      })
    ).toBeDisabled();

    expect(screen.getByText("Consulting AI models...")).toBeInTheDocument();
  });
});
