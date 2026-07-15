import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const STATUS_OPTIONS = [
  {
    value: "resume_optimized",
    label: "Resume Optimized",
  },
  {
    value: "applied",
    label: "Applied",
  },
  {
    value: "interviewing",
    label: "Interviewing",
  },
  {
    value: "awaiting_response",
    label: "Awaiting Response",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "no_longer_interested",
    label: "No Longer Interested",
  },
];

export default function HistoryPage({ session }) {
  function openFinalResume(finalResumeText) {
    const resumeWindow = window.open("", "_blank");

    if (!resumeWindow) {
      return;
    }

    resumeWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Final Resume</title>
        <style>
          body {
            max-width: 850px;
            margin: 3rem auto;
            padding: 0 2rem;
            font-family: Arial, sans-serif;
            line-height: 1.5;
            white-space: pre-wrap;
          }
        </style>
      </head>

      <body></body>
    </html>
  `);

    resumeWindow.document.body.textContent = finalResumeText;
    resumeWindow.document.close();
  }

  async function updateExecutionStatus(executionId, status) {
    const { error } = await supabase
      .from("tailor_resume_executions")
      .update({ status })
      .eq("id", executionId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Status update error:", error);
      return;
    }

    setExecutions((currentExecutions) =>
      currentExecutions.map((execution) =>
        execution.id === executionId ? { ...execution, status } : execution
      )
    );
  }

  const [executions, setExecutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("tailor_resume_executions")
        .select(
          `
          id,
          created_at,
          company_name,
          job_title,
          status,
          final_chosen_resume,
          synthesis_results (
            estimated_new_match_score,
            average_original_match_score,
            cover_letter,
            new_proposed_resume,
            synthesis_brush_up_topics (
              topic,
              priority,
              canonical_brush_up_topics (
                canonical_key,
                display_name
              )
            )
          )
        `
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("History load error:", error);
      } else {
        setExecutions(data);
      }

      setIsLoading(false);
    }

    if (session?.user?.id) {
      loadHistory();
    }
  }, [session]);

  if (isLoading) {
    return <p>Loading history...</p>;
  }

  if (executions.length === 0) {
    return <p>No history yet. Tailored resumes will appear here.</p>;
  }

  return (
    <section className="history-page">
      <h2>History</h2>

      <div className="history-list">
        {executions.map((execution) => {
          const synthesis = execution.synthesis_results?.[0];

          const brushUps = synthesis?.synthesis_brush_up_topics ?? [];

          return (
            <article className="history-card" key={execution.id}>
              <div className="history-card-main">
                <div>
                  <h3>{execution.job_title || "Unknown Position"}</h3>
                  <p className="history-company">
                    {execution.company_name || "Unknown Company"}
                  </p>
                </div>

                <p className="history-date">
                  <strong>Applied:</strong>{" "}
                  {new Date(execution.created_at).toLocaleDateString()}
                </p>

                <div className="history-card-actions">
                  {execution.final_chosen_resume && (
                    <button
                      type="button"
                      className="final-resume-link"
                      onClick={() =>
                        openFinalResume(execution.final_chosen_resume)
                      }
                      aria-label={`View final resume for ${
                        execution.job_title || "this position"
                      }`}
                    >
                      <span aria-hidden="true">📄</span>
                      Final Resume
                    </button>
                  )}

                  <label className="history-status-control">
                    <span className="sr-only">Status: </span>

                    <select
                      className={`history-status-select status-${execution.status}`}
                      value={execution.status}
                      onChange={(event) =>
                        updateExecutionStatus(execution.id, event.target.value)
                      }
                      aria-label={`Application status for ${
                        execution.job_title || "this position"
                      }`}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="history-brushups">
                <span className="history-label">Brush-up Topics</span>

                <ul className="brushup-list">
                  {brushUps.map((brushUp) => {
                    const displayTopic =
                      brushUp.canonical_brush_up_topics?.display_name ??
                      brushUp.topic;

                    const key =
                      brushUp.canonical_brush_up_topics?.canonical_key ??
                      brushUp.topic;

                    return <li key={key}>{displayTopic}</li>;
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
