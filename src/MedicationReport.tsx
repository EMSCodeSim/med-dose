import { useMemo, useState } from "react";

type Entry = { dose: number; volume: number; time: number };
type Props = {
  drug: string;
  reason: string;
  route: string;
  age: string;
  patientClass: string;
  weight?: string;
  weightSource?: string;
  protocol: string;
  doseRule: string;
  concentration: string;
  calculatedDose: string;
  calculatedVolume: string;
  unit: string;
  entries: Entry[];
};

export default function MedicationReport(p: Props) {
  const [open, setOpen] = useState(false),
    [incident, setIncident] = useState(""),
    [provider, setProvider] = useState(""),
    [shareStatus, setShareStatus] = useState("");
  const total = p.entries.reduce((n, x) => n + x.dose, 0),
    totalVolume = p.entries.reduce((n, x) => n + x.volume, 0);
  const report = useMemo(
    () => buildReport(p, incident, provider, total, totalVolume),
    [p, incident, provider, total, totalVolume],
  );
  const download = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `metro-med-dose-${safe(incident) || new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const share = async () => {
    setShareStatus("");
    try {
      const file = new File(
        [report],
        `metro-med-dose-${safe(incident) || "report"}.txt`,
        { type: "text/plain" },
      );
      if (navigator.share) {
        await navigator.share({
          title: "Metro Med Dose medication report",
          text: "Medication-use report",
          files: navigator.canShare?.({ files: [file] }) ? [file] : undefined,
        });
        setShareStatus("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(report);
        setShareStatus("Report copied to clipboard.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setShareStatus("Sharing was unavailable. Use Save report instead.");
    }
  };
  return (
    <section className="report-tools">
      <button className="open-report" onClick={() => setOpen(true)}>
        <span>
          <small>DOCUMENTATION</small>
          <b>Save, send or print medication report</b>
        </span>
        <i>›</i>
      </button>
      {!p.entries.length && (
        <p>
          No administration has been recorded. The report will be labeled
          “calculation only.”
        </p>
      )}
      {open && (
        <div className="modal-backdrop report-backdrop">
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <button
              className="close"
              aria-label="Close report"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <h2 id="report-title">Medication-use report</h2>
            <div
              className={`report-status ${p.entries.length ? "given" : "not-given"}`}
            >
              <b>
                {p.entries.length
                  ? `${p.entries.length} dose${p.entries.length === 1 ? "" : "s"} recorded as given`
                  : `CALCULATION ONLY — NO DOSE RECORDED`}
              </b>
              <span>
                Confirm this report against the ePCR before finalizing patient
                documentation.
              </span>
            </div>
            <div className="report-identifiers">
              <label>
                Incident / ePCR number <small>optional</small>
                <input
                  value={incident}
                  onChange={(e) => setIncident(e.target.value)}
                  placeholder="Enter reference number"
                />
              </label>
              <label>
                Provider identifier <small>optional</small>
                <input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="Name or employee number"
                />
              </label>
            </div>
            <MedicationReportBody
              {...p}
              incident={incident}
              provider={provider}
            />
            <div className="report-actions">
              <button onClick={download}>Save report</button>
              <button onClick={share}>Send / share</button>
              <button onClick={() => window.print()}>Print / PDF</button>
            </div>
            {shareStatus && (
              <div className="share-status" role="status">
                {shareStatus}
              </div>
            )}
            <p className="report-disclaimer">
              This report supports documentation and does not replace the agency
              ePCR, reassessment, protocol compliance, or provider verification.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}

function MedicationReportBody(
  p: Props & { incident: string; provider: string },
) {
  const total = p.entries.reduce((n, x) => n + x.dose, 0),
    totalVolume = p.entries.reduce((n, x) => n + x.volume, 0);
  return (
    <article className="med-report" id="medication-report">
      <header>
        <b>Metro Med Dose</b>
        <span>Medication-use report</span>
      </header>
      <div className="report-meta">
        <span>
          <small>Created</small>
          <b>{new Date().toLocaleString()}</b>
        </span>
        <span>
          <small>Incident / ePCR</small>
          <b>{p.incident || "Not entered"}</b>
        </span>
        <span>
          <small>Provider</small>
          <b>{p.provider || "Not entered"}</b>
        </span>
        <span>
          <small>Status</small>
          <b>
            {p.entries.length
              ? "Administration recorded"
              : "Calculation only — not recorded as given"}
          </b>
        </span>
      </div>
      <h3>Medication cross-check</h3>
      <dl>
        <div>
          <dt>Medication</dt>
          <dd>{p.drug}</dd>
        </div>
        <div>
          <dt>Indication</dt>
          <dd>{p.reason}</dd>
        </div>
        <div>
          <dt>Patient</dt>
          <dd>
            {p.patientClass} • age {p.age}
            {p.weight ? ` • ${p.weight} (${p.weightSource})` : ""}
          </dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{p.route}</dd>
        </div>
        <div>
          <dt>Protocol / rule</dt>
          <dd>
            {p.protocol} • {p.doseRule}
          </dd>
        </div>
        <div>
          <dt>Verified concentration</dt>
          <dd>{p.concentration}</dd>
        </div>
        <div>
          <dt>Calculated initial dose</dt>
          <dd>
            {p.calculatedDose} = {p.calculatedVolume}
          </dd>
        </div>
      </dl>
      <h3>Administration record</h3>
      {p.entries.length ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Dose</th>
                <th>Time</th>
                <th>Amount given</th>
                <th>Volume given</th>
              </tr>
            </thead>
            <tbody>
              {p.entries.map((x, i) => (
                <tr key={x.time}>
                  <td>{i + 1}</td>
                  <td>{new Date(x.time).toLocaleString()}</td>
                  <td>
                    {fmt(x.dose)} {p.unit}
                  </td>
                  <td>{fmt(x.volume)} mL</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="report-total">
            <span>Total recorded</span>
            <b>
              {fmt(total)} {p.unit} • {fmt(totalVolume)} mL
            </b>
          </div>
        </>
      ) : (
        <div className="no-administration">
          <b>NO DOSE RECORDED AS GIVEN</b>
          <span>This document contains a calculation only.</span>
        </div>
      )}
      <footer>
        Generated by Metro Med Dose • Verify against the agency ePCR before
        finalizing documentation.
      </footer>
    </article>
  );
}

function buildReport(
  p: Props,
  incident: string,
  provider: string,
  total: number,
  totalVolume: number,
) {
  return [
    `METRO MED DOSE — MEDICATION-USE REPORT`,
    `Status: ${p.entries.length ? "ADMINISTRATION RECORDED" : "CALCULATION ONLY — NO DOSE RECORDED"}`,
    `Created: ${new Date().toLocaleString()}`,
    `Incident/ePCR: ${incident || "Not entered"}`,
    `Provider: ${provider || "Not entered"}`,
    ``,
    `Medication: ${p.drug}`,
    `Indication: ${p.reason}`,
    `Patient: ${p.patientClass}; age ${p.age}${p.weight ? `; ${p.weight} (${p.weightSource})` : ""}`,
    `Route: ${p.route}`,
    `Protocol/rule: ${p.protocol}; ${p.doseRule}`,
    `Verified concentration: ${p.concentration}`,
    `Calculated initial dose: ${p.calculatedDose}`,
    `Calculated initial volume: ${p.calculatedVolume}`,
    ``,
    `ADMINISTRATION RECORD`,
    ...(p.entries.length
      ? p.entries.map(
          (x, i) =>
            `Dose ${i + 1}: ${new Date(x.time).toLocaleString()} — ${fmt(x.dose)} ${p.unit} — ${fmt(x.volume)} mL`,
        )
      : ["NO DOSE RECORDED AS GIVEN"]),
    ...(p.entries.length
      ? [`Total recorded: ${fmt(total)} ${p.unit}; ${fmt(totalVolume)} mL`]
      : []),
    ``,
    `Verify this report against the agency ePCR before finalizing documentation.`,
  ].join("\n");
}
function safe(x: string) {
  return x
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .slice(0, 40);
}
function fmt(n: number) {
  return Number(n.toFixed(2)).toString();
}
