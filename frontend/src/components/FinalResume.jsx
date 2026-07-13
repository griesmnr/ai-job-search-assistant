import { useState } from "react";

export default function FinalResume({
  synthResults,
  allChangesReviewed,
  finalResumeText,
}) {
  const [copiedSection, setCopiedSection] = useState("");

  if (!synthResults || !allChangesReviewed) {
    return null;
  }

  async function copyText(text, section) {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedSection(section);

      setTimeout(() => {
        setCopiedSection("");
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  return (
    <>
      <section className="final-resume">
        <h2>Final Resume</h2>

        <div className="resume-output-wrapper">
          <textarea
            className="final-resume-output"
            value={finalResumeText}
            readOnly
          />

          <button
            type="button"
            className="copy-button"
            aria-label="Copy final resume"
            title="Copy final resume"
            onClick={() => copyText(finalResumeText, "resume")}
          >
            {copiedSection === "resume" ? "✓" : "📋"}
          </button>
        </div>
      </section>

      <section className="final-resume">
        <h2>Cover Letter</h2>

        <div className="resume-output-wrapper">
          <textarea
            className="cover-letter-output"
            value={synthResults.cover_letter}
            readOnly
          />

          <button
            type="button"
            className="copy-button"
            aria-label="Copy cover letter"
            title="Copy cover letter"
            onClick={() => copyText(synthResults.cover_letter, "cover-letter")}
          >
            {copiedSection === "cover-letter" ? "✓" : "📋"}
          </button>
        </div>
      </section>
    </>
  );
}
