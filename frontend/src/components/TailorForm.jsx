import LoadingSpinner from "./LoadingSpinner";

export default function TailorForm({
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
}) {
  return (
    <form className="analyze-form">
      <label className="field">
        <span className="field-label">
          Resume Text <span className="required">*</span>
        </span>

        <textarea
          value={resumeText}
          placeholder="Paste your current resume here..."
          className={resumeError ? "input-error" : ""}
          onChange={(e) => {
            setResumeText(e.target.value);
            setResumeError("");
          }}
        />

        {resumeError && <p className="field-error">{resumeError}</p>}
      </label>

      <label className="field">
        <span className="field-label">
          Job Posting <span className="required">*</span>
        </span>

        <textarea
          value={jobDescription}
          placeholder="Paste the job description from LinkedIn, Indeed, or the company’s careers page..."
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
        {isTailoring ? "Optimizing..." : "Optimize My Resume"}
      </button>

      {isTailoring && <LoadingSpinner message={loadingMessage} />}
    </form>
  );
}