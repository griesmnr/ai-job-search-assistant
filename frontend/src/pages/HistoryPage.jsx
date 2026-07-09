import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function HistoryPage({ session }) {
  async function toggleExecutionStatus(execution) {
    const nextIsActive = !execution.is_active;

    const { error } = await supabase
      .from("tailor_resume_executions")
      .update({ is_active: nextIsActive })
      .eq("id", execution.id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Status update error:", error);
      return;
    }

    setExecutions((currentExecutions) =>
      currentExecutions.map((item) =>
        item.id === execution.id ? { ...item, is_active: nextIsActive } : item
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
          is_active,
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

                <button
                  type="button"
                  className={`status-toggle ${
                    execution.is_active ? "status-active" : "status-inactive"
                  }`}
                  onClick={() => toggleExecutionStatus(execution)}
                >
                  {execution.is_active ? "Active" : "Inactive"}
                </button>
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
