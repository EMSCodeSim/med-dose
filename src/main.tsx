import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./AppRouter";
import "./fieldSpeedRuntime";
import "./styles.css";
import "./unifiedMedicationFlow.css";
import "./adminReadableFix.css";
import "./activeMedicationHost.css";
import "./desktopTopVisibilityFix.css";
import "./approvalStatus.css";
import "./quickSelectScrollFix.css";
import "./fieldApp.css";
import "./fieldSafety.css";
import "./fieldContrastFix.css";
import "./fieldReadabilityFix.css";
import "./fieldSelectionContrastFix.css";
import "./fieldSpeed.css";
import "./fieldReportAlwaysVisible.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Home /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").then(registration=>registration.update()).catch(() => undefined));
}
