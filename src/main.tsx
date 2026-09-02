import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./UnifiedApp";
import "./styles.css";
import "./unifiedMedicationFlow.css";
import "./adminReadableFix.css";
import "./activeMedicationHost.css";
import "./desktopTopVisibilityFix.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Home /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}
