import { useState } from "react";
import "./App.css";
import { diffLines } from "diff";

function App() {
  const [results, setResults] = useState(null);
  const [synthResults, setSynthResults] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [changeDecisions, setChangeDecisions] = useState({});
  const [analysisExpanded, setAnalysisExpanded] = useState(true);

  const diffParts = synthResults
    ? diffLines(resumeText, synthResults.new_resume_text)
    : [];

  const finalResumeText = buildFinalResume(diffParts, changeDecisions);

  function setDecision(index, decision) {
    setChangeDecisions({
      ...changeDecisions,
      [index]: decision,
    });
  }

  function buildFinalResume(diffParts, changeDecisions) {
    return diffParts
      .map((part, index) => {
        const decision = changeDecisions[index];

        if (!part.added && !part.removed) {
          return part.value;
        }

        if (part.added) {
          return decision === "approved" ? part.value : "";
        }

        if (part.removed) {
          return decision === "rejected" ? part.value : "";
        }

        return "";
      })
      .join("");
  }

  async function analyze() {
    setResults(null);
    setSynthResults(null);
    setChangeDecisions({});
    setAnalysisExpanded(true);

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resume_text: resumeText,
        job_description: jobDescription,
      }),
    });

    const data = await response.json();
    setResults(data.results);
  }

  async function synthesize() {
    setSynthResults(null);
    setChangeDecisions({});
    setAnalysisExpanded(false);

    const response = await fetch("http://127.0.0.1:8000/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        results: results,
        originalResumeText: resumeText,
      }),
    });

    const data = await response.json();
    setSynthResults(data);
  }

  return (
    <main>
      <h1>AI Job Search Assistant</h1>

      <form className="analyze-form">
        <label className="field">
          Resume Text
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </label>

        <label className="field">
          Job Description
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </label>

        <button onClick={analyze} type="button">
          Analyze
        </button>

        {results && (
          <button onClick={synthesize} type="button">
            Synthesize
          </button>
        )}
      </form>

      <section className="analysis-section">

        <button
          className="collapse-toggle"
          onClick={() => setAnalysisExpanded(!analysisExpanded)}
        >
          {analysisExpanded
            ? "▼ Hide Analysis"
            : "▶ Show Analysis"}
        </button>

        {analysisExpanded && (
          <>
            
            {results && results.length > 0 && (
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
                  <section className="provider-card score-card" key={`${result.provider}-score`}>
                    <p className="match-score-number">
                      {result.analysis.match_score}%
                    </p>

                    <h4>Explanation</h4>
                    <p>{result.analysis.match_score_explanation}</p>
                  </section>
                ))}

                <div className="comparison-row-label">Missing Keywords</div>

                {results.map((result) => (
                  <section
                    className="provider-card"
                    key={`${result.provider}-keywords`}
                  >
                    <ul>
                      {result.analysis.missing_keywords.map((keyword) => (
                        <li
                          key={`${result.provider}-${keyword.priority}-${keyword.keyword}`}
                        >
                          Priority: {keyword.priority} keyword: {keyword.keyword}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

              </section>
            )}
          </>
        )}

      </section>

 

      {synthResults && (
        <>
          <section className="synthesis-results">
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

          {synthResults?.new_resume_text && (
            <section className="final-resume">
              <h2>Final Resume</h2>
              <textarea
                className="final-resume-output"
                value={finalResumeText}
                readOnly
              />
            </section>
          )}
        </>
      )}


    </main>
  );
}

export default App;