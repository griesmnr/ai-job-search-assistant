import { useState } from "react";
import "./App.css";

function App() {
  const [results, setResults] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  async function analyze() {
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
      </form>
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