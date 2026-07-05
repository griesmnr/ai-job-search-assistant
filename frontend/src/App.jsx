import { useState, useEffect } from "react";
import "./App.css";
import { diffLines } from "diff";
import { supabase } from "./supabase";
import LoginModal from "./components/LoginModal";
import HistoryPage from "./pages/HistoryPage";
import AppHeader from "./components/AppHeader";
import AppTabs from "./components/AppTabs";
import TailorResumePage from "./pages/TailorResumePage";
import BrushUpsPage from "./pages/BrushUpsPage";

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
  
  const diffGroups = buildDiffGroups(diffParts);

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

  const finalResumeText = buildFinalResume(diffGroups, changeDecisions);

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

    diffGroups.forEach((group, index) => {
      if (group.type !== "unchanged") {
        approvals[index] = "approved";
      }
    });

    setChangeDecisions(approvals);
  }

  function buildDiffGroups(diffParts) {
    const groups = [];

    for (let i = 0; i < diffParts.length; i++) {
      const current = diffParts[i];
      const next = diffParts[i + 1];

      if (current.removed && next?.added) {
        groups.push({
          type: "replacement",
          removed: current.value,
          added: next.value,
          partIndexes: [i, i + 1],
        });
        i++;
      } else if (current.added) {
        groups.push({
          type: "addition",
          added: current.value,
          removed: "",
          partIndexes: [i],
        });
      } else if (current.removed) {
        groups.push({
          type: "deletion",
          removed: current.value,
          added: "",
          partIndexes: [i],
        });
      } else {
        groups.push({
          type: "unchanged",
          value: current.value,
          partIndexes: [i],
        });
      }
    }

  return groups;
}

  const unresolvedChanges = diffGroups.some((group, index) => {
    if (group.type === "unchanged") {
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

function buildFinalResume(diffGroups, changeDecisions) {
    return diffGroups
      .map((group, index) => {
        const decision = changeDecisions[index];

        if (group.type === "unchanged") {
          return group.value;
        }

        if (group.type === "replacement") {
          return decision === "approved" ? group.added : group.removed;
        }

        if (group.type === "addition") {
          return decision === "approved" ? group.added : "";
        }

        if (group.type === "deletion") {
          return decision === "approved" ? "" : group.removed;
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
        <TailorResumePage
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
          synthResults={synthResults}
          results={results}
          moreInfoExpanded={moreInfoExpanded}
          setMoreInfoExpanded={setMoreInfoExpanded}
          approveAllChanges={approveAllChanges}
          diffGroups={diffGroups}
          changeDecisions={changeDecisions}
          setDecision={setDecision}
          allChangesReviewed={allChangesReviewed}
          finalResumeText={finalResumeText}
        />
      )}
      
      {activeTab === "history" && (
        <HistoryPage session={session} />
      )}

      {activeTab === "brushups" && (
        <BrushUpsPage session={session} />
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