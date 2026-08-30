import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./App";
import "./styles.css";
import "./unifiedMedicationFlow.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Home /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}
