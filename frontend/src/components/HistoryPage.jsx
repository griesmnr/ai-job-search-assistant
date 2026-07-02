import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function HistoryPage({ session }) {
  const [executions, setExecutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("tailor_resume_executions")
        .select(`
          id,
          created_at,
          company_name,
          job_title,
          user_resume,
          final_chosen_resume,
          synthesis_results (
            estimated_new_match_score,
            average_original_match_score,
            cover_letter,
            new_proposed_resume
          )
        `)
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

        const originalScore = synthesis?.average_original_match_score;
        const newScore = synthesis?.estimated_new_match_score;

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
                {new Date(execution.created_at).toLocaleDateString()}
                </p>
            </div>

            <div className="history-score">
                <span>{originalScore ?? "N/A"}%</span>
                <span className="score-arrow">→</span>
                <span>{newScore ?? "N/A"}%</span>
            </div>
            </article>
        );
        })}
      </div>
    </section>
  );
}