export default function DiffReview({
  synthResults,
  diffParts,
  changeDecisions,
  setDecision,
  approveAllChanges,
}) {
  if (!synthResults) {
    return null;
  }

  return (
    <>
      <h2>Proposed Resume Changes for your Review:</h2>

      <section className="diff-controls">
        <button onClick={approveAllChanges}>
          Approve All Changes
        </button>
      </section>

      <section className="diff-viewer">
        {diffParts.map((part, index) => {
          const className = part.added
            ? "diff-added"
            : part.removed
            ? "diff-removed"
            : "diff-unchanged";

          return (
            <div className="diff-row" key={index}>
              <div className={`diff-content ${className}`}>
                <pre>{part.value}</pre>
              </div>

              <div className="diff-actions">
                {(part.added || part.removed) && (
                  <>
                    <button
                      className={
                        changeDecisions[index] === "approved"
                          ? "decision-button selected-approve"
                          : "decision-button"
                      }
                      onClick={() => setDecision(index, "approved")}
                    >
                      Approve
                    </button>

                    <button
                      className={
                        changeDecisions[index] === "rejected"
                          ? "decision-button selected-reject"
                          : "decision-button"
                      }
                      onClick={() => setDecision(index, "rejected")}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}