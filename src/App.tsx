"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import DoseTracker from "./DoseTracker";
import MedicationReport from "./MedicationReport";
import FieldToolbar from "./FieldToolbar";
type Drug = "fentanyl" | "midazolam" | "adenosine";
type StockVial = {drug:Drug;amount:string;volume:string;unit:"mcg"|"mg";label:string;barcode:string;photo?:string};
type Route = "IV" | "IV/IO" | "IM" | "IN";
type AgeUnit = "years" | "months" | "days";
type AgeClass = "adult" | "pediatric";
type Step =
  "drug" | "scanConfirm" | "reason" | "age" | "route" | "weight" | "safety" | "vial" | "review";
const URL =
  "https://dmemsmd.org/wp-content/uploads/sites/51/2026/07/DMEMSMD-Protocols-July-2026-FINAL-2026-07-20.pdf";
const protocolPages: Record<Drug, number> = { adenosine: 123, midazolam: 136, fentanyl: 163 };
const protocolUrl = (drug: Drug) => `${URL}#page=${protocolPages[drug]}`;
const medicationPhoto = (drug: Drug) =>
  drug === "adenosine" ? "/medications/adenosine-vial.webp" : undefined;
const meds = [
  {id:"adenosine" as Drug,name:"Adenosine",brand:"Adenocard",sub:"Adult standing order • age 12+"},
  {
    id: "fentanyl" as Drug,
    name: "Fentanyl",
    brand: "Sublimaze",
    sub: "Opioid analgesic",
  },
  {
    id: "midazolam" as Drug,
    name: "Midazolam",
    brand: "Versed",
    sub: "Benzodiazepine",
  },
  {
    id: "ketorolac",
    name: "Ketorolac",
    brand: "Toradol",
    sub: "Pending review",
  },
  {
    id: "epinephrine",
    name: "Epinephrine",
    brand: "Adrenalin",
    sub: "Pending review",
  },
];
const medicationAliases: Record<string, string[]> = {
  adenosine: ["adenocard", "svt", "antiarrhythmic"],
  fentanyl: ["sublimaze", "pain", "opioid"],
  midazolam: ["versed", "seizure", "sedation", "benzodiazepine"],
};
function fuzzyMedicationMatch(med: (typeof meds)[number], query: string) {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!q) return true;
  const words = [med.name, med.brand, med.sub, ...(medicationAliases[med.id] || [])]
    .map(x => x.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return words.some(word => word.includes(q) || q.includes(word) || subsequence(q, word));
}
function subsequence(query: string, value: string) {
  let i = 0;
  for (const char of value) if (char === query[i]) i += 1;
  return i === query.length;
}
const reasons: Record<Drug, string[]> = {
  adenosine: ["Regular narrow-complex AV nodal reentrant tachycardia"],
  fentanyl: ["Moderate to severe pain in a hemodynamically stable patient"],
  midazolam: [
    "Status epilepticus",
    "Sedation for cardioversion",
    "Sedation for transcutaneous pacing",
  ],
};
const routes: Record<Drug, Route[]> = {
  adenosine: ["IV"],
  fentanyl: ["IV/IO", "IM", "IN"],
  midazolam: ["IV/IO", "IM", "IN"],
};
const tapeBands = [
  { name: "Grey", kg: 4, color: "#7b8790", text: "#fff" },
  { name: "Pink", kg: 6.5, color: "#f49bbb", text: "#4c1830" },
  { name: "Red", kg: 8.5, color: "#d84040", text: "#fff" },
  { name: "Purple", kg: 10.5, color: "#8b5bb5", text: "#fff" },
  { name: "Yellow", kg: 13, color: "#f2d34f", text: "#3e3500" },
  { name: "White", kg: 16.5, color: "#fff", text: "#263946" },
  { name: "Blue", kg: 21, color: "#3f86d9", text: "#fff" },
  { name: "Orange", kg: 26.5, color: "#ef9338", text: "#3f2500" },
  { name: "Green", kg: 33, color: "#3a9a62", text: "#fff" },
];
function rules(drug: Drug, reason: string, age: number, route: Route | null) {
  const adult = age >= 12;
  if(drug==="adenosine")return{weight:false,rates:[12],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"One additional 12 mg rapid IV dose; contact medical control for further considerations.",maxCumulative:null,maxDoses:2,note:"Administer rapid IV bolus followed immediately by a normal saline flush. Continuous ECG monitoring required."};
  if (drug === "fentanyl") {
    const rate = route === "IN" && !adult ? [2] : [1, 2];
    return {
      weight: true,
      rates: rate,
      unit: "mcg",
      perKg: true,
      maxSingle: null,
      repeat: route === "IN" ? 10 : 5,
      repeatText: `Maximum cumulative ${route === "IN" ? 4 : 3} mcg/kg`,
      maxCumulative: route === "IN" ? 4 : 3,
      maxDoses: null,
      note:
        route === "IN"
          ? "Maximum 1 mL per nostril; IV preferred for repeat dosing."
          : route === "IM"
            ? "IV is preferred for accurate titration; IM is an acceptable alternative."
            : "",
    };
  }
  const seizure = reason === "Status epilepticus",
    inim = route === "IN" || route === "IM";
  if (adult)
    return {
      weight: false,
      rates: [seizure ? (inim ? 10 : 5) : inim ? 5 : 2],
      unit: "mg",
      perKg: false,
      maxSingle: null,
      repeat: 5,
      repeatText: "May repeat once; Base Contact for more than 2 doses.",
      maxCumulative: null,
      maxDoses: 2,
      note:
        route === "IN"
          ? "IN has slower, less predictable onset than IV; IN is preferred over IM when no IV."
          : route === "IM"
            ? "IM has the slowest onset."
            : "",
    };
  return {
    weight: true,
    rates: [inim ? 0.2 : 0.1],
    unit: "mg",
    perKg: true,
    maxSingle: seizure ? (inim ? 10 : 5) : inim ? 5 : 2,
    repeat: 5,
    repeatText: "May repeat once; Base Contact for more than 2 doses.",
    maxCumulative: null,
    maxDoses: 2,
    note:
      route === "IN"
        ? "IN is preferred over IM when IV cannot be safely or rapidly obtained."
        : route === "IM"
          ? "IM has the slowest onset."
          : "",
  };
}
function checksFor(drug: Drug, age: number) {
  const base = drug==="adenosine"?["Rhythm is REGULAR and narrow-complex","12-lead ECG obtained and documented when available","Patient has NO heart transplant history","Continuous ECG monitoring is in place","Patient warned about brief, unpleasant chest discomfort"]:
    drug === "fentanyl"
      ? [
          "Patient is hemodynamically stable with NO signs of shock",
          "Patient has NO respiratory depression",
          "No benzodiazepine coadministration OR direct physician verbal order obtained",
        ]
      : ["Patient is NOT hypotensive", "Patient has NO respiratory depression", "No opioid coadministration OR direct physician verbal order obtained"];
  if(drug==="fentanyl"&&age>=65)return[...base,"Strongly considered ½ typical dosing because patient is age 65+ or frail"];
  if(drug==="midazolam"&&age>=12)return[...base,...(age>65?["Considered ½ dosing because patient is over 65"]:[]),"Patient is NOT a small adult under 50 kg, OR ½ dosing was considered"];
  return base;
}
function monitoringCautions(drug: Drug) {
  if(drug==="adenosine")return["Continuous ECG monitoring throughout administration","Rapid IV bolus followed immediately by normal saline flush","Asthma: bronchospasm may occur; transient asystole or AV block is common"];
  if(drug==="fentanyl")return["Continuous pulse oximetry for every administration","Titrate slowly; watch for sudden respiratory depression, hypotension and chest-wall rigidity","Keep resuscitation equipment and naloxone immediately available; add cardiac monitoring and capnography for complex or repeated dosing"];
  return["Cardiac and pulse oximetry monitoring during transport","Watch for respiratory depression and hypotension; waveform capnography is recommended","Opioids, alcohol and other CNS depressants increase the sedative effect"];
}
function suggestedWeight(ageYears: number) {
  if (ageYears < 0.5 || ageYears >= 12) return null;
  if (ageYears < 1) return 6.5;
  if (ageYears < 2) return 10;
  if (ageYears < 4) return 14;
  if (ageYears < 6) return 19;
  if (ageYears < 9) return 25;
  if (ageYears < 11) return 31;
  return 38;
}
export default function App() {
  const [step, setStep] = useState<Step>("drug"),
    [drug, setDrug] = useState<Drug | null>(null),
    [search, setSearch] = useState(""),
    [reason, setReason] = useState(""),
    [ageClass, setAgeClass] = useState<AgeClass | "">(""),
    [age, setAge] = useState(""),
    [au, setAu] = useState<AgeUnit | "">(""),
    [route, setRoute] = useState<Route | null>(null),
    [weight, setWeight] = useState(""),
    [wu, setWu] = useState("kg"),
    [ws, setWs] = useState("actual"),
    [tapeColor, setTapeColor] = useState(""),
    [rate, setRate] = useState<number | null>(null),
    [amt, setAmt] = useState(""),
    [ml, setMl] = useState(""),
    [checks, setChecks] = useState<boolean[]>([]),
    [online, setOnline] = useState(true),
    [install, setInstall] = useState(false),
    [dosesGiven, setDosesGiven] = useState<
      { dose: number; volume: number; time: number }[]
    >([]),
    [now, setNow] = useState(Date.now()),
    [scannedVial, setScannedVial] = useState<StockVial | null>(null),
    [scanMedOk, setScanMedOk] = useState(false),
    [scanConcOk, setScanConcOk] = useState(false);
  useEffect(() => {
    setOnline(navigator.onLine);
    setWu(localStorage.getItem("preferredWeightUnit") || "kg");
    const a = () => setOnline(true),
      b = () => setOnline(false);
    addEventListener("online", a);
    addEventListener("offline", b);
    return () => {
      removeEventListener("online", a);
      removeEventListener("offline", b);
    };
  }, []);
  const av = Number(age),
    an = au === "years" ? av : au === "months" ? av / 12 : au === "days" ? av / 365.25 : 0,
    adult = an >= 12,
    tapeEligible = !adult && an < 10,
    underOne = age !== "" && an < 1,
    ageText = drug==="adenosine"&&ageClass==="adult"?"12 years or older":ageClass==="adult"?(drug==="midazolam"?(an>65?"over 65 years":"12–65 years"):(an>=65?"65 years or older":"12–64 years")):au ? `${age} ${au}` : age,
    weightSuggestion = suggestedWeight(an),
    r = drug && reason && route ? rules(drug, reason, an, route) : null,
    needWeight = !!r?.weight,
    kg = wu === "lb" ? Number(weight) / 2.20462 : Number(weight),
    items = drug ? checksFor(drug, an) : [],
    ageBlocked = !!au&&((drug === "fentanyl" && underOne)||(drug==="adenosine"&&age!==""&&!adult)),
    ageWithinRange =
      au === "years"
        ? av >= 0 && av < 130
        : au === "months"
          ? av >= 0 && av < 144
          : au === "days" && av >= 0 && av < 366,
    ageOk = age !== "" && !!au && ageWithinRange && !ageBlocked,
    weightOk = !needWeight || (kg > 0 && kg < 350),
    baseDose = r && rate !== null ? (r.perKg ? kg * rate : rate) : 0,
    dose = r?.maxSingle ? Math.min(baseDose, r.maxSingle) : baseDose,
    conc = Number(amt) > 0 && Number(ml) > 0 ? Number(amt) / Number(ml) : 0,
    vol = conc ? dose / conc : 0,
    inTooHigh = drug === "fentanyl" && route === "IN" && vol > 2,
    unit = drug === "fentanyl" ? "mcg" : "mg",
    maxTotal = r?.maxCumulative
      ? r.maxCumulative * kg
      : r?.maxDoses
        ? r.maxDoses * dose
        : dose,
    totalGiven = dosesGiven.reduce((s, x) => s + x.dose, 0),
    totalVolume = dosesGiven.reduce((s, x) => s + x.volume, 0),
    remaining = Math.max(0, maxTotal - totalGiven),
    nextRepeat = Math.min(dose, remaining),
    repeatsLeft = r?.maxDoses
      ? Math.max(0, r.maxDoses - dosesGiven.length)
      : dose > 0
        ? Math.ceil((remaining - 0.000001) / dose)
        : 0,
    lastTime = dosesGiven.at(-1)?.time || 0,
    secondsLeft = Math.max(
      0,
      Math.ceil((lastTime + (r?.repeat || 0) * 60000 - now) / 1000),
    );
  useEffect(() => setChecks(Array(items.length).fill(false)), [drug, an >= 65, an > 65]);
  useEffect(() => {
    setRate(r?.rates.length === 1 ? r.rates[0] : null);
  }, [drug, reason, route, adult]);
  useEffect(() => setDosesGiven([]), [drug, reason, route, dose, conc]);
  useEffect(() => {
    if (!dosesGiven.length || !repeatsLeft) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dosesGiven.length, repeatsLeft]);
  const capped = !!r?.maxSingle && baseDose > r.maxSingle,
    visible: Step[] = [
      "drug",
      ...(scannedVial ? (["scanConfirm"] as Step[]) : []),
      "age",
      "safety",
      "review",
    ],
    pos = visible.indexOf(step),
    valid = useMemo(
      () => ({
        drug: !!drug,
        scanConfirm: scanMedOk && scanConcOk,
        reason: !!reason,
        age: ageOk,
        route: !!route,
        weight: weightOk,
        safety: checks.length === items.length && checks.every(Boolean),
        vial: rate !== null && conc > 0 && !inTooHigh,
        review: true,
      }),
      [
        drug,
        reason,
        ageOk,
        route,
        weightOk,
        checks,
        items.length,
        rate,
        conc,
        inTooHigh,
      ],
    );
  const next = () => {
      if (valid[step]) setStep(visible[Math.min(pos + 1, visible.length - 1)]);
    },
    back = () => setStep(visible[Math.max(pos - 1, 0)]),
    reset = () => {
      setStep("drug");
      setDrug(null);
      setSearch("");
      setReason("");
      setAgeClass("");
      setAge("");
      setAu("");
      setRoute(null);
      setWeight("");
      setWs("actual");
      setTapeColor("");
      setRate(null);
      setAmt("");
      setMl("");
      setDosesGiven([]);
      setScannedVial(null);
      setScanMedOk(false);
      setScanConcOk(false);
    },
    setUnit = (x: string) => {
      setWu(x);
      setWeight("");
      setTapeColor("");
      localStorage.setItem("preferredWeightUnit", x);
    },
    useSuggestedWeight = () => {
      if (weightSuggestion !== null) {
        setWs("age");
        setWu("kg");
        setTapeColor("");
        setWeight(String(weightSuggestion));
      }
    },
    selectTapeBand = (name: string, bandKg: number) => {
      setWs("tape");
      setWu("kg");
      setTapeColor(name);
      setWeight(String(bandKg));
    },
    recordDose = (amount: number) => {
      const time = Date.now();
      setNow(time);
      setDosesGiven((x) => [
        ...x,
        { dose: amount, volume: amount / conc, time },
      ]);
    },
    beginMedication = (selectedDrug: Drug) => {
      setDrug(selectedDrug);
      setAgeClass(selectedDrug==="adenosine"?"adult":"");
      setAge(selectedDrug==="adenosine"?"12":"");
      setAu(selectedDrug==="adenosine"?"years":"");
      setReason(reasons[selectedDrug].length===1?reasons[selectedDrug][0]:"");
      setRoute(null);
      setWeight("");
      setChecks([]);
      setAmt("");
      setMl("");
      setDosesGiven([]);
      setScanMedOk(false);
      setScanConcOk(false);
      const selected=meds.find(x=>x.id===selectedDrug);
      setScannedVial({drug:selectedDrug,amount:"",volume:"",unit:selectedDrug==="fentanyl"?"mcg":"mg",label:selected?.brand||selectedDrug,barcode:"",photo:medicationPhoto(selectedDrug)});
      setStep("scanConfirm");
    };
  return (
    <main className="wizard-app">
      <header>
        <div className="brand">
          <b>M</b>
          <span>
            <strong>Metro Med Dose</strong>
            <small>DMP medication cross-check</small>
          </span>
        </div>
        <div className="header-actions">
          <span className={`connection ${online ? "online" : "offline"}`}>
            {online ? "Online" : "Offline ready"}
          </span>
          <button onClick={() => setInstall(true)}>Install</button>
        </div>
      </header>
      <section className="wizard-shell">
        {ageOk && step !== "drug" && step !== "reason" && (
          <div className="patient-strip">
            <b>{adult ? "Adult" : "Pediatric"}</b>
            <span>Age {ageText}</span>
            {needWeight && weightOk && <span>{fmt(kg)} kg</span>}
            <small>{drug ? medName(drug) : ""}</small>
          </div>
        )}
        <div className="wizard-top">
          <button className="back" onClick={back} disabled={step === "drug"}>
            ‹ Back
          </button>
          <span>
            Step {pos + 1} of {visible.length}
          </span>
          <button className="start-over" onClick={reset}>
            Start over
          </button>
        </div>
        <div className="progress">
          <i style={{ width: `${((pos + 1) / visible.length) * 100}%` }} />
        </div>
        <div className="clinical-banner">
          <b>DMP verified</b>
          <span>
            July 2026 • Approved July 1, 2026 • Next review January 2027
          </span>
        </div>
        {step === "drug" && (
          <Screen
            e="START"
            t="Which medication was requested?"
            h="Only advisor-review pathways are selectable."
          >
            <label className="drug-search">
              <span>Search generic or brand name</span>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Fentanyl, Versed…"
              />
            </label>
            <div className="choice-grid medication-order">
              {meds
                .filter((m) => fuzzyMedicationMatch(m, search))
                .map((m) => {
                        const active = m.id === "fentanyl" || m.id === "midazolam" || m.id === "adenosine";
                  return (
                    <button
                      key={m.id}
                      disabled={!active}
                      className="choice"
                      onClick={() => beginMedication(m.id as Drug)}
                    >
                      <span className="rx">{meds.findIndex(x=>x.id===m.id)+1}</span>
                      <span>
                        <b>{m.name}</b>
                        <small>
                          {m.brand} • {m.sub}
                        </small>
                      </span>
                      {active ? <i>›</i> : <em>Pending review</em>}
                    </button>
                  );
                })}
            </div>
          </Screen>
        )}
        {step === "scanConfirm" && scannedVial && (
          <Screen e="MEDICATION CHECK" t="Confirm the medication in your hand" h="Compare the physical vial with the selected medication.">
            <div className="scan-confirm-card">
              <div className="scan-med-photo">{scannedVial.photo ? <img src={scannedVial.photo} alt={`${scannedVial.label} reference vial`}/> : <div className="reference-vial"><small>{medName(scannedVial.drug).toUpperCase()}</small><b>VIAL</b><span>Reference photo not saved</span></div>}</div>
              <div className="scan-med-identity"><small>{scannedVial.barcode?"BARCODE MATCH":"MANUAL SELECTION"}</small><h2>{medName(scannedVial.drug)}</h2><p>{scannedVial.label}</p>{Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0?<><strong>{scannedVial.amount} {scannedVial.unit} in {scannedVial.volume} mL</strong><b>{fmt(Number(scannedVial.amount)/Number(scannedVial.volume))} {scannedVial.unit}/mL</b></>:<span className="manual-vial-note">Enter the concentration from the physical vial below.</span>}</div>
            </div>
            {!(Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0)&&<><h3 className="label-heading">Enter exactly what the physical vial says</h3><div className="vial-entry"><label><span>Total drug</span><div><input inputMode="decimal" value={scannedVial.amount} onChange={e=>{const value=e.target.value;setScannedVial({...scannedVial,amount:value});setAmt(value);setScanConcOk(false)}} placeholder="0"/><b>{scannedVial.unit}</b></div></label><label><span>Total volume</span><div><input inputMode="decimal" value={scannedVial.volume} onChange={e=>{const value=e.target.value;setScannedVial({...scannedVial,volume:value});setMl(value);setScanConcOk(false)}} placeholder="0"/><b>mL</b></div></label></div>{Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0&&<div className="manual-concentration-result"><span>Calculated concentration</span><b>{fmt(Number(scannedVial.amount)/Number(scannedVial.volume))} {scannedVial.unit}/mL</b></div>}</>}
            <div className="scan-confirm-checks compact-confirmations">
              <label className={scanMedOk?"checked":""}><input type="checkbox" checked={scanMedOk} onChange={e=>setScanMedOk(e.target.checked)}/><span><b>Medication matches</b>{medName(scannedVial.drug)}</span></label>
              <label className={scanConcOk?"checked":""}><input type="checkbox" disabled={!(Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0)} checked={scanConcOk} onChange={e=>setScanConcOk(e.target.checked)}/><span><b>Concentration matches</b>{Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0?`${scannedVial.amount} ${scannedVial.unit} / ${scannedVial.volume} mL`:"Enter label values"}</span></label>
            </div>
            <Next ok={scanMedOk&&scanConcOk} go={()=>setStep("age")} text="Continue to patient information"/>
          </Screen>
        )}
        {step === "reason" && drug && (
          <Screen
            e="INDICATION"
            t={`Why is ${medName(drug)} being given?`}
            h="Only indications mapped from the medication protocol are shown."
          >
            <div className="stack">
              {reasons[drug].map((x) => (
                <button
                  className="big-choice"
                  key={x}
                  onClick={() => {
                    setReason(x);
                    setTimeout(() => setStep("age"), 60);
                  }}
                >
                  <span>{x}</span>
                  <i>›</i>
                </button>
              ))}
            </div>
            <div className="indication-source"><span><small>SOURCE</small><b>Current Denver Metro medication protocol</b></span><a href={protocolUrl(drug)} target="_blank" rel="noreferrer">Open {protocolId(drug)} ↗</a></div>
          </Screen>
        )}
        {step === "age" && drug && (
          <Screen
            e="PATIENT"
            t="Patient and route"
            h="Complete only the questions needed for this medication pathway."
          >
            {reasons[drug].length>1?<div className="adaptive-section"><small>INDICATION</small><div className="compact-choice-grid">{reasons[drug].map((x)=><button key={x} className={reason===x?"selected":""} onClick={()=>{setReason(x);setRoute(null);setWeight("")}}>{x}</button>)}</div><a className="inline-protocol" href={protocolUrl(drug)} target="_blank" rel="noreferrer">Open {protocolId(drug)} indication protocol ↗</a></div>:<div className="selected-path"><small>INDICATION</small><b>{reasons[drug][0]}</b><a href={protocolUrl(drug)} target="_blank" rel="noreferrer">{protocolId(drug)} ↗</a></div>}
            <div className="adaptive-heading">AGE GROUP</div>
            {!ageClass ? <div className={`age-class-grid ${drug!=="adenosine"?"three-age-options":""}`}>
              {drug==="adenosine"?<button onClick={()=>{setAgeClass("adult");setAge("12");setAu("years");setRoute(null);setWeight("")}}><small>12 YEARS OR OLDER</small><b>Adult</b><span>›</span></button>:<><button onClick={()=>{setAgeClass("adult");setAge("12");setAu("years");setRoute(null);setWeight("")}}><small>{drug==="midazolam"?"12–65 YEARS":"12–64 YEARS"}</small><b>Adult</b><span>›</span></button><button onClick={()=>{setAgeClass("adult");setAge(drug==="midazolam"?"66":"65");setAu("years");setRoute(null);setWeight("")}}><small>{drug==="midazolam"?"OVER 65 YEARS":"65 YEARS OR OLDER"}</small><b>{drug==="midazolam"?"Adult >65":"Adult 65+"}</b><span>›</span></button></>}
              {drug!=="adenosine"&&<button onClick={()=>{setAgeClass("pediatric");setAge("");setAu("");setRoute(null);setWeight("")}}><small>UNDER 12 YEARS</small><b>Pediatric</b><span>›</span></button>}
            </div>:<>
              {drug!=="adenosine"&&<button className="change-age-class" onClick={()=>{setAgeClass("");setAge("");setAu("");setRoute(null);setWeight("")}}>← Change age group</button>}
              {ageClass==="adult" ? <><div className="selected-age"><b>{drug==="adenosine"?"Adult standing-order pathway • age 12+":drug==="midazolam"?(an>65?"Adult over 65":"Adult 12–65"):an>=65?"Adult 65+":"Adult 12–64"}</b></div>{drug==="adenosine"&&<div className="base-order-note"><b>Patient under 12?</b><span>DMP 9010 requires a direct verbal Base order. This pathway does not calculate pediatric Adenosine.</span></div>}</>:drug==="adenosine"?<HardStop title="BASE CONTACT REQUIRED" reason="DMP 9010 requires a direct verbal Base order for pediatric Adenosine administration." source="DMP 9010 Adenosine" action="Choose Adult if the category was selected incorrectly. Otherwise stop and contact Base for a direct order."/>:<>
                <div className="age-followup"><small>PEDIATRIC DETAIL NEEDED</small><h3>Enter the patient’s age</h3></div>
                <label className="giant-input"><span>Age</span><input autoFocus inputMode="decimal" value={age} onChange={(e)=>setAge(e.target.value)} placeholder="0"/></label>
                <div className="age-unit-toggle age-unit-after-input" aria-label="Age unit">{(["years","months","days"] as AgeUnit[]).map((x)=><button key={x} className={au===x?"selected":""} onClick={()=>setAu(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
                {age!==""&&!au?<div className="input-guidance"><b>Select the age unit</b><span>Choose years, months or days to continue.</span></div>:age!==""&&!ageWithinRange?<div className="input-guidance"><b>Check the age entry</b><span>Use days through 365, months through 143, or years below 12.</span></div>:ageBlocked?<HardStop title="BASE CONTACT REQUIRED" reason="DMP 9230 does not provide a standing-order Fentanyl dose for patients younger than 1 year." source="DMP 9230 Opioids" action="Correct the age if entered incorrectly. Otherwise stop and contact Base for a direct order."/>:null}
              </>}
            </>}
            {!!reason&&ageOk&&!ageBlocked&&<div className="adaptive-section"><small>ROUTE</small><div className="route-grid compact-routes">{routes[drug].map((x)=><button key={x} className={route===x?"selected":""} onClick={()=>{setRoute(x);setWeight("");setTapeColor("")}}>{x}</button>)}</div>{drug==="midazolam"&&reason==="Status epilepticus"&&<div className="source-note">IN is preferred over IM when IV cannot be safely or rapidly obtained.</div>}</div>}
            {!!route&&needWeight&&<div className="adaptive-section"><small>CALCULATION WEIGHT</small><div className="source-grid compact-sources">{[["actual","Actual"],["estimated","Estimated"],...(tapeEligible?[["tape","Length-based tape"]]:[])].map(([id,x])=><button key={id} className={ws===id?"selected":""} onClick={()=>{setWs(id);setWeight("");setTapeColor("");if(id==="tape")setWu("kg")}}>{x}</button>)}</div>
              {weightSuggestion!==null&&ws!=="tape"&&<button className="quick-estimate" onClick={useSuggestedWeight}>Use DMP age-band estimate: {weightSuggestion} kg</button>}
              {ws==="tape"&&tapeEligible?<><div className="tape-heading"><b>Select tape color</b><span>Use only when the child physically fits the tape.</span></div><div className="tape-grid">{tapeBands.map((b)=><button key={b.name} className={tapeColor===b.name?"selected":""} style={{background:b.color,color:b.text}} onClick={()=>selectTapeBand(b.name,b.kg)}><b>{b.name}</b><span>{b.kg} kg</span></button>)}</div></>:<><div className="unit-toggle compact-unit"><button className={wu==="kg"?"selected":""} onClick={()=>setUnit("kg")}>kg</button><button className={wu==="lb"?"selected":""} onClick={()=>setUnit("lb")}>lb</button></div><label className="giant-input compact-weight"><span>Patient weight ({wu})</span><input inputMode="decimal" value={weight} onChange={(e)=>{setWeight(e.target.value);if(ws==="age")setWs("estimated")}} placeholder="0"/></label>{Number(weight)>0&&<div className="kg-lock" role="status"><small>CALCULATION WEIGHT</small><b>{fmt(kg)} kg</b><span>{wu==="lb"?`${weight} lb ÷ 2.2046`:"Entered in kilograms"}</span></div>}</>}
              {ws==="age"&&<div className="estimate-warning"><b>Age-based estimate selected</b><span>Replace it if a better weight becomes available before administration.</span></div>}
            </div>}
            {!!reason&&ageOk&&!ageBlocked&&<Next ok={!!route&&weightOk} go={()=>setStep("safety")} text="Continue to safety checks"/>}
          </Screen>
        )}
        {step === "route" && drug && (
          <Screen
            e="ROUTE"
            t="Which route will be used?"
            h="Only routes listed for this drug and indication are offered."
          >
            <div className="route-grid">
              {routes[drug].map((x) => (
                <button
                  key={x}
                  className={route === x ? "selected" : ""}
                  onClick={() => {
                    setRoute(x);
                    setTimeout(
                      () =>
                        setStep(
                          rules(drug, reason, an, x).weight
                            ? "weight"
                            : "safety",
                        ),
                      60,
                    );
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
            {drug === "midazolam" && reason === "Status epilepticus" && (
              <div className="source-note">
                IN is preferred over IM when IV cannot be safely or rapidly
                obtained.
              </div>
            )}
          </Screen>
        )}
        {step === "weight" && (
          <Screen
            e="WEIGHT-BASED DOSE"
            t="Enter the calculation weight"
            h="Use an actual weight whenever available."
          >
            <div className="source-grid">
              {[
                ["actual", "Actual"],
                ["estimated", "Estimated"],
                ...(tapeEligible ? [["tape", "Length-based tape"]] : []),
              ].map(([id, x]) => (
                <button
                  key={id}
                  className={ws === id ? "selected" : ""}
                  onClick={() => {
                    setWs(id);
                    setWeight("");
                    setTapeColor("");
                    if (id === "tape") setWu("kg");
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
            {weightSuggestion !== null && ws !== "tape" && (
              <div className="age-weight-suggestion">
                <span>
                  <small>DMP CHART AGE-BAND MIDPOINT</small>
                  <b>
                    {weightSuggestion} kg suggested for {ageText}
                  </b>
                  <em>
                    Use only when an actual or length-based weight is
                    unavailable.
                  </em>
                </span>
                <button
                  className={ws === "age" ? "used" : ""}
                  onClick={useSuggestedWeight}
                >
                  {ws === "age" ? "Using estimate ✓" : "Use estimate"}
                </button>
              </div>
            )}
            {an < 0.5 && (
              <div className="input-guidance">
                <b>No age-based suggestion</b>
                <span>
                  DMP does not provide an age-band weight for patients younger
                  than 6 months. Use an actual, estimated, or length-based
                  weight.
                </span>
              </div>
            )}
            {ws !== "tape" && ws !== "age" && (
              <div className="unit-toggle">
                <button
                  className={wu === "kg" ? "selected" : ""}
                  onClick={() => setUnit("kg")}
                >
                  Kilograms
                </button>
                <button
                  className={wu === "lb" ? "selected" : ""}
                  onClick={() => setUnit("lb")}
                >
                  Pounds
                </button>
              </div>
            )}
            {ws === "tape" && tapeEligible ? (
              <>
                <div className="tape-heading">
                  <b>Select the tape color</b>
                  <span>Use only when the child physically fits the tape.</span>
                </div>
                <div className="tape-grid">
                  {tapeBands.map((b) => (
                    <button
                      key={b.name}
                      className={tapeColor === b.name ? "selected" : ""}
                      style={{ background: b.color, color: b.text }}
                      onClick={() => selectTapeBand(b.name, b.kg)}
                    >
                      <b>{b.name}</b>
                      <span>{b.kg} kg</span>
                    </button>
                  ))}
                </div>
                {tapeColor && (
                  <div className="tape-selected">
                    <span>Selected length-based band</span>
                    <b>
                      {tapeColor} • {fmt(kg)} kg
                    </b>
                  </div>
                )}
              </>
            ) : (
              <label className="giant-input">
                <span>
                  {ws === "age"
                    ? "Accepted age-based estimate (kg)"
                    : `Patient weight ()`}
                </span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    if (ws === "age") setWs("estimated");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && weightOk) next();
                  }}
                  placeholder="0"
                />
              </label>
            )}
            {ws === "age" && (
              <div className="estimate-warning">
                <b>Age-based estimate accepted</b>
                <span>
                  Replace it if a better weight becomes available before
                  medication administration.
                </span>
              </div>
            )}
            <Next ok={valid.weight} go={next} />
          </Screen>
        )}
        {step === "safety" && drug && (
          <Screen
            e="CONTRAINDICATIONS"
            t="Confirm applicable safety checks"
            h={`Only checks applicable to ${medName(drug)} are shown.`}
          >
            <div className="safety-list">
              {items.map((x, i) => (
                <label key={x} className={checks[i] ? "checked" : ""}>
                  <input
                    type="checkbox"
                    checked={!!checks[i]}
                    onChange={(e) =>
                      setChecks(
                        checks.map((v, n) => (n === i ? e.target.checked : v)),
                      )
                    }
                  />
                  <span>
                    <b>{i + 1}</b>
                    {x}
                  </span>
                </label>
              ))}
            </div>
            <a
              className="protocol-link"
              href={protocolUrl(drug)}
              target="_blank"
              rel="noreferrer"
            >
              Open current DMP medication protocol ↗
            </a>
            <Next ok={valid.safety} go={next} />
          </Screen>
        )}
        {step === "vial" && drug && r && (
          <Screen
            e="DOSE & CONCENTRATION"
            t={`Build the ${medName(drug)} dose`}
            h="Complete each section from top to bottom."
          >
            <div className="route-rule">
              <b>
                {route} • {reason}
              </b>
              <span>
                {r.repeat>0?`Repeat after ${r.repeat} minutes`:"Repeat per protocol"} • {r.repeatText}
              </span>
              {r.note && <small>{r.note}</small>}
            </div>
            <div className="route-label">
              1. Select the ordered DMP initial dose
            </div>
            {r.rates.length === 1 ? (
              <div className="locked-dose">
                <b>
                  {r.rates[0]} {unit}
                  {r.perKg ? "/kg" : ""}
                </b>
                <span>
                  Automatically selected for this age, indication and route
                </span>
              </div>
            ) : (
              <div className="dose-rate-grid">
                {r.rates.map((x) => (
                  <button
                    key={x}
                    className={rate === x ? "selected" : ""}
                    onClick={() => setRate(x)}
                  >
                    <b>
                      {x} {unit}/kg
                    </b>
                    <span>DMP option</span>
                  </button>
                ))}
              </div>
            )}
            {rate === null ? (
              <div className="completion-prompt">
                <b>Dose selection required</b>
                <span>
                  Select the ordered DMP dose above before entering the vial
                  concentration.
                </span>
              </div>
            ) : (
              <>
                <div className="med-verify">
                  <div className={`photo-placeholder ${medicationPhoto(drug)?"has-med-photo":""}`}>
                    {medicationPhoto(drug)?<img className="medication-vial-photo" src={medicationPhoto(drug)} alt={`${medName(drug)} 12 mg per 4 mL vial reference`}/>:<><div className="drawn-vial">
                      <small>{medName(drug).toUpperCase()}</small>
                      <b>VIAL</b>
                      <small>PHOTO REQUIRED</small>
                    </div>
                    <span>Department photo pending</span></>}
                    <div className="verified-medication">
                      <b>✓ Medication confirmed</b>
                      <span>{medName(drug)}</span>
                    </div>
                  </div>
                  <div className="dose-card">
                    <small>CALCULATED INITIAL DOSE</small>
                    <h3>
                      {fmt(dose)} {unit}
                    </h3>
                    <p>
                      <span>Patient</span>
                      <b>{needWeight ? `${fmt(kg)} kg` : "Adult fixed dose"}</b>
                    </p>
                    <p>
                      <span>Route</span>
                      <b>{route}</b>
                    </p>
                  </div>
                </div>
                <div className="confirmed-source">
                  <small>CONFIRMED VIAL CONCENTRATION</small>
                  <strong>{amt} {unit} in {ml} mL</strong>
                  <b>{fmt(conc)} {unit}/mL</b>
                  <span>Confirmed before patient dosing information was entered.</span>
                </div>
                {capped && <div className="ceiling-alert" role="alert"><b>PROTOCOL MAXIMUM APPLIED</b><strong>{fmt(baseDose)} {unit} calculated → {fmt(dose)} {unit} maximum</strong><span>The displayed administration volume uses the capped dose. Verify the ceiling against the linked protocol.</span></div>}
                {inTooHigh && (
                  <HardStop
                    title="IN VOLUME EXCEEDS LIMIT"
                    reason={`The calculated total volume of ${fmt(vol)} mL would require more than 1 mL in at least one nostril. DMP limits IN Fentanyl to 1 mL per nostril.`}
                    source="DMP 9230 Opioids"
                    action="Use an appropriate higher concentration or select another DMP-approved route, then recalculate."
                  />
                )}
                <Next ok={valid.vial} go={next} text="Review final dose" />
              </>
            )}
          </Screen>
        )}
        {step === "review" && drug && r && (
          <Screen
            e="FINAL CROSS-CHECK"
            t="Select and confirm the dose"
            h="Choose the ordered DMP dose when required, then read the action line aloud."
          >
            <div className="final-context"><span>{route} • {reason}</span><b>{fmt(conc)} {unit}/mL confirmed</b><a href={protocolUrl(drug)} target="_blank" rel="noreferrer">{protocolId(drug)} ↗</a></div>
            {r.rates.length>1&&<><div className="route-label">Select the ordered DMP initial dose</div><div className="dose-rate-grid">{r.rates.map((x)=><button key={x} className={rate===x?"selected":""} onClick={()=>setRate(x)}><b>{x} {unit}/kg</b><span>DMP option</span></button>)}</div></>}
            {rate===null?<div className="completion-prompt"><b>Dose selection required</b><span>Select the ordered DMP dose above to calculate the administration volume.</span></div>:inTooHigh?<HardStop title="IN VOLUME EXCEEDS LIMIT" reason={`The calculated total volume of ${fmt(vol)} mL would require more than 1 mL in at least one nostril. DMP limits IN Fentanyl to 1 mL per nostril.`} source="DMP 9230 Opioids" action="Go back and select another DMP-approved route or use an appropriate higher concentration, then recalculate."/>:<>
            <div className="action-line">
              <small>INITIAL DOSE</small>
              <strong>
                GIVE {fmt(dose)} {unit} = DRAW {fmt(vol)} mL
              </strong>
              <b>{route}</b>
            </div>
            {drug==="fentanyl"&&adult&&<div className="dose-guidance"><b>ADULT DOSING GUIDANCE</b><span>Initial dose is typically 100 mcg. Adult doses may be rounded to the nearest 25 mcg.</span></div>}
            {capped && <div className="ceiling-alert" role="alert"><b>PROTOCOL MAXIMUM APPLIED</b><strong>{fmt(baseDose)} {unit} calculated → GIVE {fmt(dose)} {unit}</strong><span>Do not administer the uncapped weight-based result.</span></div>}
            <div className={`monitoring-cautions ${drug}`}><small>MONITORING & ADMINISTRATION</small><ul>{monitoringCautions(drug).map((x)=><li key={x}>{x}</li>)}</ul></div>
            <DoseTracker
              entries={dosesGiven}
              unit={unit}
              total={totalGiven}
              totalVolume={totalVolume}
              maxTotal={maxTotal}
              repeatsLeft={repeatsLeft}
              repeatMinutes={r.repeat}
              secondsLeft={secondsLeft}
              nextDose={nextRepeat}
              concentration={conc}
              drug={drug}
              reason={reason}
              record={recordDose}
            />
            <details className="calculation-details">
              <summary>Show calculation and syringe guide</summary>
              <MathPicture
                perKg={r.perKg}
                kg={kg}
                rate={rate || 0}
                dose={dose}
                amount={Number(amt)}
                vialMl={Number(ml)}
                concentration={conc}
                volume={vol}
                unit={unit}
              />
              <SyringeDiagram volume={vol} />
            </details>
            <MedicationReport
              drug={medName(drug)}
              reason={reason}
              route={route || ""}
              age={ageText}
              patientClass={adult ? "Adult" : "Pediatric"}
              weight={needWeight ? `${fmt(kg)} kg` : undefined}
              weightSource={
                ws === "age"
                  ? "age-based estimate"
                  : ws === "tape"
                    ? `${tapeColor} length-based band`
                    : ws
              }
              protocol={drug==="fentanyl"?"DMP 9230 • July 2026":drug==="adenosine"?"DMP 9010 • July 2026":"DMP 9070 • July 2026"}
              doseRule={
                r.perKg
                  ? `${fmt(kg)} kg × ${rate} ${unit}/kg`
                  : `${rate} ${unit} fixed dose`
              }
              concentration={`${fmt(conc)} ${unit}/mL`}
              calculatedDose={`${fmt(dose)} ${unit}`}
              calculatedVolume={`${fmt(vol)} mL`}
              unit={unit}
              entries={dosesGiven}
            />
            <details className="full-cross-check">
              <summary>Show full medication cross-check</summary>
            <div className="final-card">
              <div className="final-drug">
                <span>Medication</span>
                <b>{medName(drug)}</b>
                <small>
                  {reason} • {route}
                </small>
              </div>
              <Review
                l="Patient"
                v={`${adult ? "Adult" : "Pediatric"} • age ${ageText}${needWeight ? ` • ${fmt(kg)} kg${ws === "age" ? " (age-based estimate)" : ws === "tape" ? ` ( length-based band)` : ""}` : ""}`}
              />
              <Review
                l="Medication check"
                v={`Physical vial confirmed as ${medName(drug)}`}
              />
              <Review
                l="DMP dose"
                v={
                  r.perKg
                    ? `${fmt(kg)} kg × ${rate} ${unit}/kg = ${fmt(baseDose)} ${unit}`
                    : `${rate} ${unit} fixed dose`
                }
              />
              {capped && (
                <Review
                  l="Maximum applied"
                  v={`${fmt(baseDose)} ${unit} capped at ${r.maxSingle} ${unit}`}
                />
              )}
              <Review
                l="Repeat rule"
                v={`${r.repeat>0?`After ${r.repeat} min`:"Per protocol"} • ${r.repeatText}`}
              />
              {drug === "fentanyl" && route === "IN" && (
                <Review
                  l="IN volume split"
                  v={`${fmt(vol / 2)} mL per nostril (${fmt(vol)} mL total)`}
                />
              )}
              <Review
                l="Vial"
                v={`${amt} ${unit} in ${ml} mL = ${fmt(conc)} ${unit}/mL`}
              />
              <Review
                l="Volume calculation"
                v={`${fmt(dose)} ${unit} ÷ ${fmt(conc)} ${unit}/mL = ${fmt(vol)} mL`}
              />
              <Review
                l="Protocol"
                v={
                  drug === "fentanyl"
                    ? "DMP 9230 • July 2026"
                    : drug === "adenosine"
                      ? "DMP 9010 • July 2026"
                      : "DMP 9070 • July 2026"
                }
              />
            </div>
            <div className="final-warning">
              <b>DMP cross-check required</b>
              <span>
                The syringe diagram is a visual cross-check, not an actual-size
                measuring tool. Verify the physical syringe markings, Six Rights
                and verbal repeat-back. Obtain repeat vital signs after
                administration.
              </span>
            </div>
            </details>
            </>}
            <button className="new-calc" onClick={reset}>
              Start a new calculation
            </button>
          </Screen>
        )}
      </section>
      {install && (
        <div className="modal-backdrop" onClick={() => setInstall(false)}>
          <section className="install-modal">
            <button className="close" onClick={() => setInstall(false)}>
              ×
            </button>
            <h2>Install for offline use</h2>
            <ol>
              <li>Open in Safari and tap Share.</li>
              <li>
                Choose <b>Add to Home Screen</b>.
              </li>
              <li>Open once online after protocol updates.</li>
            </ol>
          </section>
        </div>
      )}
      <FieldToolbar
        ageYears={ageOk?an:null}
        ageLabel={ageOk?ageText:""}
        weightKg={needWeight&&weightOk?kg:null}
        currentDrug={drug?medName(drug):undefined}
        currentDose={drug&&r&&rate!==null?`${fmt(dose)} ${unit}`:undefined}
        currentVolume={drug&&r&&rate!==null&&conc>0?`${fmt(vol)} mL`:undefined}
        onSelectMedication={beginMedication}
      />
    </main>
  );
}
function Screen({
  e,
  t,
  h,
  children,
}: {
  e: string;
  t: string;
  h: string;
  children: ReactNode;
}) {
  return (
    <section className="wizard-card">
      <small className="eyebrow">{e}</small>
      <h1>{t}</h1>
      <p className="screen-help">{h}</p>
      {children}
    </section>
  );
}
function HardStop({
  title,
  reason,
  source,
  action,
}: {
  title: string;
  reason: string;
  source: string;
  action: string;
}) {
  return (
    <div className="hard-stop" role="alert">
      <b>{title}</b>
      <span>
        <strong>Why:</strong> {reason}
      </span>
      <span>
        <strong>Protocol:</strong> {source}
      </span>
      <span>
        <strong>Next:</strong> {action}
      </span>
    </div>
  );
}
function Next({
  ok,
  go,
  text = "Continue",
}: {
  ok: boolean;
  go: () => void;
  text?: string;
}) {
  return (
    <button className="continue" disabled={!ok} onClick={go}>
      {text}
      <span>→</span>
    </button>
  );
}
function Review({ l, v }: { l: string; v: string }) {
  return (
    <div className="review-row">
      <span>{l}</span>
      <b>{v}</b>
    </div>
  );
}
function MathPicture({
  perKg,
  kg,
  rate,
  dose,
  amount,
  vialMl,
  concentration,
  volume,
  unit,
}: {
  perKg: boolean;
  kg: number;
  rate: number;
  dose: number;
  amount: number;
  vialMl: number;
  concentration: number;
  volume: number;
  unit: string;
}) {
  return (
    <section className="math-picture" aria-label="Dose calculation picture">
      <h2>Calculation picture</h2>
      <div>
        <span>
          <small>1 • DOSE</small>
          <b>
            {perKg
              ? `${fmt(kg)} kg × ${fmt(rate)} ${unit}/kg`
              : `Fixed DMP dose`}
          </b>
          <strong>
            {fmt(dose)} {unit}
          </strong>
        </span>
        <i>→</i>
        <span>
          <small>2 • CONCENTRATION</small>
          <b>
            {fmt(amount)} {unit} ÷ {fmt(vialMl)} mL
          </b>
          <strong>
            {fmt(concentration)} {unit}/mL
          </strong>
        </span>
        <i>→</i>
        <span className="math-answer">
          <small>3 • DRAW</small>
          <b>
            {fmt(dose)} ÷ {fmt(concentration)}
          </b>
          <strong>{fmt(volume)} mL</strong>
        </span>
      </div>
    </section>
  );
}
function SyringeDiagram({ volume }: { volume: number }) {
  const size = syringeSize(volume),
    fill = Math.min(volume / size, 1) * 190,
    marker = 20 + fill;
  return (
    <section
      className="syringe-card"
      aria-label={`${size} mL syringe drawn to ${fmt(volume)} mL`}
    >
      <div className="syringe-heading">
        <span>
          <small>SUGGESTED SYRINGE</small>
          <b>{size} mL syringe</b>
        </span>
        <strong>DRAW TO {fmt(volume)} mL</strong>
      </div>
      <svg
        viewBox="0 0 300 135"
        role="img"
        aria-label={`Diagram of medication drawn to ${fmt(volume)} mL in a ${size} mL syringe`}
      >
        <path
          d="M4 68h16M4 61v14M210 55h29v26h-29M239 68h49M288 55v26"
          fill="none"
          stroke="#193447"
          strokeWidth="4"
        />
        <rect
          x="20"
          y="40"
          width="190"
          height="55"
          rx="8"
          fill="#fff"
          stroke="#193447"
          strokeWidth="4"
        />
        <rect
          x="22"
          y="42"
          width={Math.max(fill - 2, 0)}
          height="51"
          rx="5"
          fill="#75c9df"
        />
        <line
          x1={marker}
          y1="36"
          x2={marker}
          y2="100"
          stroke="#08745f"
          strokeWidth="4"
        />
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={i}
            x1={20 + i * 19}
            y1="40"
            x2={20 + i * 19}
            y2={i % 5 === 0 ? 55 : 49}
            stroke="#193447"
            strokeWidth="2"
          />
        ))}
        <text x="20" y="118" fontSize="12" fill="#435b6b">
          0
        </text>
        <text x="195" y="118" fontSize="12" fill="#435b6b">
          {size} mL
        </text>
        <text
          x={Math.min(Math.max(marker - 20, 55), 220)}
          y="28"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#08745f"
        >
          {fmt(volume)} mL
        </text>
      </svg>
      <p>
        Use the smallest stocked syringe that safely accommodates the volume.
        Diagram is not actual size; verify the physical graduations.
      </p>
    </section>
  );
}
function syringeSize(volume: number) {
  return [1, 3, 5, 10, 20, 30, 60].find((x) => volume <= x) || 60;
}
function fmt(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(2)).toString() : "—";
}
function medName(d: Drug) {
  return d === "fentanyl" ? "Fentanyl" : d==="adenosine"?"Adenosine (Adenocard)":"Midazolam (Versed)";
}
function protocolId(d: Drug) {
  return d==="fentanyl"?"DMP 9230":d==="adenosine"?"DMP 9010":"DMP 9070";
}
