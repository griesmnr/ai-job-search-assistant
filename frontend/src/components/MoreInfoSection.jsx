export default function MoreInfoSection({
  results,
  synthResults,
  moreInfoExpanded,
  setMoreInfoExpanded,
}) {
  if (!results || !synthResults) {
    return null;
  }

  return (
    <section className="more-info-section">
      <button
        className="collapse-toggle"
        onClick={() => setMoreInfoExpanded(!moreInfoExpanded)}
      >
        {moreInfoExpanded
          ? "▼ Less Information"
          : "▶ How Are Scores and Suggestions Calculated?"}
      </button>

      {moreInfoExpanded && (
        <>
          <section className="synthesis-results">
            <h2>What is happening?</h2>
            <p>
              3 different AI models were consulted to get information on how
              well your resume matches for this job. Below explains some of the
              key takeaways from all 3 models, and then a breakdown of each
              model's opinion more granularly.
            </p>

            <h2>Model Differences</h2>
            <ul>
              {synthResults.notable_model_differences.map((item) => (
                <li key={item.topic}>
                  <strong>{item.topic}</strong>: {item.difference}
                </li>
              ))}
            </ul>

            <h2>Recommended Next Steps</h2>
            <ol>
              {synthResults.recommended_next_steps.map((step) => (
                <li key={step.priority}>{step.action}</li>
              ))}
            </ol>

            {synthResults.estimated_new_match_score_explanation && (
              <>
                <h2>New Score Explanation</h2>
                <p>{synthResults.estimated_new_match_score_explanation}</p>
              </>
            )}
          </section>

          <section className="comparison-table">
            <div className="comparison-corner"></div>

            {results.map((result) => (
              <div className="comparison-column-header" key={result.provider}>
                <h3>{result.provider}</h3>
                <p>{result.model}</p>
              </div>
            ))}

            <div className="comparison-row-label">Match Score</div>

            {results.map((result) => (
              <section
                className={`provider-card score-card ${
                  result.success ? "" : "provider-error-card"
                }`}
                key={`${result.provider}-score`}
              >
                {result.success ? (
                  <>
                    <p className="match-score-number">
                      {result.analysis.match_score}%
                    </p>
                    <h4>Explanation</h4>
                    <p>{result.analysis.match_score_explanation}</p>
                  </>
                ) : (
                  <>
                    <p className="provider-unavailable">Unavailable</p>
                    <h4>Provider Error</h4>
                    <p>
                      {result.provider} could not complete this analysis. The
                      resume was tailored using the available models.
                    </p>
                  </>
                )}
              </section>
            ))}

            <div className="comparison-row-label">Missing Keywords</div>

            {results.map((result) => (
              <section
                className={`provider-card ${
                  result.success ? "" : "provider-error-card"
                }`}
                key={`${result.provider}-keywords`}
              >
                {result.success ? (
                  <ul>
                    {result.analysis.missing_keywords.map((keyword) => (
                      <li
                        key={`${result.provider}-${keyword.priority}-${keyword.keyword}`}
                      >
                        Priority: {keyword.priority} keyword: {keyword.keyword}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="provider-unavailable">Unavailable</p>
                    <p>
                      Missing keywords are unavailable because {result.provider}
                      could not complete this analysis.
                    </p>
                  </>
                )}
              </section>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
