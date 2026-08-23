import { useMemo, useState } from "react";

type SupportedDrug = "adenosine" | "fentanyl" | "midazolam";
type Tool = "meds" | "vitals" | "treatment" | "protocols" | null;
type Props = {
  ageYears: number | null;
  ageLabel: string;
  weightKg: number | null;
  currentDrug?: string;
  currentDose?: string;
  currentVolume?: string;
  onSelectMedication: (drug: SupportedDrug) => void;
};

const DMP_URL = "https://dmemsmd.org/wp-content/uploads/sites/51/2026/07/DMEMSMD-Protocols-July-2026-FINAL-2026-07-20.pdf";
const medications = [
  ["9005","Acetaminophen"],["9010","Adenosine"],["9020","Albuterol"],["9030","Amiodarone"],["9040","Antiemetics"],["9045","Antipsychotics"],["9050","Aspirin"],["9060","Atropine"],["9070","Benzodiazepines / Midazolam"],["9080","Calcium"],["9090","Dextrose"],["9095","Diltiazem"],["9100","Diphenhydramine"],["9110","Dopamine"],["9115","DuoDote"],["9120","Epinephrine"],["9130","Glucagon"],["9150","Hemostatic agents"],["9160","Hydroxocobalamin"],["9170","Ipratropium"],["9180","Lidocaine 2%"],["9190","Magnesium sulfate"],["9200","Methylprednisolone"],["9210","Naloxone"],["9220","Nitroglycerin"],["9225","NSAID"],["9230","Opioids / Fentanyl"],["9240","Oral glucose"],["9250","Oxygen"],["9260","Phenylephrine"],["9270","Racemic epinephrine"],["9280","Sodium bicarbonate"],["9290","Topical ophthalmic anesthetics"],
];
const protocols = [
  ["0015","Age Definitions"],["0120","Base Contact"],["0990","Procedures and Medications Allowed"],["1000","Oral Intubation"],["1050","Supraglottic Airway"],["1070","Capnography"],["1080","Needle Thoracostomy"],["1090","Synchronized Cardioversion"],["1100","Transcutaneous Pacing"],["1160","Pain Management"],["2000","Obstructed Airway"],["2020","Pediatric Respiratory Distress"],["3000","Medical Pulseless Arrest"],["3040","Tachyarrhythmia with Poor Perfusion"],["3050","Bradyarrhythmia with Poor Perfusion"],["4000","Medical Shock"],["4040","Seizure"],["6010","Agitated/Combative Patient"],["8000","General Trauma Care"],["8020","Traumatic Shock"],["9000","Medication Administration Guidelines"],
];

export default function FieldToolbar(p: Props) {
  const [tool,setTool]=useState<Tool>(null),[query,setQuery]=useState(""),[lookupAge,setLookupAge]=useState("");
  const age = p.ageYears ?? (lookupAge === "" ? null : Number(lookupAge));
  const context = p.ageYears !== null ? `Current patient • ${p.ageLabel}${p.weightKg ? ` • ${fmt(p.weightKg)} kg` : ""}` : "No current patient • lookup mode";
  const close=()=>{setTool(null);setQuery("")};
  return <>
    <nav className="field-toolbar" aria-label="Quick clinical reference">
      <button onClick={()=>setTool("meds")}><span>Rx</span><b>Meds</b></button>
      <button onClick={()=>setTool("vitals")}><span>♥</span><b>Vitals</b></button>
      <button onClick={()=>setTool("treatment")}><span>✚</span><b>Treatment</b></button>
      <button onClick={()=>setTool("protocols")}><span>§</span><b>Protocols</b></button>
    </nav>
    {tool&&<div className="quick-drawer-backdrop" onClick={close}><section className="quick-drawer" role="dialog" aria-modal="true" aria-label={`${tool} quick reference`} onClick={e=>e.stopPropagation()}>
      <div className="drawer-handle"/><header><span><small>QUICK REFERENCE</small><h2>{tool==="meds"?"Denver Metro medications":tool==="vitals"?"Vital-sign thresholds":tool==="treatment"?"Treatment calculations":"Protocol lookup"}</h2></span><button onClick={close} aria-label="Close">×</button></header>
      <div className="drawer-patient">{context}</div>
      {tool==="meds"&&<MedicationPanel {...p} onSelectMedication={(drug)=>{p.onSelectMedication(drug);close()}} query={query} setQuery={setQuery}/>} 
      {tool==="vitals"&&<VitalsPanel age={age} lookupAge={lookupAge} setLookupAge={setLookupAge} hasPatient={p.ageYears!==null}/>} 
      {tool==="treatment"&&<TreatmentPanel age={age} kg={p.weightKg}/>} 
      {tool==="protocols"&&<LookupList title="Search protocol number or name" items={protocols} query={query} setQuery={setQuery}/>} 
      <a className="drawer-protocol-link" href={DMP_URL} target="_blank" rel="noreferrer">Open current July 2026 DMP PDF ↗</a>
    </section></div>}
  </>;
}

function MedicationPanel(p: Props & {query:string;setQuery:(x:string)=>void}) {
  const supported:[SupportedDrug,string,string][]=[["adenosine","Adenosine","Adult standing order 12+"],["fentanyl","Fentanyl","Adult and pediatric 1+"],["midazolam","Midazolam (Versed)","Status epilepticus or procedural sedation"]];
  return <>
    {p.currentDrug&&<div className="current-reference"><small>CURRENT CALCULATION</small><b>{p.currentDrug}</b>{p.currentDose&&<strong>{p.currentDose}{p.currentVolume?` • ${p.currentVolume}`:""}</strong>}</div>}
    <h3>Patient calculator choices</h3><div className="drawer-med-choices">{supported.map(([id,name,note])=><button key={id} onClick={()=>p.onSelectMedication(id)}><b>{name}</b><span>{note}</span><i>›</i></button>)}</div>
    <LookupList title="All DMP medication references" items={medications} query={p.query} setQuery={p.setQuery}/>
  </>;
}

function VitalsPanel({age,lookupAge,setLookupAge,hasPatient}:{age:number|null;lookupAge:string;setLookupAge:(x:string)=>void;hasPatient:boolean}) {
  const thresholds=age===null?null:vitalThresholds(age);
  return <><div className="lookup-age"><label>{hasPatient?"Current patient age is being used":"Enter age for lookup"}<input inputMode="decimal" value={hasPatient?(age?.toString()||""):lookupAge} disabled={hasPatient} onChange={e=>setLookupAge(e.target.value)} placeholder="Age in years"/></label></div>
    {thresholds?<><div className="threshold-grid"><span><small>HYPOTENSION</small><b>SBP {thresholds.sbp}</b></span><span><small>TACHYCARDIA</small><b>HR {thresholds.hr}</b></span></div><div className="reference-warning"><b>Abnormal screening thresholds—not normal ranges.</b><span>Interpret with perfusion, mental status, work of breathing and the applicable protocol.</span></div></>:<div className="drawer-empty">Enter an age to show DMP shock thresholds.</div>}
  </>;
}

function TreatmentPanel({age,kg}:{age:number|null;kg:number|null}) {
  const pediatric=age!==null&&age<12;
  return <div className="treatment-list">
    <section><small>SYNCHRONIZED CARDIOVERSION</small>{age===null?<b>Select or enter a patient age in Vitals</b>:pediatric&&kg?<><b>{fmt(.5*kg)}–{fmt(kg)} J</b><span>0.5–1 J/kg biphasic</span></>:pediatric?<b>Weight required</b>:<><b>200 J</b><span>Adult biphasic</span></>}</section>
    <section><small>DEFIBRILLATION — PEDIATRIC ARREST</small>{pediatric&&kg?<><b>First: {fmt(2*kg)} J</b><strong>Subsequent: {fmt(4*kg)} J</strong><span>2 J/kg, then 4 J/kg</span></>:<><b>{pediatric?"Weight required":"Pediatric pathway only"}</b><span>Adult energy follows arrest protocol/device guidance.</span></>}</section>
    <section><small>AIRWAY EQUIPMENT</small><b>Use agency-approved age/weight/length system</b><span>DMP requires a standardized pediatric medication and equipment system but does not publish one universal airway-size table.</span></section>
  </div>;
}

function LookupList({title,items,query,setQuery}:{title:string;items:string[][];query:string;setQuery:(x:string)=>void}) {
  const shown=useMemo(()=>items.filter(([id,name])=>(id+name).toLowerCase().includes(query.toLowerCase())),[items,query]);
  return <div className="drawer-lookup"><label>{title}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></label><div>{shown.map(([id,name])=><a key={id} href={DMP_URL} target="_blank" rel="noreferrer"><small>DMP {id}</small><b>{name}</b><span>↗</span></a>)}</div></div>;
}
function vitalThresholds(age:number){const sbp=age<1?"<70 mmHg":age<=10?`<${fmt(70+2*age)} mmHg`:"<90 mmHg";const hr=age<1?">160 bpm":age<2?">150 bpm":age<5?">140 bpm":age<=12?">120 bpm":">100 bpm";return{sbp,hr}}
function fmt(n:number){return Number(n.toFixed(1)).toString()}
