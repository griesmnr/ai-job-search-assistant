import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function BrushUpsPage({ session }) {
  const [brushUps, setBrushUps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBrushUps() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("tailor_resume_executions")
        .select(`
          id,
          company_name,
          job_title,
          is_active,
          synthesis_results (
            synthesis_brush_up_topics (
              topic,
              priority,
              why_it_matters
            )
          )
        `)
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      if (error) {
        console.error("Brush ups load error:", error);
        setIsLoading(false);
        return;
      }

      const topicMap = new Map();

      data.forEach((execution) => {
        const synthesis = execution.synthesis_results?.[0];
        const topics = synthesis?.synthesis_brush_up_topics ?? [];

        topics.forEach((brushUp) => {
          const normalizedTopic = brushUp.topic.trim();

          if (!normalizedTopic) {
            return;
          }

          const key = normalizedTopic.toLowerCase();

          if (!topicMap.has(key)) {
            topicMap.set(key, {
              topic: normalizedTopic,
              count: 0,
              bestPriority: brushUp.priority ?? 999,
              whyItMatters: brushUp.why_it_matters,
            });
          }

          const existing = topicMap.get(key);

          existing.count += 1;
          existing.bestPriority = Math.min(
            existing.bestPriority,
            brushUp.priority ?? 999
          );

          if (!existing.whyItMatters && brushUp.why_it_matters) {
            existing.whyItMatters = brushUp.why_it_matters;
          }
        });
      });

      const sortedBrushUps = Array.from(topicMap.values()).sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.bestPriority - b.bestPriority;
      });

      setBrushUps(sortedBrushUps);
      setIsLoading(false);
    }

    if (session?.user?.id) {
      loadBrushUps();
    }
  }, [session]);

  if (!session?.user?.id) {
    return <p>Please sign in to view brush-ups.</p>;
  }

  if (isLoading) {
    return <p>Loading brush-ups...</p>;
  }

  if (brushUps.length === 0) {
    return <p>No brush-ups yet. Active job opportunities will generate topics here.</p>;
  }

  return (
    <section className="brushups-page">
      <h2>Brush Ups</h2>

      <p className="brushups-intro">
        Prioritized topics from your active job opportunities.
      </p>

      <div className="brushups-list">
        {brushUps.map((brushUp) => (
          <article className="brushup-card" key={brushUp.topic}>
            <div>
              <h3>{brushUp.topic}</h3>

              <p>
                Appears in {brushUp.count} active{" "}
                {brushUp.count === 1 ? "opportunity" : "opportunities"}.
              </p>

              {brushUp.whyItMatters && (
                <p className="brushup-reason">{brushUp.whyItMatters}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}