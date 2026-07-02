import { useState, useEffect } from "react";
import "./App.css";
import { diffLines } from "diff";
import { supabase } from "./supabase";
import LoginModal from "./components/LoginModal";
import HistoryPage from "./components/HistoryPage";
import AppHeader from "./components/AppHeader";
import AppTabs from "./components/AppTabs";
import ScoreSummary from "./components/ScoreSummary";
import TailorForm from "./components/TailorForm";
import MoreInfoSection from "./components/MoreInfoSection";

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
      <AppHeader session={session} />

      <AppTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "tailor" && (
        <>
        <TailorForm
          resumeText={resumeText}
          setResumeText={setResumeText}
          resumeError={resumeError}
          setResumeError={setResumeError}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          jobDescriptionError={jobDescriptionError}
          setJobDescriptionError={setJobDescriptionError}
          handleTailorClick={handleTailorClick}
          isTailoring={isTailoring}
          loadingMessage={loadingMessages[loadingMessageIndex]}
        />

        <ScoreSummary synthResults={synthResults} />

        <MoreInfoSection
          results={results}
          synthResults={synthResults}
          moreInfoExpanded={moreInfoExpanded}
          setMoreInfoExpanded={setMoreInfoExpanded}
        />

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
        <HistoryPage session={session} />
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