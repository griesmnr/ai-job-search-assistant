export default function FinalResume({
  synthResults,
  allChangesReviewed,
  finalResumeText,
}) {
  if (!synthResults || !allChangesReviewed) {
    return null;
  }

  return (
    <>
      <section className="final-resume">
        <h2>Final Resume</h2>

        <textarea
          className="final-resume-output"
          value={finalResumeText}
          readOnly
        />
      </section>

      <section className="final-resume">
        <h2>Cover Letter</h2>

        <textarea
          className="cover-letter-output"
          value={synthResults.cover_letter}
          readOnly
        />
      </section>
    </>
  );
}
