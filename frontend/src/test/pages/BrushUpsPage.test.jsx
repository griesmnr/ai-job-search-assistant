import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BrushUpsPage from "../../pages/BrushUpsPage";
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

function mockSupabaseResponse({ data = [], error = null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockResolvedValue({
    data,
    error,
  });

  supabase.from.mockReturnValue(query);

  return query;
}

describe("BrushUpsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("asks the user to sign in when no session is available", () => {
    render(<BrushUpsPage session={null} />);

    expect(
      screen.getByText("Please sign in to view brush-ups.")
    ).toBeInTheDocument();

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("shows the empty state when there are no brush-ups", async () => {
    mockSupabaseResponse({
      data: [],
    });

    render(<BrushUpsPage session={session} />);

    expect(
      await screen.findByText(
        "No brush-ups yet. Active job opportunities will generate topics here."
      )
    ).toBeInTheDocument();
  });

  test("loads brush-ups for the signed-in user", async () => {
    const query = mockSupabaseResponse({
      data: [],
    });

    render(<BrushUpsPage session={session} />);

    await screen.findByText(
      "No brush-ups yet. Active job opportunities will generate topics here."
    );

    expect(supabase.from).toHaveBeenCalledWith("tailor_resume_executions");

    expect(query.select).toHaveBeenCalledTimes(1);

    expect(query.eq).toHaveBeenNthCalledWith(1, "user_id", "user-123");

    expect(query.in).toHaveBeenCalledWith("status", [
      "resume_optimized",
      "applied",
      "interviewing",
      "awaiting_response",
    ]);
  });

  test("uses the canonical display name when one exists", async () => {
    mockSupabaseResponse({
      data: [
        {
          id: "execution-1",
          synthesis_results: [
            {
              synthesis_brush_up_topics: [
                {
                  topic: "PostgreSQL Internals",
                  priority: 1,
                  why_it_matters: "Database expertise is important.",
                  canonical_brush_up_topics: {
                    id: "canonical-1",
                    canonical_key: "postgresql",
                    display_name: "PostgreSQL",
                    category: "databases",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    render(<BrushUpsPage session={session} />);

    expect(
      await screen.findByRole("heading", {
        name: "PostgreSQL",
      })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "PostgreSQL Internals",
      })
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Appears in 1 active opportunity.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Database expertise is important.")
    ).toBeInTheDocument();
  });

  test("falls back to the raw topic when no canonical topic exists", async () => {
    mockSupabaseResponse({
      data: [
        {
          id: "execution-1",
          synthesis_results: [
            {
              synthesis_brush_up_topics: [
                {
                  topic: "Technical Writing",
                  priority: 2,
                  why_it_matters:
                    "The role requires clear technical documentation.",
                  canonical_brush_up_topics: null,
                },
              ],
            },
          ],
        },
      ],
    });

    render(<BrushUpsPage session={session} />);

    expect(
      await screen.findByRole("heading", {
        name: "Technical Writing",
      })
    ).toBeInTheDocument();
  });

  test("groups matching canonical topics across active opportunities", async () => {
    mockSupabaseResponse({
      data: [
        {
          id: "execution-1",
          synthesis_results: [
            {
              synthesis_brush_up_topics: [
                {
                  topic: "AWS Services",
                  priority: 3,
                  why_it_matters: "The first job requires cloud experience.",
                  canonical_brush_up_topics: {
                    id: "canonical-aws",
                    canonical_key: "aws",
                    display_name: "AWS",
                    category: "cloud",
                  },
                },
              ],
            },
          ],
        },
        {
          id: "execution-2",
          synthesis_results: [
            {
              synthesis_brush_up_topics: [
                {
                  topic: "Amazon Web Services",
                  priority: 1,
                  why_it_matters: "The second job also requires AWS.",
                  canonical_brush_up_topics: {
                    id: "canonical-aws",
                    canonical_key: "aws",
                    display_name: "AWS",
                    category: "cloud",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    render(<BrushUpsPage session={session} />);

    expect(
      await screen.findByRole("heading", {
        name: "AWS",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Appears in 2 active opportunities.")
    ).toBeInTheDocument();

    expect(screen.getAllByRole("heading", { name: "AWS" })).toHaveLength(1);
  });

  test("sorts topics by frequency before priority", async () => {
    mockSupabaseResponse({
      data: [
        {
          id: "execution-1",
          synthesis_results: [
            {
              synthesis_brush_up_topics: [
                {
                  topic: "Terraform",
                  priority: 1,
                  why_it_matters: "Infrastructure knowledge matters.",
                  canonical_brush_up_topics: null,
                },
                {
                  topic: "AWS Services",
                  priority: 5,
                  why_it_matters: "Cloud knowledge matters.",
                  canonical_brush_up_topics: {
                    id: "canonical-aws",
                    canonical_key: "aws",
                    display_name: "AWS",
                    category: "cloud",
                  },
                },
              ],
            },
          ],
        },
        {
          id: "execution-2",
          synthesis_results: [
            {
              synthesis_brush_up_topics: [
                {
                  topic: "Amazon Web Services",
                  priority: 5,
                  why_it_matters: "Cloud knowledge matters.",
                  canonical_brush_up_topics: {
                    id: "canonical-aws",
                    canonical_key: "aws",
                    display_name: "AWS",
                    category: "cloud",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    render(<BrushUpsPage session={session} />);

    await screen.findByRole("heading", {
      name: "AWS",
    });

    const topicHeadings = screen.getAllByRole("heading", {
      level: 3,
    });

    expect(topicHeadings[0]).toHaveTextContent("AWS");
    expect(topicHeadings[1]).toHaveTextContent("Terraform");
  });

  test("shows the empty state when the Supabase query fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockSupabaseResponse({
      data: null,
      error: {
        message: "Database unavailable",
      },
    });

    render(<BrushUpsPage session={session} />);

    expect(
      await screen.findByText(
        "No brush-ups yet. Active job opportunities will generate topics here."
      )
    ).toBeInTheDocument();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Brush ups load error:", {
      message: "Database unavailable",
    });

    consoleErrorSpy.mockRestore();
  });
});
