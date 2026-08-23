import { useMemo, useState } from "react";
import ProtocolViewer, { type ProtocolTarget } from "./ProtocolViewer";

type SupportedDrug = "adenosine" | "fentanyl" | "midazolam";
type Tool = "meds" | "vitals" | "treatment" | "protocols" | null;
type Props = {
  ageYears: number | null;
  ageLabel: string;
  weightKg: number | null;
  currentDrugId?: SupportedDrug;
  currentDrug?: string;
  currentIndication?: string;
  currentDose?: string;
  currentVolume?: string;
  onSelectMedication: (drug: SupportedDrug) => void;
};

const DMP_URL = "https://dmemsmd.org/wp-content/uploads/sites/51/2026/07/DMEMSMD-Protocols-July-2026-FINAL-2026-07-20.pdf";
const medications:ProtocolTarget[] = [
  {id:"9005",name:"Acetaminophen",page:122},{id:"9010",name:"Adenosine",page:123},{id:"9020",name:"Albuterol",page:125},{id:"9030",name:"Amiodarone",page:127},{id:"9040",name:"Antiemetics",page:128},{id:"9045",name:"Antipsychotics",page:129},{id:"9050",name:"Aspirin",page:134},{id:"9060",name:"Atropine",page:135},{id:"9070",name:"Benzodiazepines / Midazolam",page:136},{id:"9080",name:"Calcium",page:140},{id:"9090",name:"Dextrose",page:142},{id:"9095",name:"Diltiazem",page:143},{id:"9100",name:"Diphenhydramine",page:144},{id:"9110",name:"Dopamine",page:145},{id:"9115",name:"DuoDote",page:146},{id:"9120",name:"Epinephrine",page:148},{id:"9130",name:"Glucagon",page:151},{id:"9150",name:"Hemostatic agents",page:152},{id:"9160",name:"Hydroxocobalamin",page:153},{id:"9170",name:"Ipratropium",page:155},{id:"9180",name:"Lidocaine 2%",page:156},{id:"9190",name:"Magnesium sulfate",page:157},{id:"9200",name:"Methylprednisolone",page:158},{id:"9210",name:"Naloxone",page:159},{id:"9220",name:"Nitroglycerin",page:161},{id:"9225",name:"NSAID",page:162},{id:"9230",name:"Opioids / Fentanyl",page:163},{id:"9240",name:"Oral glucose",page:165},{id:"9250",name:"Oxygen",page:166},{id:"9260",name:"Phenylephrine",page:167},{id:"9270",name:"Racemic epinephrine",page:168},{id:"9280",name:"Sodium bicarbonate",page:169},{id:"9290",name:"Topical ophthalmic anesthetics",page:170},
];
const protocols:ProtocolTarget[] = [
  {id:"0015",name:"Age Definitions",page:8},{id:"0120",name:"Base Contact",page:28},{id:"0990",name:"Procedures and Medications Allowed",page:37},{id:"1000",name:"Oral Intubation",page:40},{id:"1050",name:"Supraglottic Airway",page:44},{id:"1070",name:"Capnography",page:46},{id:"1080",name:"Needle Thoracostomy",page:47},{id:"1090",name:"Synchronized Cardioversion",page:48},{id:"1100",name:"Transcutaneous Pacing",page:49},{id:"1160",name:"Pain Management",page:56},{id:"2000",name:"Obstructed Airway",page:58},{id:"2020",name:"Pediatric Respiratory Distress",page:60},{id:"3000",name:"Medical Pulseless Arrest",page:66},{id:"3040",name:"Tachyarrhythmia with Poor Perfusion",page:70},{id:"3050",name:"Bradyarrhythmia with Poor Perfusion",page:71},{id:"4000",name:"Medical Shock",page:76},{id:"4040",name:"Seizure",page:80},{id:"6010",name:"Agitated/Combative Patient",page:100},{id:"8000",name:"General Trauma Care",page:107},{id:"8020",name:"Traumatic Shock",page:109},{id:"9000",name:"Medication Administration Guidelines",page:121},
];

export default function FieldToolbar(p: Props) {
  const [tool,setTool]=useState<Tool>(null),[query,setQuery]=useState(""),[lookupAge,setLookupAge]=useState(""),[protocol,setProtocol]=useState<ProtocolTarget|null>(null);
  const age = p.ageYears ?? (lookupAge === "" ? null : Number(lookupAge));
  const context = p.ageYears !== null ? `Current patient • ${p.ageLabel}${p.weightKg ? ` • ${fmt(p.weightKg)} kg` : ""}` : "No current patient • lookup mode";
  const treatmentReady = Boolean(p.currentDrugId && p.currentIndication);
  const treatmentHint = p.currentDrugId && !p.currentIndication ? "Select why the medication is being given first" : "Select a medication and indication first";
  const close=()=>{setTool(null);setQuery("")};
  return <>
    <nav className="field-toolbar" aria-label="Quick clinical reference">
      <button onClick={()=>setTool("meds")}><span>Rx</span><b>Meds</b></button>
      <button onClick={()=>setTool("vitals")}><span>♥</span><b>Vitals</b></button>
      <button disabled={!treatmentReady} title={!treatmentReady?treatmentHint:undefined} aria-label={treatmentReady?"Treatment":"Treatment unavailable — "+treatmentHint} onClick={()=>setTool("treatment")}><span>✚</span><b>Treatment</b></button>
      <button onClick={()=>setTool("protocols")}><span>§</span><b>Protocols</b></button>
    </nav>
    {tool&&<div className="quick-drawer-backdrop" onClick={close}><section className="quick-drawer" role="dialog" aria-modal="true" aria-label={`${tool} quick reference`} onClick={e=>e.stopPropagation()}>
      <div className="drawer-handle"/><header><span><small>QUICK REFERENCE</small><h2>{tool==="meds"?"Denver Metro medications":tool==="vitals"?"Vital-sign thresholds":tool==="treatment"?"Treatment calculations":"Protocol lookup"}</h2></span><button onClick={close} aria-label="Close">×</button></header>
      <div className="drawer-patient">{context}</div>
      {tool==="meds"&&<MedicationPanel {...p} onSelectMedication={(drug)=>{p.onSelectMedication(drug);close()}} query={query} setQuery={setQuery} openProtocol={setProtocol}/>} 
      {tool==="vitals"&&<VitalsPanel age={age} lookupAge={lookupAge} setLookupAge={setLookupAge} hasPatient={p.ageYears!==null}/>} 
      {tool==="treatment"&&p.currentDrugId&&p.currentIndication&&<TreatmentPanel age={age} kg={p.weightKg} drug={p.currentDrugId} indication={p.currentIndication} openProtocol={setProtocol}/>} 
      {tool==="protocols"&&<LookupList title="Search protocol number or name" items={protocols} query={query} setQuery={setQuery} openProtocol={setProtocol}/>} 
      <a className="drawer-protocol-link" href={DMP_URL} target="_blank" rel="noreferrer">Open current July 2026 DMP PDF ↗</a>
    </section></div>}
    {protocol&&<ProtocolViewer target={protocol} close={()=>setProtocol(null)}/>} 
  </>;
}

function MedicationPanel(p: Props & {query:string;setQuery:(x:string)=>void;openProtocol:(x:ProtocolTarget)=>void}) {
  const supported:[SupportedDrug,string,string][]=[["adenosine","Adenosine","Adult standing order 12+"],["fentanyl","Fentanyl","Adult and pediatric 1+"],["midazolam","Midazolam (Versed)","Status epilepticus or procedural sedation"]];
  return <>
    {p.currentDrug&&<div className="current-reference"><small>CURRENT CALCULATION</small><b>{p.currentDrug}</b>{p.currentDose&&<strong>{p.currentDose}{p.currentVolume?` • ${p.currentVolume}`:""}</strong>}</div>}
    <h3>Patient calculator choices</h3><div className="drawer-med-choices">{supported.map(([id,name,note])=><button key={id} onClick={()=>p.onSelectMedication(id)}><b>{name}</b><span>{note}</span><i>›</i></button>)}</div>
    <LookupList title="All DMP medication references" items={medications} query={p.query} setQuery={p.setQuery} openProtocol={p.openProtocol}/>
  </>;
}

function VitalsPanel({age,lookupAge,setLookupAge,hasPatient}:{age:number|null;lookupAge:string;setLookupAge:(x:string)=>void;hasPatient:boolean}) {
  const thresholds=age===null?null:vitalThresholds(age);
  return <><div className="lookup-age"><label>{hasPatient?"Current patient age is being used":"Enter age for lookup"}<input inputMode="decimal" value={hasPatient?(age?.toString()||""):lookupAge} disabled={hasPatient} onChange={e=>setLookupAge(e.target.value)} placeholder="Age in years"/></label></div>
    {thresholds?<><div className="threshold-grid"><span><small>HYPOTENSION</small><b>SBP {thresholds.sbp}</b></span><span><small>TACHYCARDIA</small><b>HR {thresholds.hr}</b></span></div><div className="reference-warning"><b>Abnormal screening thresholds—not normal ranges.</b><span>Interpret with perfusion, mental status, work of breathing and the applicable protocol.</span></div></>:<div className="drawer-empty">Enter an age to show DMP shock thresholds.</div>}
  </>;
}

function TreatmentPanel({age,kg,drug,indication,openProtocol}:{age:number|null;kg:number|null;drug:SupportedDrug;indication:string;openProtocol:(x:ProtocolTarget)=>void}) {
  const pediatric=age!==null&&age<12;
  const treatment=treatmentProtocol(drug,indication);
  const cardioversion=indication.toLowerCase().includes("cardioversion");
  return <div className="treatment-list">
    <button className="smart-protocol" onClick={()=>openProtocol(treatment)}><small>CURRENT TREATMENT PROTOCOL</small><b>DMP {treatment.id} • {treatment.name}</b><span>{indication}</span><strong>Open page {treatment.page} ›</strong></button>
    {cardioversion&&<section><small>SYNCHRONIZED CARDIOVERSION</small>{age===null?<b>Patient age is required</b>:pediatric&&kg?<><b>{fmt(.5*kg)}–{fmt(kg)} J</b><span>0.5–1 J/kg biphasic</span></>:pediatric?<b>Patient weight is required</b>:<><b>200 J</b><span>Adult biphasic</span></>}</section>}
    {drug==="midazolam"&&indication==="Status epilepticus"&&<section><small>SEIZURE PATHWAY</small><b>Airway, oxygenation and continuous monitoring</b><span>Use the current DMP 4040 pathway and medication-specific monitoring cautions. Reassess after each dose.</span></section>}
    {drug==="fentanyl"&&<section><small>PAIN MANAGEMENT PATHWAY</small><b>Reassess pain, respiratory status and perfusion</b><span>Document response and cumulative dose after each administration.</span></section>}
  </div>;
}

function treatmentProtocol(drug:SupportedDrug,indication:string):ProtocolTarget {
  if(drug==="midazolam"&&indication==="Status epilepticus") return {id:"4040",name:"Seizure",page:80};
  if(indication.toLowerCase().includes("cardioversion")) return {id:"1090",name:"Synchronized Cardioversion",page:48};
  if(indication.toLowerCase().includes("pacing")) return {id:"1100",name:"Transcutaneous Pacing",page:49};
  if(drug==="fentanyl") return {id:"1160",name:"Pain Management",page:56};
  return {id:"3040",name:"Tachyarrhythmia with Poor Perfusion",page:70};
}

function LookupList({title,items,query,setQuery,openProtocol}:{title:string;items:ProtocolTarget[];query:string;setQuery:(x:string)=>void;openProtocol:(x:ProtocolTarget)=>void}) {
  const shown=useMemo(()=>items.filter(x=>(x.id+x.name).toLowerCase().includes(query.toLowerCase())),[items,query]);
  return <div className="drawer-lookup"><label>{title}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></label><div>{shown.map(x=><button key={x.id} onClick={()=>openProtocol(x)}><small>DMP {x.id}</small><b>{x.name}</b><span>Page {x.page} ›</span></button>)}</div></div>;
}
function vitalThresholds(age:number){const sbp=age<1?"<70 mmHg":age<=10?`<${fmt(70+2*age)} mmHg`:"<90 mmHg";const hr=age<1?">160 bpm":age<2?">150 bpm":age<5?">140 bpm":age<=12?">120 bpm":">100 bpm";return{sbp,hr}}
function fmt(n:number){return Number(n.toFixed(1)).toString()}
