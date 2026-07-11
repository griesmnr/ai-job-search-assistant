import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiffReview from "../../components/DiffReview";

const synthResults = {
  cover_letter: "Example cover letter",
};

const diffGroups = [
  {
    type: "unchanged",
    value: "Software Developer\n",
  },
  {
    type: "changed",
    removed: "Built backend services.\n",
    added: "Built scalable backend services.\n",
  },
  {
    type: "changed",
    removed: "",
    added: "Implemented CI/CD automation.\n",
  },
];

describe("DiffReview", () => {
  test("renders nothing when synthesis results are unavailable", () => {
    const { container } = render(
      <DiffReview
        synthResults={null}
        diffGroups={diffGroups}
        changeDecisions={{}}
        setDecision={vi.fn()}
        approveAllChanges={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders unchanged and changed resume content", () => {
    render(
      <DiffReview
        synthResults={synthResults}
        diffGroups={diffGroups}
        changeDecisions={{}}
        setDecision={vi.fn()}
        approveAllChanges={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Proposed Resume Changes for your Review:",
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/Software Developer/)).toBeInTheDocument();
    expect(screen.getByText(/Built backend services/)).toBeInTheDocument();
    expect(
      screen.getByText(/Built scalable backend services/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Implemented CI\/CD automation/)
    ).toBeInTheDocument();
  });

  test("calls approveAllChanges when Approve All Changes is clicked", async () => {
    const user = userEvent.setup();
    const approveAllChanges = vi.fn();

    render(
      <DiffReview
        synthResults={synthResults}
        diffGroups={diffGroups}
        changeDecisions={{}}
        setDecision={vi.fn()}
        approveAllChanges={approveAllChanges}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Approve All Changes" })
    );

    expect(approveAllChanges).toHaveBeenCalledTimes(1);
  });

  test("approves an individual change", async () => {
    const user = userEvent.setup();
    const setDecision = vi.fn();

    render(
      <DiffReview
        synthResults={synthResults}
        diffGroups={diffGroups}
        changeDecisions={{}}
        setDecision={setDecision}
        approveAllChanges={vi.fn()}
      />
    );

    const approveButtons = screen.getAllByRole("button", {
      name: "Approve",
    });

    await user.click(approveButtons[0]);

    expect(setDecision).toHaveBeenCalledWith(1, "approved");
  });

  test("rejects an individual change", async () => {
    const user = userEvent.setup();
    const setDecision = vi.fn();

    render(
      <DiffReview
        synthResults={synthResults}
        diffGroups={diffGroups}
        changeDecisions={{}}
        setDecision={setDecision}
        approveAllChanges={vi.fn()}
      />
    );

    const rejectButtons = screen.getAllByRole("button", {
      name: "Reject",
    });

    await user.click(rejectButtons[1]);

    expect(setDecision).toHaveBeenCalledWith(2, "rejected");
  });

  test("shows the selected decision styles", () => {
    render(
      <DiffReview
        synthResults={synthResults}
        diffGroups={diffGroups}
        changeDecisions={{
          1: "approved",
          2: "rejected",
        }}
        setDecision={vi.fn()}
        approveAllChanges={vi.fn()}
      />
    );

    const approveButtons = screen.getAllByRole("button", {
      name: "Approve",
    });

    const rejectButtons = screen.getAllByRole("button", {
      name: "Reject",
    });

    expect(approveButtons[0]).toHaveClass("selected-approve");
    expect(rejectButtons[1]).toHaveClass("selected-reject");
  });

  test("does not show decision buttons for unchanged content", () => {
    render(
      <DiffReview
        synthResults={synthResults}
        diffGroups={[
          {
            type: "unchanged",
            value: "No changes here.",
          },
        ]}
        changeDecisions={{}}
        setDecision={vi.fn()}
        approveAllChanges={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Approve" })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Reject" })
    ).not.toBeInTheDocument();
  });
});
