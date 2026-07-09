import { supabase } from "../supabase";

export default function LoginModal({ onClose, onBeforeSignIn }) {
  async function signInWithGoogle() {
    onBeforeSignIn?.();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="login-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h2>Sign in to tailor your resume</h2>

        <p>
          Sign in with Google to run the AI tailoring workflow and save your
          application history.
        </p>

        <button onClick={signInWithGoogle}>Continue with Google</button>
      </div>
    </div>
  );
}
