import { useMemo, useState, type ReactNode } from "react";

const PROFILE_KEY = "metroMedDose.protocolProfile.v1";

export type ProtocolProfile = {
  schemaVersion: 1;
  profileName: string;
  agency: string;
  reviewedBy: string;
  effectiveDate: string;
  medications: Array<{
    id: string;
    name: string;
    doseUnit: "mg" | "mcg";
    concentrations: Array<{ amount: number; unit: "mg" | "mcg"; volumeMl: number }>;
    maxSingleDose?: number;
  }>;
};

export const starterProfile: ProtocolProfile = {
  schemaVersion: 1,
  profileName: "Local waiver draft",
  agency: "",
  reviewedBy: "",
  effectiveDate: "",
  medications: [],
};

export function loadProtocolProfile(): ProtocolProfile {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    return validateProfile(value) ? value : starterProfile;
  } catch {
    return starterProfile;
  }
}

function validateProfile(value: unknown): value is ProtocolProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as ProtocolProfile;
  return p.schemaVersion === 1 && typeof p.profileName === "string" && Array.isArray(p.medications) && p.medications.every(m =>
    typeof m.id === "string" && typeof m.name === "string" && ["mg", "mcg"].includes(m.doseUnit) &&
    Array.isArray(m.concentrations) && m.concentrations.every(c => c.amount > 0 && c.volumeMl > 0 && ["mg", "mcg"].includes(c.unit)) &&
    (m.maxSingleDose === undefined || m.maxSingleDose > 0)
  );
}

export function ProtocolSettings({ close }: { close: () => void }) {
  const [text, setText] = useState(() => JSON.stringify(loadProtocolProfile(), null, 2));
  const [status, setStatus] = useState("");
  const save = () => {
    try {
      const value = JSON.parse(text);
      if (!validateProfile(value)) throw new Error("Profile fields or medication values are invalid.");
      localStorage.setItem(PROFILE_KEY, JSON.stringify(value));
      setStatus("Saved on this device. Custom data remains inactive until advisor approval and pathway mapping.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invalid JSON profile.");
    }
  };
  return <ToolModal title="Local protocol profile" close={close}>
    <div className="profile-status"><b>Draft / not active for dose calculations</b><span>The built-in DMP pathways remain locked. This versioned profile stores waiver medications, concentrations and ceilings for later physician-reviewed activation.</span></div>
    <label className="json-editor">Versioned JSON configuration<textarea value={text} onChange={e => { setText(e.target.value); setStatus(""); }} spellCheck={false}/></label>
    <button className="tool-primary" onClick={save}>Validate and save draft</button>
    {status && <div className="tool-status" role="status">{status}</div>}
  </ToolModal>;
}

export function InfusionCalculator({ close }: { close: () => void }) {
  const [mode, setMode] = useState<"weight" | "fixed">("weight");
  const [dose, setDose] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [drugAmount, setDrugAmount] = useState("");
  const [drugUnit, setDrugUnit] = useState<"mg" | "mcg">("mg");
  const [bagVolume, setBagVolume] = useState("");
  const [dropFactor, setDropFactor] = useState("10");
  const kg = weightUnit === "lb" ? Number(weight) / 2.2046226218 : Number(weight);
  const result = useMemo(() => {
    const orderedMcgMin = Number(dose) * (mode === "weight" ? kg : 1);
    const bagMcg = Number(drugAmount) * (drugUnit === "mg" ? 1000 : 1);
    const concentration = bagMcg / Number(bagVolume);
    const mlHr = orderedMcgMin / concentration * 60;
    const gttMin = mlHr * Number(dropFactor) / 60;
    const valid = orderedMcgMin > 0 && concentration > 0 && Number.isFinite(mlHr) && mlHr <= 9999;
    return { orderedMcgMin, concentration, mlHr, gttMin, valid };
  }, [dose, mode, kg, drugAmount, drugUnit, bagVolume, dropFactor]);
  return <ToolModal title="Infusion rate calculator" close={close}>
    <div className="calculator-warning"><b>Independent math tool</b><span>Confirm the medication order, protocol ceiling, pump library and prepared bag label. No drug-specific dose is supplied here.</span></div>
    <div className="tool-toggle"><button className={mode === "weight" ? "selected" : ""} onClick={() => setMode("weight")}>mcg/kg/min</button><button className={mode === "fixed" ? "selected" : ""} onClick={() => setMode("fixed")}>mcg/min</button></div>
    {mode === "weight" && <div className="tool-field-row"><ToolField label={`Weight (${weightUnit})`} value={weight} set={setWeight}/><div className="mini-toggle"><button className={weightUnit === "kg" ? "selected" : ""} onClick={() => setWeightUnit("kg")}>kg</button><button className={weightUnit === "lb" ? "selected" : ""} onClick={() => setWeightUnit("lb")}>lb</button></div></div>}
    {mode === "weight" && Number(weight) > 0 && <div className="kg-lock"><small>CALCULATION WEIGHT</small><b>{format(kg)} kg</b><span>{weightUnit === "lb" ? `${weight} lb ÷ 2.2046` : "Entered in kilograms"}</span></div>}
    <ToolField label={`Ordered rate (${mode === "weight" ? "mcg/kg/min" : "mcg/min"})`} value={dose} set={setDose}/>
    <div className="tool-field-row"><ToolField label="Drug in bag" value={drugAmount} set={setDrugAmount}/><div className="mini-toggle"><button className={drugUnit === "mg" ? "selected" : ""} onClick={() => setDrugUnit("mg")}>mg</button><button className={drugUnit === "mcg" ? "selected" : ""} onClick={() => setDrugUnit("mcg")}>mcg</button></div></div>
    <ToolField label="Total bag volume (mL)" value={bagVolume} set={setBagVolume}/>
    <label className="tool-select">Tubing drop factor<select value={dropFactor} onChange={e => setDropFactor(e.target.value)}><option value="10">10 gtt/mL</option><option value="15">15 gtt/mL</option><option value="20">20 gtt/mL</option><option value="60">60 gtt/mL</option></select></label>
    {result.valid ? <section className="infusion-result" aria-live="polite"><small>CALCULATED RATE</small><strong>{format(result.mlHr)} mL/hr</strong><b>{format(result.gttMin)} gtt/min</b><div><span>Order</span><b>{format(result.orderedMcgMin)} mcg/min</b></div><div><span>Concentration</span><b>{format(result.concentration)} mcg/mL</b></div><p>{format(result.orderedMcgMin)} mcg/min ÷ {format(result.concentration)} mcg/mL × 60 = {format(result.mlHr)} mL/hr</p></section> : <div className="tool-guidance">Enter positive values in every required field to calculate.</div>}
  </ToolModal>;
}

function ToolModal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop clinical-tool-backdrop"><section className="clinical-tool" role="dialog" aria-modal="true" aria-label={title}><button className="close" onClick={close} aria-label="Close">×</button><h2>{title}</h2>{children}</section></div>;
}
function ToolField({ label, value, set }: { label: string; value: string; set: (value: string) => void }) {
  return <label className="tool-field">{label}<input inputMode="decimal" value={value} onChange={e => set(e.target.value)} placeholder="0"/></label>;
}
function format(value: number) { return Number.isFinite(value) ? Number(value.toFixed(value < 10 ? 2 : 1)).toString() : "0"; }
