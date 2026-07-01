import { useState, useEffect } from "react";
import "./App.css";
import { diffLines } from "diff";
import { supabase } from "./supabase";
import LoginModal from "./LoginModal";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const appSecret = import.meta.env.VITE_APP_ACCESS_SECRET;

function App() {
  const [results, setResults] = useState(null);
  const [synthResults, setSynthResults] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [changeDecisions, setChangeDecisions] = useState({});
  const [moreInfoExpanded, setMoreInfoExpanded] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [jobDescriptionError, setJobDescriptionError] = useState("");
  const [activeTab, setActiveTab] = useState("tailor");

  const diffParts = synthResults?.new_resume_text
    ? diffLines(resumeText, synthResults.new_resume_text)
    : [];

  const DRAFT_STORAGE_KEY = "resume-tailor-draft";

  function saveDraftBeforeLogin() {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        resumeText,
        jobDescription,
      })
    );
  }

  const finalResumeText = buildFinalResume(diffParts, changeDecisions);

  const userFirstName =
    session?.user?.user_metadata?.full_name?.split(" ")[0] ||
    session?.user?.email?.split("@")[0];

  function setDecision(index, decision) {
    setChangeDecisions({
      ...changeDecisions,
      [index]: decision,
    });
  }

  function approveAllChanges() {
    const approvals = { ...changeDecisions };

    diffParts.forEach((part, index) => {
      if (part.added || part.removed) {
        approvals[index] = "approved";
      }
    });

    setChangeDecisions(approvals);
  }

  const unresolvedChanges = diffParts.some((part, index) => {
    if (!part.added && !part.removed) {
      return false;
    }

    return !changeDecisions[index];
  });

  const allChangesReviewed = !unresolvedChanges;

  const loadingMessages = [
    "Reading resume...",
    "Reviewing job description...",
    "Consulting OpenAI...",
    "Consulting Claude...",
    "Consulting Gemini...",
    "Building resume...",
    "Almost ready..."
  ];

  useEffect(() => {
    if (!isTailoring) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((current) => {
        if (current >= loadingMessages.length - 1) {
          return current;
        }

        return current + 1;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isTailoring]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setShowLoginModal(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!savedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft);

      if (parsedDraft.resumeText) {
        setResumeText(parsedDraft.resumeText);
      }

      if (parsedDraft.jobDescription) {
        setJobDescription(parsedDraft.jobDescription);
      }
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

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

  function handleTailorClick() {
    let hasErrors = false;

    setResumeError("");
    setJobDescriptionError("");

    if (!resumeText.trim()) {
      setResumeError("Please paste your resume.");
      hasErrors = true;
    }

    if (!jobDescription.trim()) {
      setJobDescriptionError("Please paste a job description.");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    if (!session) {
      saveDraftBeforeLogin();
      setShowLoginModal(true);
      return;
    }

    tailorResume();
  }

  async function tailorResume() {
    setIsTailoring(true);
    setResults(null);
    setSynthResults(null);
    setChangeDecisions({});
    setMoreInfoExpanded(false);

    try {
      const analyzeResponse = await fetch(`${apiBaseUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Secret": `${appSecret}`
        },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          user_id: session.user.id,
        }),
      });

      const analyzeData = await analyzeResponse.json();
      setResults(analyzeData.results);

      const synthesizeResponse = await fetch(`${apiBaseUrl}/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Secret": `${appSecret}`
        },
        body: JSON.stringify({
          results: analyzeData.results,
          originalResumeText: resumeText,
          job_description: jobDescription,
          execution_id: analyzeData.execution_id
        }),
      });

      const synthesizeData = await synthesizeResponse.json();
      setSynthResults(synthesizeData);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setIsTailoring(false);
    }
  }

  return (
    <main>
      <header className="app-header">
        <h1>AI Job Search Assistant</h1>

        {session && (
          <div className="user-menu">
            <span>{userFirstName}</span>

            <button
              type="button"
              className="logout-button"
              onClick={() => supabase.auth.signOut()}
            >
              Log Out
            </button>
          </div>
        )}
      </header>

      <nav className="app-tabs">
        <button
          type="button"
          className={activeTab === "tailor" ? "tab active-tab" : "tab"}
          onClick={() => setActiveTab("tailor")}
        >
          Tailor Resume
        </button>

        <button
          type="button"
          className={activeTab === "history" ? "tab active-tab" : "tab"}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </nav>

      {activeTab === "tailor" && (
        <>
          <form className="analyze-form">
          <label className="field">
            <span className="field-label">
              Resume Text <span className="required">*</span>
            </span>

            <textarea
              value={resumeText}
              className={resumeError ? "input-error" : ""}
              onChange={(e) => {
                setResumeText(e.target.value);
                setResumeError("");
              }}
            />

            {resumeError && (
              <p className="field-error">{resumeError}</p>
            )}
          </label>

          <label className="field">
            <span className="field-label">
              Job Description <span className="required">*</span>
            </span>
            <textarea
              value={jobDescription}
              className={jobDescriptionError ? "input-error" : ""}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setJobDescriptionError("");
              }}
            />

            {jobDescriptionError && (
              <p className="field-error">{jobDescriptionError}</p>
            )}
          </label>

          <button
            onClick={handleTailorClick}
            type="button"
            disabled={isTailoring}
          >
            {isTailoring ? "Tailoring..." : "Tailor My Resume"}
          </button>

          {isTailoring && (
            <div className="spinner-container">
              <div className="spinner"></div>

              <span>
                {loadingMessages[loadingMessageIndex]}
              </span>
            </div>
          )}
        </form>

        {synthResults && (
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
        )}

        {results && synthResults && (
          <section className="more-info-section">
            <button
              className="collapse-toggle"
              onClick={() => setMoreInfoExpanded(!moreInfoExpanded)}
            >
              {moreInfoExpanded ? "▼ Less Information" : "▶ More Information"}
            </button>

            {moreInfoExpanded && (
              <>
                <section className="synthesis-results">
                  <h2>What is happening?</h2>
                  <p>3 different AI models were consulted to get information on how well your resume
                    matches for this job. Below explains some of the key takeaways from all 3 models, 
                    and then a breakdown of each model's opinion more granularly.
                  </p>
                  <br/>

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

                  {results
                    .map((result) => (
                    <div className="comparison-column-header" key={result.provider}>
                      <h3>{result.provider}</h3>
                      <p>{result.model}</p>
                    </div>
                  ))}

                  <div className="comparison-row-label">Match Score</div>

                  {results.map((result) => (
                    <section
                      className={`provider-card score-card ${result.success ? "" : "provider-error-card"}`}
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
                            {result.provider} could not complete this analysis. The resume was tailored using the available models.
                          </p>
                        </>
                      )}
                    </section>
                  ))}

                  <div className="comparison-row-label">Missing Keywords</div>

                  {results.map((result) => (
                    <section
                      className={`provider-card ${result.success ? "" : "provider-error-card"}`}
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
                            Missing keywords are unavailable because {result.provider} could not complete this analysis.
                          </p>
                        </>
                      )}
                    </section>
                  ))}
                </section>
              </>
            )}
          </section>
        )}

        {synthResults && (
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

            {allChangesReviewed ? (
              <section className="final-resume">
                <h2>Final Resume</h2>

                <textarea
                  className="final-resume-output"
                  value={finalResumeText}
                  readOnly
                />

                <textarea
                  className="cover-letter-output"
                  value={synthResults.cover_letter}
                  readOnly
                />
              </section>
            ) : (
              <section className="final-resume">
                <h2>Final Resume</h2>

                <p>
                  Review all proposed changes before generating the final resume.
                </p>
              </section>
            )}
          </>
        )}
        </>
      )}

      {activeTab === "history" && (
        <section className="history-page">
          <h2>History</h2>
          <p>Your previous tailored resumes will appear here.</p>
        </section>
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} 
          onBeforeSignIn={saveDraftBeforeLogin}
          />
      )}
    </main>
  );
  
}

export default App;