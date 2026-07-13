import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoreInfoSection from "../../components/MoreInfoSection";

const successfulResult = {
  provider: "OpenAI",
  model: "gpt-4.1-mini",
  success: true,
  analysis: {
    match_score: 72,
    match_score_explanation: "Strong backend alignment.",
    missing_keywords: [
      {
        priority: 1,
        keyword: "Terraform",
      },
    ],
  },
};

const failedResult = {
  provider: "Gemini",
  model: "gemini-3.5-flash",
  success: false,
};

const synthResults = {
  notable_model_differences: [
    {
      topic: "Cloud experience",
      difference: "The models weighted AWS experience differently.",
    },
  ],
  recommended_next_steps: [
    {
      priority: 1,
      action: "Emphasize Kubernetes experience.",
    },
  ],
  estimated_new_match_score_explanation:
    "The proposed changes improve alignment with the posting.",
};

describe("MoreInfoSection", () => {
  test("renders nothing when results are unavailable", () => {
    const { container } = render(
      <MoreInfoSection
        results={null}
        synthResults={synthResults}
        moreInfoExpanded={false}
        setMoreInfoExpanded={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when synthesis results are unavailable", () => {
    const { container } = render(
      <MoreInfoSection
        results={[successfulResult]}
        synthResults={null}
        moreInfoExpanded={false}
        setMoreInfoExpanded={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("shows the collapsed state", () => {
    render(
      <MoreInfoSection
        results={[successfulResult]}
        synthResults={synthResults}
        moreInfoExpanded={false}
        setMoreInfoExpanded={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /How Are Scores and Suggestions Calculated?/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", { name: "Model Differences" })
    ).not.toBeInTheDocument();
  });

  test("requests expansion when the button is clicked", async () => {
    const user = userEvent.setup();
    const setMoreInfoExpanded = vi.fn();

    render(
      <MoreInfoSection
        results={[successfulResult]}
        synthResults={synthResults}
        moreInfoExpanded={false}
        setMoreInfoExpanded={setMoreInfoExpanded}
      />
    );

    await user.click(screen.getByRole("button", { name: /How are Scores/i }));

    expect(setMoreInfoExpanded).toHaveBeenCalledWith(true);
  });

  test("shows synthesis details when expanded", () => {
    render(
      <MoreInfoSection
        results={[successfulResult]}
        synthResults={synthResults}
        moreInfoExpanded={true}
        setMoreInfoExpanded={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /less information/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Model Differences" })
    ).toBeInTheDocument();

    expect(screen.getByText("Cloud experience")).toBeInTheDocument();

    const cloudExperienceItem = screen
      .getByText("Cloud experience")
      .closest("li");

    expect(cloudExperienceItem).toHaveTextContent(
      /Cloud experience:\s*The models weighted AWS experience differently\./i
    );

    expect(
      screen.getByText("Emphasize Kubernetes experience.")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "The proposed changes improve alignment with the posting."
      )
    ).toBeInTheDocument();
  });

  test("shows successful provider analysis", () => {
    render(
      <MoreInfoSection
        results={[successfulResult]}
        synthResults={synthResults}
        moreInfoExpanded={true}
        setMoreInfoExpanded={vi.fn()}
      />
    );

    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("gpt-4.1-mini")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Strong backend alignment.")).toBeInTheDocument();
    expect(
      screen.getByText("Priority: 1 keyword: Terraform")
    ).toBeInTheDocument();
  });

  test("shows fallback content when a provider fails", () => {
    render(
      <MoreInfoSection
        results={[failedResult]}
        synthResults={synthResults}
        moreInfoExpanded={true}
        setMoreInfoExpanded={vi.fn()}
      />
    );

    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("gemini-3.5-flash")).toBeInTheDocument();

    expect(screen.getAllByText("Unavailable")).toHaveLength(2);

    expect(
      screen.getByText(
        /Gemini could not complete this analysis. The resume was tailored using the available models./i
      )
    ).toBeInTheDocument();

    const unavailableMessages = screen.getAllByText("Unavailable");
    const missingKeywordsCard = unavailableMessages[1].closest("section");

    expect(missingKeywordsCard).toHaveTextContent(
      /Missing keywords are unavailable because\s*Gemini\s*could not complete this analysis\./i
    );
  });
});
