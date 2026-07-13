export default function DiffReview({
  synthResults,
  diffGroups,
  changeDecisions,
  setDecision,
  approveAllChanges,
}) {
  if (!synthResults) {
    return null;
  }

  return (
    <>
      <br />
      <h2>Proposed Resume Changes for your Review:</h2>

      <section className="diff-controls">
        <button onClick={approveAllChanges}>Approve All Changes</button>
      </section>

      <section className="diff-viewer">
        {diffGroups.map((group, index) => {
          if (group.type === "unchanged") {
            return (
              <div className="diff-row unchanged-row" key={index}>
                <pre>{group.value}</pre>
              </div>
            );
          }

          const decision = changeDecisions[index];

          return (
            <div className="diff-row side-by-side-diff" key={index}>
              <div className="diff-column old-version">
                <pre>{group.removed || ""}</pre>
              </div>

              <div className="diff-column new-version">
                <pre>{group.added || ""}</pre>
              </div>

              <div className="diff-actions">
                <button
                  className={
                    decision === "approved"
                      ? "decision-button selected-approve"
                      : "decision-button"
                  }
                  onClick={() => setDecision(index, "approved")}
                >
                  Approve
                </button>

                <button
                  className={
                    decision === "rejected"
                      ? "decision-button selected-reject"
                      : "decision-button"
                  }
                  onClick={() => setDecision(index, "rejected")}
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
