export default function ScoreSummary({ synthResults }) {
  if (!synthResults) {
    return null;
  }

  return (
    <section className="score-summary">
      <div className="score-card-large">
        <h2>Current Resume Job Match Score</h2>
        <p>{synthResults.average_original_match_score}%</p>
      </div>

      <div className="score-card-large">
        <h2>New Resume Job Match Score</h2>
        <p>{synthResults.estimated_new_match_score}%</p>
      </div>
    </section>
  );
}