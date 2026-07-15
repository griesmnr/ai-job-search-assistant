import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "../../pages/HistoryPage";
import { supabase } from "../../supabase";

vi.mock("../../supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const session = {
  user: {
    id: "user-123",
  },
};

function createHistoryQuery({ data = [], error = null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue({
    data,
    error,
  });

  return query;
}

function createUpdateQuery({ error = null }) {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
  };

  query.update.mockReturnValue(query);

  // First .eq() continues the chain.
  query.eq.mockReturnValueOnce(query);

  // Second .eq() resolves the update.
  query.eq.mockResolvedValueOnce({
    error,
  });

  return query;
}

function createExecution(overrides = {}) {
  return {
    id: "execution-1",
    created_at: "2026-07-09T12:00:00.000Z",
    company_name: "Blue Origin",
    job_title: "Software Developer",
    status: "resume_optimized",
    final_chosen_resume: "Nicole Griesmeyer\n\nSoftware Developer",
    synthesis_results: [
      {
        estimated_new_match_score: 88,
        average_original_match_score: 70,
        cover_letter: "Example cover letter",
        new_proposed_resume: "Example resume",
        synthesis_brush_up_topics: [
          {
            topic: "PostgreSQL Internals",
            priority: 1,
            canonical_brush_up_topics: {
              canonical_key: "postgresql",
              display_name: "PostgreSQL",
            },
          },
          {
            topic: "Technical Writing",
            priority: 2,
            canonical_brush_up_topics: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows the loading state while history is being retrieved", () => {
    const unresolvedPromise = new Promise(() => {});

    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(unresolvedPromise);

    supabase.from.mockReturnValue(query);

    render(<HistoryPage session={session} />);

    expect(screen.getByText("Loading history...")).toBeInTheDocument();
  });

  test("shows the empty state when the user has no history", async () => {
    const historyQuery = createHistoryQuery({
      data: [],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    expect(
      await screen.findByText(
        "No history yet. Tailored resumes will appear here."
      )
    ).toBeInTheDocument();
  });

  test("loads history for the signed-in user", async () => {
    const historyQuery = createHistoryQuery({
      data: [createExecution()],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    await screen.findByRole("heading", {
      name: "Software Developer",
    });

    expect(supabase.from).toHaveBeenCalledWith("tailor_resume_executions");

    expect(historyQuery.select).toHaveBeenCalledTimes(1);

    expect(historyQuery.eq).toHaveBeenCalledWith("user_id", "user-123");

    expect(historyQuery.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  test("shows the position, company, date, and active status", async () => {
    const historyQuery = createHistoryQuery({
      data: [createExecution()],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    expect(
      await screen.findByRole("heading", {
        name: "Software Developer",
      })
    ).toBeInTheDocument();

    expect(screen.getByText("Blue Origin")).toBeInTheDocument();

    expect(
      screen.getByRole("combobox", {
        name: "Application status for Software Developer",
      })
    ).toHaveValue("resume_optimized");

    expect(screen.getByText("Applied:")).toBeInTheDocument();
  });

  test("uses canonical brush-up names and falls back to raw topics", async () => {
    const historyQuery = createHistoryQuery({
      data: [createExecution()],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    await screen.findByRole("heading", {
      name: "Software Developer",
    });

    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();

    expect(screen.queryByText("PostgreSQL Internals")).not.toBeInTheDocument();

    expect(screen.getByText("Technical Writing")).toBeInTheDocument();
  });

  test("uses fallback labels when job information is missing", async () => {
    const historyQuery = createHistoryQuery({
      data: [
        createExecution({
          job_title: null,
          company_name: null,
        }),
      ],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    expect(
      await screen.findByRole("heading", {
        name: "Unknown Position",
      })
    ).toBeInTheDocument();

    expect(screen.getByText("Unknown Company")).toBeInTheDocument();
  });

  test("updates an execution status", async () => {
    const user = userEvent.setup();

    const historyQuery = createHistoryQuery({
      data: [createExecution()],
    });

    const updateQuery = createUpdateQuery({
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(updateQuery);

    render(<HistoryPage session={session} />);

    const statusSelect = await screen.findByRole("combobox", {
      name: "Application status for Software Developer",
    });

    await user.selectOptions(statusSelect, "interviewing");

    expect(updateQuery.update).toHaveBeenCalledWith({
      status: "interviewing",
    });

    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, "id", "execution-1");

    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");

    expect(statusSelect).toHaveValue("interviewing");
  });

  test("does not change status when the database update fails", async () => {
    const user = userEvent.setup();

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const historyQuery = createHistoryQuery({
      data: [createExecution()],
    });

    const updateError = {
      message: "Update failed",
    };

    const updateQuery = createUpdateQuery({
      error: updateError,
    });

    supabase.from
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(updateQuery);

    render(<HistoryPage session={session} />);

    const statusSelect = await screen.findByRole("combobox", {
      name: "Application status for Software Developer",
    });

    expect(statusSelect).toHaveValue("resume_optimized");

    await user.selectOptions(statusSelect, "interviewing");

    expect(updateQuery.update).toHaveBeenCalledWith({
      status: "interviewing",
    });

    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, "id", "execution-1");

    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");

    expect(statusSelect).toHaveValue("resume_optimized");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Status update error:",
      updateError
    );

    consoleErrorSpy.mockRestore();
  });

  test("shows the empty state when loading history fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const historyError = {
      message: "History unavailable",
    };

    const historyQuery = createHistoryQuery({
      data: null,
      error: historyError,
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    expect(
      await screen.findByText(
        "No history yet. Tailored resumes will appear here."
      )
    ).toBeInTheDocument();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "History load error:",
      historyError
    );

    consoleErrorSpy.mockRestore();
  });

  test("shows a Final Resume button when a saved resume exists", async () => {
    const historyQuery = createHistoryQuery({
      data: [createExecution()],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    expect(
      await screen.findByRole("button", {
        name: "View final resume for Software Developer",
      })
    ).toBeInTheDocument();

    expect(screen.getByText("Final Resume")).toBeInTheDocument();
  });

  test("does not show a Final Resume button when no saved resume exists", async () => {
    const historyQuery = createHistoryQuery({
      data: [
        createExecution({
          final_chosen_resume: null,
        }),
      ],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    await screen.findByRole("heading", {
      name: "Software Developer",
    });

    expect(
      screen.queryByRole("button", {
        name: /view final resume/i,
      })
    ).not.toBeInTheDocument();
  });

  test("opens the saved final resume in a new browser tab", async () => {
    const user = userEvent.setup();

    const savedResume = "Nicole Griesmeyer\n\nSoftware Developer";

    const fakeWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
        body: {
          textContent: "",
        },
      },
    };

    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWindow);

    const historyQuery = createHistoryQuery({
      data: [
        createExecution({
          final_chosen_resume: savedResume,
        }),
      ],
    });

    supabase.from.mockReturnValue(historyQuery);

    render(<HistoryPage session={session} />);

    await user.click(
      await screen.findByRole("button", {
        name: "View final resume for Software Developer",
      })
    );

    expect(openSpy).toHaveBeenCalledWith("", "_blank");

    expect(fakeWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining("<title>Final Resume</title>")
    );

    expect(fakeWindow.document.body.textContent).toBe(savedResume);

    expect(fakeWindow.document.close).toHaveBeenCalledTimes(1);

    openSpy.mockRestore();
  });
});
