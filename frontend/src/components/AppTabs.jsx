// src/components/AppTabs.jsx

export default function AppTabs({ activeTab, setActiveTab }) {
  return (
    <nav className="app-tabs">
      <button
        type="button"
        className={activeTab === "tailor" ? "tab active-tab" : "tab"}
        onClick={() => setActiveTab("tailor")}
      >
        Tailor Resume
      </button>

      <button
        type="button"
        className={activeTab === "history" ? "tab active-tab" : "tab"}
        onClick={() => setActiveTab("history")}
      >
        History
      </button>

      <button
        type="button"
        className={activeTab === "brushups" ? "tab active-tab" : "tab"}
        onClick={() => setActiveTab("brushups")}
      >
        Brush Ups
      </button>
    </nav>
  );
}