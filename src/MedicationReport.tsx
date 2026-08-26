import { useEffect, useMemo, useState } from "react";

type Entry = { dose: number; volume: number; time: number };
type EncounterEntry = {drug:string;reason:string;route:string;dose:number;unit:string;volume:number;volumeUnit?:string;time:number;concentration:string};
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
  encounterEntries?: EncounterEntry[];
  baseApproval?: { physician: string; time: number; reason: string };
  openSignal?: number;
  hideLauncher?: boolean;
};

export default function MedicationReport(p: Props) {
  const [open, setOpen] = useState(false),
    [incident, setIncident] = useState(""),
    [provider, setProvider] = useState(""),
    [shareStatus, setShareStatus] = useState("");
  const total = p.entries.reduce((n, x) => n + x.dose, 0),
    totalVolume = p.entries.reduce((n, x) => n + x.volume, 0),
    recordedCount = p.encounterEntries?.length ?? p.entries.length;
  useEffect(() => {
    if (p.openSignal) setOpen(true);
  }, [p.openSignal]);
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
      {!p.hideLauncher && <button className="open-report" onClick={() => setOpen(true)}>
        <span>
          <small>DOCUMENTATION</small>
          <b>Save, send or print medication report</b>
        </span>
        <i>›</i>
      </button>}
      {!p.hideLauncher && !p.entries.length && (
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
              className={`report-status ${recordedCount ? "given" : "not-given"}`}
            >
              <b>
                {recordedCount
                  ? `${recordedCount} dose${recordedCount === 1 ? "" : "s"} recorded in this encounter`
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
              <button onClick={download}>Save text copy</button>
              <button onClick={share}>Send / share</button>
              <button onClick={() => window.print()}>Print / save PDF</button>
            </div>
            {shareStatus && (
              <div className="share-status" role="status">
                {shareStatus}
              </div>
            )}
            <p className="report-disclaimer">
              On iPhone or iPad, choose Print / save PDF, open the print preview,
              then use Share to send the one-page PDF. "Send / share" sends a
              plain-text copy for systems that do not accept PDF attachments.
              <br />
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
    totalVolume = p.entries.reduce((n, x) => n + x.volume, 0),
    encounterEntries = p.encounterEntries || [],
    recordedCount = encounterEntries.length || p.entries.length;
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
            {recordedCount
              ? "Administration recorded"
              : "Calculation only — not recorded as given"}
          </b>
        </span>
      </div>
      <div className={`print-status ${recordedCount ? "given" : "calculation"}`}>
        <b>{recordedCount ? "ADMINISTRATION RECORDED" : "CALCULATION ONLY — NO ADMINISTRATION RECORDED"}</b>
        <span>{recordedCount ? `${recordedCount} administration event${recordedCount === 1 ? "" : "s"} documented below` : "Do not interpret this report as evidence that medication was given"}</span>
      </div>
      <h3>Clinical calculation and cross-check</h3>
      <dl className="report-detail-grid">
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
        <div>
          <dt>Volume equation</dt>
          <dd>{p.calculatedDose} ÷ {p.concentration} = {p.calculatedVolume}</dd>
        </div>
        <div>
          <dt>Workflow verification</dt>
          <dd>Medication and physical vial concentration confirmed before calculation</dd>
        </div>
        {p.baseApproval&&<div className="base-report-row"><dt>Base authorization</dt><dd><b>APPROVED</b> • {p.baseApproval.physician} • {new Date(p.baseApproval.time).toLocaleString()}<br/>{p.baseApproval.reason}</dd></div>}
      </dl>
      {encounterEntries.length>0&&<><h3>Encounter medication history</h3><table className="encounter-table"><thead><tr><th>Time</th><th>Medication / indication</th><th>Route</th><th>Dose / volume</th></tr></thead><tbody>{encounterEntries.map((x,i)=><tr key={`${x.time}-${i}`}><td>{new Date(x.time).toLocaleTimeString()}</td><td><b>{x.drug}</b><br/><small>{x.reason}<br/>{x.concentration}</small></td><td>{x.route}</td><td><b>{fmt(x.dose)} {x.unit}</b><br/>{fmt(x.volume)} {x.volumeUnit||"mL"}</td></tr>)}</tbody></table></>}
      {!encounterEntries.length&&<><h3>Administration record</h3>
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
      )}</>}
      <div className="report-bottom-grid">
        <section>
          <h3>Medication-specific monitoring</h3>
          <ul className="report-monitoring">{reportCautions(p.drug).map(x => <li key={x}>{x}</li>)}</ul>
        </section>
        <section>
          <h3>Documentation cross-check</h3>
          <div className="report-checklist"><span>□ Indication documented</span><span>□ Pre/post vital signs</span><span>□ Response documented</span><span>□ Adverse effects</span><span>□ Waste documented</span><span>□ ePCR reconciled</span></div>
        </section>
      </div>
      <div className="report-signatures"><span>Provider signature / ID</span><span>Witness / verifier, if required</span><span>ePCR finalized date/time</span></div>
      <footer>
        Clinical decision-support record only • Verify against the physical vial, current agency protocol and ePCR before finalizing documentation • Generated {new Date().toLocaleString()}
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
    `Status: ${(p.encounterEntries?.length||p.entries.length) ? "ADMINISTRATION RECORDED" : "CALCULATION ONLY — NO DOSE RECORDED"}`,
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
    ...(p.baseApproval?[`Base authorization: APPROVED`,`Approving physician: ${p.baseApproval.physician}`,`Approval time: ${new Date(p.baseApproval.time).toLocaleString()}`,`Base-contact reason: ${p.baseApproval.reason}`]:[]),
    ``,
    `ADMINISTRATION RECORD`,
    ...(p.encounterEntries?.length?["ENCOUNTER MEDICATION HISTORY",...p.encounterEntries.map((x,i)=>`${i+1}. ${new Date(x.time).toLocaleString()} — ${x.drug} — ${x.reason} — ${x.route} — ${fmt(x.dose)} ${x.unit} (${fmt(x.volume)} ${x.volumeUnit||"mL"}) — ${x.concentration}`),``]:[]),
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
  const decimals = Math.abs(n) > 0 && Math.abs(n) < 1 ? 3 : 2;
  return Number(n.toFixed(decimals)).toString();
}
function reportCautions(drug: string) {
  if (drug.toLowerCase().includes("adenosine")) return ["Continuous ECG monitoring", "Rapid IV bolus followed immediately by saline flush", "Document rhythm strip before, during and after administration"];
  if (drug.toLowerCase().includes("epinephrine")) return ["Continuous ECG, blood pressure, pulse oximetry and perfusion monitoring", "Verify the indication-specific concentration and route before administration", "Watch for tachydysrhythmia, hypertension and myocardial ischemia"];
  if (drug.toLowerCase().includes("fentanyl")) return ["Continuous pulse oximetry", "Monitor respiratory status, blood pressure and analgesic response", "Resuscitation equipment and naloxone immediately available"];
  if (drug.toLowerCase().includes("magnesium")) return ["Continuous ECG and blood pressure monitoring", "Monitor respiratory status throughout administration", "Watch for bradycardia, hypotension and respiratory depression"];
  if (drug.toLowerCase().includes("diphenhydramine")) return ["Monitor airway, respiratory status, perfusion and mental status", "Administer IV/IO doses slowly", "Adjunct only; do not delay Epinephrine or transport for anaphylaxis"];
  if (drug.toLowerCase().includes("methylprednisolone")) return ["Monitor airway, respiratory status and perfusion", "Reconstitute and use immediately; administer IV/IO over 2 minutes", "Delayed effect; do not delay transport or definitive anaphylaxis treatment"];
  if (drug.toLowerCase().includes("albuterol")) return ["Monitor work of breathing, pulse oximetry, heart rate and lung sounds", "Administer by nebulizer over 5–15 minutes", "For anaphylaxis-associated wheezing, IM Epinephrine is given first"];
  return ["Cardiac and continuous pulse oximetry monitoring", "Monitor ventilation, blood pressure and sedation response", "Waveform capnography recommended"];
}
