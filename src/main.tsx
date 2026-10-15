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
import "./fieldDetailsReadabilityFix.css";
import "./fieldRelease.css";
import "./indicationWrapFix.css";
import "./adminDesktop.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Home /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  let refreshingForUpdate = false;
  let registration: ServiceWorkerRegistration | null = null;
  let lastUpdateCheck = 0;
  let updateCheck: Promise<void> | null = null;

  const checkForServiceWorkerUpdate = () => {
    if (!navigator.onLine || updateCheck || Date.now() - lastUpdateCheck < 30_000) return;
    lastUpdateCheck = Date.now();
    updateCheck = (async () => {
      try {
        registration ??= await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        await registration.update();
      } catch {
        // Keep the current app usable if the update check cannot reach the server.
      } finally {
        updateCheck = null;
      }
    })();
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    checkForServiceWorkerUpdate();
  });

  // An installed iPhone PWA can resume from suspension without another load.
  // Check when it becomes visible so it can activate a newly deployed worker.
  window.addEventListener("pageshow", checkForServiceWorkerUpdate);
  window.addEventListener("focus", checkForServiceWorkerUpdate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForServiceWorkerUpdate();
  });
}
