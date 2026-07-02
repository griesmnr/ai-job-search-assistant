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

      {isTailoring && <LoadingSpinner message={loadingMessage} />}
    </form>
  );
}