import { useState } from "react";
import "./App.css";
import { diffLines } from "diff";




function App() {
  const [results, setResults] = useState(null);
  const [synthResults, setSynthResults] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [changeDecisions, setChangeDecisions] = useState({});
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
    const response = await fetch("http://127.0.0.1:8000/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        results: results,
        originalResumeText: resumeText
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
          <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
        </label>

        <label className="field">
          Job Description
          <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        </label>

        <button onClick={analyze} type="button">Analyze</button>
        {results &&  <button onClick={synthesize} type="button">Synthesize</button>}
      </form>

      {synthResults && (
        <>
        <section className="synthesis-results">

          <h2>Recommended Next Steps</h2>
          <ol>
            {synthResults.recommended_next_steps.map((step) => (
              <li key={step.priority}>
                {step.action}
              </li>
            ))}
          </ol>

          <h2>Consensus Missing Keywords</h2>
          <ul>
            {synthResults.consensus_missing_keywords.map((item) => (
              <li key={item.keyword}>
                <strong>{item.keyword}</strong>
                <br />
                {item.why_it_matters}
              </li>
            ))}
          </ul>

          <h2>Best Resume Bullets</h2>
          <ul>
            {synthResults.best_bullet_suggestions.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <h2>Model Differences</h2>
          <ul>
            {synthResults.notable_model_differences.map((item) => (
              <li key={item.topic}>
                <strong>{item.topic}</strong>: {item.difference}
              </li>
            ))}
          </ul>

          <h2>New Resume!</h2>
          <pre className="resume-output">{synthResults.new_resume_text}</pre>

        </section>

        <section className="diff-viewer">
          
          {diffParts.map((part, index) => {
            const className = part.added
              ? "diff-added"
              : part.removed
              ? "diff-removed"
              : "diff-unchanged";

          return (
            <div className={`diff-row `} key={index}>
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
            <pre>{finalResumeText}</pre>
          </section>
        )}     
      
      </>

      )}

      <section className="provider-results">
      {results && results.map(result =>(
        
          <section className="provider-card">
          <h2>{result.provider}</h2>
          <p>{result.model}</p>
          <p>Match Score: {result.analysis.match_score}%</p>
          <div className="keyword-sections">

            <section>
              <h2>Matching Keywords</h2>
              <ul>
                {result.analysis.matching_keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Missing Keywords</h2>
          <ul>
            {result.analysis.missing_keywords.map((keyword) => (
              <li key={keyword.priority}>Priority: {keyword.priority} keyword: {keyword.keyword}</li>
            ))}
          </ul>
            </section>

          </div>

          <section>
            <h2>Suggested Resume Bullets</h2>
            <ul>
              {result.analysis.bullet_suggestions.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>

          </section>

      ))}
      </section>
    </main>
  );
}

export default App;