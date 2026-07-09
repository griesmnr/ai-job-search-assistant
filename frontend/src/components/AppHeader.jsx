// src/components/AppHeader.jsx
import { supabase } from "../supabase";

export default function AppHeader({ session }) {
  const userFirstName =
    session?.user?.user_metadata?.full_name?.split(" ")[0] ||
    session?.user?.email?.split("@")[0];

  return (
    <header className="app-header">
      <h1>Resume Optimizer</h1>

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
  );
}
