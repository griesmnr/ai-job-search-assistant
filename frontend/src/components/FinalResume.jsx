export default function FinalResume({
  allChangesReviewed,
  finalResumeText,
  coverLetter,
}) {
  if (allChangesReviewed) {
    return (
      <section className="final-resume">
        <h2>Final Resume</h2>

        <textarea
          className="final-resume-output"
          value={finalResumeText}
          readOnly
        />

        <textarea
          className="cover-letter-output"
          value={coverLetter}
          readOnly
        />
      </section>
    );
  }

  return (
    <section className="final-resume">
      <h2>Final Resume</h2>

      <p>
        Review all proposed changes before generating the final resume.
      </p>
    </section>
  );
}