import TailorForm from "../components/TailorForm";
import ScoreSummary from "../components/ScoreSummary";
import MoreInfoSection from "../components/MoreInfoSection";
import DiffReview from "../components/DiffReview";
import FinalResume from "../components/FinalResume";

export default function TailorResumePage({
  resumeText,
  setResumeText,
  resumeError,
  setResumeError,
  jobDescription,
  setJobDescription,
  jobDescriptionError,
  setJobDescriptionError,
  handleTailorClick,
  isTailoring,
  loadingMessage,
  synthResults,
  results,
  moreInfoExpanded,
  setMoreInfoExpanded,
  approveAllChanges,
  diffParts,
  changeDecisions,
  setDecision,
  allChangesReviewed,
  finalResumeText,
}) {
  return (
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
        loadingMessage={loadingMessage}
      />

      <ScoreSummary synthResults={synthResults} />

      <MoreInfoSection
        results={results}
        synthResults={synthResults}
        moreInfoExpanded={moreInfoExpanded}
        setMoreInfoExpanded={setMoreInfoExpanded}
      />

    <DiffReview
        synthResults={synthResults}
        diffParts={diffParts}
        changeDecisions={changeDecisions}
        setDecision={setDecision}
        approveAllChanges={approveAllChanges}
    />

    
    <FinalResume
      allChangesReviewed={allChangesReviewed}
      finalResumeText={finalResumeText}
      coverLetter={synthResults?.cover_letter}
    />
    </>
  );
}