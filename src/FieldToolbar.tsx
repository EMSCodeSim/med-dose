import { useMemo, useState } from "react";
import ProtocolViewer, { type ProtocolTarget } from "./ProtocolViewer";

type SupportedDrug = "adenosine" | "fentanyl" | "midazolam" | "magnesium" | "epinephrine" | "albuterol" | "diphenhydramine" | "methylprednisolone";
type Tool = "meds" | "vitals" | "treatment" | "protocols" | null;
type Props = {
  ageYears: number | null;
  ageLabel: string;
  weightKg: number | null;
  currentDrugId?: SupportedDrug;
  currentDrug?: string;
  currentIndication?: string;
  currentRoute?: string;
  fentanylOlderFrail?: boolean;
  midazolamHalfConsideration?: boolean;
  currentDose?: string;
  currentVolume?: string;
  onSelectMedication: (drug: SupportedDrug) => void;
  onSelectSuggestedMedication: (drug: SupportedDrug) => void;
  reportReady: boolean;
  onOpenReport: () => void;
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
      <button disabled={!p.reportReady} title={!p.reportReady?"Complete the medication calculation first":undefined} aria-label={p.reportReady?"Open medication report":"Report unavailable — complete the medication calculation first"} onClick={p.onOpenReport}><span>▤</span><b>Report</b></button>
      <button disabled={!treatmentReady} title={!treatmentReady?treatmentHint:undefined} aria-label={treatmentReady?"Treatment":"Treatment unavailable — "+treatmentHint} onClick={()=>setTool("treatment")}><span>✚</span><b>Treatment</b></button>
      <button onClick={()=>setTool("protocols")}><span>§</span><b>Protocols</b></button>
    </nav>
    {tool&&<div className="quick-drawer-backdrop" onClick={close}><section className="quick-drawer" role="dialog" aria-modal="true" aria-label={`${tool} quick reference`} onClick={e=>e.stopPropagation()}>
      <div className="drawer-handle"/><header><span><small>QUICK REFERENCE</small><h2>{tool==="meds"?"Denver Metro medications":tool==="vitals"?(p.ageYears!==null?"Current patient":"Vital-sign thresholds"):tool==="treatment"?"Treatment calculations":"Protocol lookup"}</h2></span><button onClick={close} aria-label="Close">×</button></header>
      <div className="drawer-patient">{context}</div>
      {tool==="meds"&&<MedicationPanel {...p} onSelectMedication={(drug)=>{p.onSelectMedication(drug);close()}} query={query} setQuery={setQuery} openProtocol={setProtocol}/>} 
      {tool==="vitals"&&<VitalsPanel age={age} ageLabel={p.ageLabel} kg={p.weightKg} drug={p.currentDrugId} indication={p.currentIndication} fentanylOlderFrail={p.fentanylOlderFrail} midazolamHalfConsideration={p.midazolamHalfConsideration} lookupAge={lookupAge} setLookupAge={setLookupAge} hasPatient={p.ageYears!==null}/>} 
      {tool==="treatment"&&p.currentDrugId&&p.currentIndication&&<TreatmentPanel age={age} kg={p.weightKg} drug={p.currentDrugId} indication={p.currentIndication} route={p.currentRoute} dose={p.currentDose} openProtocol={setProtocol} selectSuggested={(drug)=>{p.onSelectSuggestedMedication(drug);close()}}/>}
      {tool==="protocols"&&<LookupList title="Search protocol number or name" items={protocols} query={query} setQuery={setQuery} openProtocol={setProtocol}/>} 
      <a className="drawer-protocol-link" href={DMP_URL} target="_blank" rel="noreferrer">Open current July 2026 DMP PDF ↗</a>
    </section></div>}
    {protocol&&<ProtocolViewer target={protocol} close={()=>setProtocol(null)}/>} 
  </>;
}

function MedicationPanel(p: Props & {query:string;setQuery:(x:string)=>void;openProtocol:(x:ProtocolTarget)=>void}) {
  const supported:[SupportedDrug,string,string][]=[["adenosine","Adenosine","Adult standing order 12+"],["albuterol","Albuterol","Wheezing / bronchospasm"],["diphenhydramine","Diphenhydramine","Allergic reaction adjunct"],["epinephrine","Epinephrine","Arrest, anaphylaxis, shock, wheezing or stridor"],["fentanyl","Fentanyl","Adult and pediatric 1+"],["magnesium","Magnesium Sulfate","Torsades, refractory bronchospasm or eclampsia"],["methylprednisolone","Methylprednisolone","Allergic reaction adjunct"],["midazolam","Midazolam (Versed)","Status epilepticus or procedural sedation"]];
  return <>
    {p.currentDrug&&<div className="current-reference"><small>CURRENT CALCULATION</small><b>{p.currentDrug}</b>{p.currentDose&&<strong>{p.currentDose}{p.currentVolume?` • ${p.currentVolume}`:""}</strong>}</div>}
    <h3>Patient calculator choices</h3><div className="drawer-med-choices">{supported.map(([id,name,note])=><button key={id} onClick={()=>p.onSelectMedication(id)}><b>{name}</b><span>{note}</span><i>›</i></button>)}</div>
    <LookupList title="All DMP medication references" items={medications} query={p.query} setQuery={p.setQuery} openProtocol={p.openProtocol}/>
  </>;
}

function VitalsPanel({age,ageLabel,kg,drug,indication,fentanylOlderFrail,midazolamHalfConsideration,lookupAge,setLookupAge,hasPatient}:{age:number|null;ageLabel:string;kg:number|null;drug?:SupportedDrug;indication?:string;fentanylOlderFrail?:boolean;midazolamHalfConsideration?:boolean;lookupAge:string;setLookupAge:(x:string)=>void;hasPatient:boolean}) {
  const thresholds=age===null?null:vitalThresholds(age);
  const pediatric=age!==null&&age<12;
  return <>{hasPatient&&age!==null?<div className="patient-summary"><small>CURRENT PATIENT</small><b>{ageLabel}</b><strong>{pediatric?"Pediatric":"Adult"}</strong>{kg!==null&&<span>{fmt(kg)} kg calculation weight</span>}</div>:<div className="lookup-age"><label>Enter age for quick lookup<input inputMode="decimal" value={lookupAge} onChange={e=>setLookupAge(e.target.value)} placeholder="Age in years"/></label></div>}
    {thresholds?<><h3>Age-related vital considerations</h3><div className="threshold-grid"><span><small>HYPOTENSION SCREEN</small><b>SBP {thresholds.sbp}</b></span><span><small>TACHYCARDIA SCREEN</small><b>HR {thresholds.hr}</b></span></div><div className="reference-warning"><b>Abnormal screening thresholds—not normal ranges.</b><span>Interpret with perfusion, mental status, work of breathing and the applicable protocol.</span></div>{hasPatient&&age!==null&&<PatientConsiderations age={age} kg={kg} drug={drug} indication={indication} fentanylOlderFrail={fentanylOlderFrail} midazolamHalfConsideration={midazolamHalfConsideration}/>}</>:<div className="drawer-empty">Enter an age to show patient-specific information.</div>}
  </>;
}

function PatientConsiderations({age,kg,drug,indication,fentanylOlderFrail,midazolamHalfConsideration}:{age:number;kg:number|null;drug?:SupportedDrug;indication?:string;fentanylOlderFrail?:boolean;midazolamHalfConsideration?:boolean}) {
  const notes:string[]=[];
  if(age<12) notes.push("Use pediatric protocol pathways and a measured weight whenever available.");
  if(age<12&&kg===null&&(drug==="fentanyl"||drug==="midazolam"||(drug==="magnesium"&&indication!=="Eclampsia"))) notes.push("This medication pathway requires a calculation weight before a dose can be determined.");
  if(drug==="adenosine"&&age<12) notes.push("Pediatric Adenosine requires direct verbal Base contact under DMP 9010.");
  if(drug==="fentanyl"&&age<1) notes.push("DMP 9230 does not provide a standing-order Fentanyl dose below 1 year; contact Base.");
  if(drug==="fentanyl"&&fentanylOlderFrail) notes.push("Elderly/frail Fentanyl pathway selected: the initial calculated dose is reduced to ½; cumulative limits are unchanged.");
  if(drug==="midazolam"&&age>65) notes.push("Use the medication-specific Midazolam over-65 pathway; do not apply an age reduction universally to other medications.");
  if(drug==="midazolam"&&midazolamHalfConsideration) notes.push("DMP 9070 ½-dose consideration is applied for this Midazolam calculation.");
  if(indication) notes.push(`Current indication: ${indication}.`);
  return <div className="patient-considerations"><small>SPECIAL CONSIDERATIONS</small>{notes.length?notes.map(x=><p key={x}>{x}</p>):<p>No additional age-specific warning is active for the current selection.</p>}</div>;
}

function TreatmentPanel({age,kg,drug,indication,route,dose,openProtocol,selectSuggested}:{age:number|null;kg:number|null;drug:SupportedDrug;indication:string;route?:string;dose?:string;openProtocol:(x:ProtocolTarget)=>void;selectSuggested:(drug:SupportedDrug)=>void}) {
  const pediatric=age!==null&&age<12;
  const treatment=treatmentProtocol(drug,indication);
  const cardioversion=indication.toLowerCase().includes("cardioversion");
  const checklist=treatmentChecklist(drug,indication,route,dose,age);
  return <div className="treatment-list">
    <button className="smart-protocol" onClick={()=>openProtocol(treatment)}><small>CURRENT TREATMENT PROTOCOL</small><b>DMP {treatment.id} • {treatment.name}</b><span>{indication}</span><strong>Open page {treatment.page} ›</strong></button>
    <div className="smart-checklist" aria-label="Smart treatment checklist">
      {checklist.map((item,index)=><section key={item.label}><i>{index+1}</i><small>{item.label}</small><b>{item.value}</b>{item.note&&<span>{item.note}</span>}</section>)}
    </div>
    {drug==="epinephrine"&&/allergic|anaphylaxis/.test(indication.toLowerCase())&&<div className="adjunct-medications"><small>DMP 4090 • ADDITIONAL MEDICATION OPTIONS</small><h3>Continue this patient encounter</h3><p>Patient age and weight will carry forward. The next medication and vial concentration must still be confirmed.</p><button onClick={()=>selectSuggested("diphenhydramine")}><b>Diphenhydramine</b><span>If time and patient stability permit</span><i>Start ›</i></button><button onClick={()=>selectSuggested("methylprednisolone")}><b>Methylprednisolone</b><span>If time and patient stability permit; delayed effect—do not delay transport</span><i>Start ›</i></button><button onClick={()=>selectSuggested("albuterol")}><b>Albuterol</b><span>Only when wheezing is present; IM Epinephrine is given first</span><i>Start ›</i></button></div>}
    {cardioversion&&<section><small>SYNCHRONIZED CARDIOVERSION</small>{age===null?<b>Patient age is required</b>:pediatric&&kg?<><b>{fmt(.5*kg)}–{fmt(kg)} J</b><span>0.5–1 J/kg biphasic</span></>:pediatric?<b>Patient weight is required</b>:<><b>200 J</b><span>Adult biphasic</span></>}</section>}
  </div>;
}

type ChecklistItem={label:string;value:string;note?:string};
function treatmentChecklist(drug:SupportedDrug,indication:string,route?:string,dose?:string,age?:number|null):ChecklistItem[] {
  const medication=dose?`${drugName(drug)} • ${dose}${route?` • ${route}`:""}`:`${drugName(drug)} per medication DMP`;
  if(drug==="midazolam"&&indication==="Status epilepticus") return [
    {label:"REQUIRED MONITORING",value:"ABCs, oxygen, pulse and neurologic status",note:"Cardiac monitoring when seizures recur and/or medication is given."},
    {label:"PREREQUISITES",value:"Prolonged or recurrent active seizure",note:"Use seizure precautions; check blood glucose and treat hypoglycemia."},
    {label:"MEDICATION OPTION",value:medication,note:"IN is preferred over IM when IV cannot be safely or rapidly obtained."},
    {label:"REASSESSMENT",value:"Reassess active seizure at 5 minutes",note:"One repeat dose is available under the standing-order pathway if still seizing."},
    {label:"TRANSPORT / BASE",value:"Transport while monitoring ABCs, vital signs and neurologic condition",note:"Contact Base if still seizing after the repeat or before more than 2 benzodiazepine doses."},
  ];
  if(drug==="midazolam"&&indication.toLowerCase().includes("cardioversion")) return [
    {label:"REQUIRED MONITORING",value:"Oxygen, ECG and continuous reassessment",note:"Have suction and advanced-airway equipment ready."},
    {label:"PREREQUISITES",value:"Tachyarrhythmia with poor perfusion",note:"Confirm functioning IV/IO. Benzodiazepine sedation is used when systolic BP is greater than 80 mmHg."},
    {label:"MEDICATION OPTION",value:medication,note:"If hypotensive, DMP 1090 says to consider fentanyl instead of benzodiazepine sedation."},
    {label:"REASSESSMENT",value:"Reassess sedation after 5 minutes",note:"A second protocol dose may be given if additional sedation is needed."},
    {label:"TRANSPORT / BASE",value:"Continue under the tachycardia-with-poor-perfusion pathway",note:"Contact Base before more than 2 sedation doses."},
  ];
  if(drug==="midazolam") return [
    {label:"REQUIRED MONITORING",value:"ECG, perfusion and continuous respiratory reassessment",note:"Have suction and advanced-airway equipment available."},
    {label:"PREREQUISITES",value:"Symptomatic bradyarrhythmia with poor perfusion",note:"TCP is contraindicated in pulseless arrest. Sedate with benzodiazepine only if BP allows (>80 mmHg)."},
    {label:"MEDICATION OPTION",value:medication,note:"If hypotensive, DMP 1100 says to consider fentanyl."},
    {label:"REASSESSMENT",value:"Reassess sedation after 5 minutes",note:"During pacing, verify electrical and mechanical capture."},
    {label:"TRANSPORT / BASE",value:"Treat under the bradyarrhythmia pathway",note:"Contact Base before more than 2 sedation doses; pediatric pacing is rarely indicated and requires Base contact."},
  ];
  if(drug==="epinephrine") return [
    {label:"REQUIRED MONITORING",value:"Continuous ECG, blood pressure, pulse oximetry and perfusion",note:"Watch for tachydysrhythmia, hypertension and myocardial ischemia."},
    {label:"PREREQUISITES",value:indication,note:"Confirm prerequisite treatments and the exact indication-specific formulation."},
    {label:"MEDICATION OPTION",value:medication,note:"Never interchange 1 mg/mL IM stock with 0.1 mg/mL IV/IO stock. Follow the formulation hard stop."},
    {label:"REASSESSMENT",value:indication.includes("Pulseless")?"Rhythm/pulse check per arrest algorithm":indication.includes("infusion")?"Continuously titrate to clinical effect":"Reassess rhythm, BP, perfusion and respiratory status",note:"Follow the indication-specific interval displayed by the calculator."},
    {label:"TRANSPORT / BASE",value:"Continue the indication-specific protocol and transport",note:"Contact Base when required by the linked protocol or for dosing outside DMP 9120."},
  ];
  if(drug==="magnesium") return [
    {label:"REQUIRED MONITORING",value:"Continuous ECG, blood pressure and respiratory monitoring",note:"Watch for bradycardia, hypotension and respiratory depression."},
    {label:"PREREQUISITES",value:indication,note:"Confirm the exact DMP 9190 indication and applicable prerequisite treatments before administration."},
    {label:"MEDICATION OPTION",value:medication,note:"Use the route-specific dilution, administration time and site limits shown in the final cross-check."},
    {label:"REASSESSMENT",value:"Continuously reassess rhythm, perfusion, blood pressure and ventilation",note:"DMP 9190 does not list a routine repeat dose."},
    {label:"TRANSPORT / BASE",value:"Continue the indication-specific protocol and transport",note:"Contact Base for deterioration, diagnostic uncertainty or dosing outside DMP 9190."},
  ];
  if(drug==="fentanyl") return [
    {label:"REQUIRED MONITORING",value:"Continuous pulse oximetry",note:"For medically complex patients or repeated dosing, add cardiac monitoring and capnography as soon as possible; keep naloxone and resuscitation equipment available."},
    {label:"PREREQUISITES",value:"Hemodynamically stable with moderate-to-severe pain",note:"Use comfort measures first; do not give with respiratory depression or shock."},
    {label:"MEDICATION OPTION",value:medication,note:"Titrate to tolerable pain—not necessarily pain-free."},
    {label:"REASSESSMENT",value:route==="IN"?"Reassess after 10 minutes":"Reassess after 5 minutes",note:"Recheck pain, respiratory status and perfusion before recording or repeating a dose."},
    {label:"TRANSPORT / BASE",value:"Transport in position of comfort and reassess",note:"Additional dosing beyond the DMP cumulative limit requires Base. Opioid plus benzodiazepine requires a direct physician verbal order."},
  ];
  if(drug==="diphenhydramine"||drug==="methylprednisolone") return [
    {label:"REQUIRED MONITORING",value:"Airway, breathing, circulation, pulse oximetry and perfusion",note:"Continue close reassessment for progression or recurrence of anaphylaxis."},
    {label:"PREREQUISITES",value:"Allergic reaction / anaphylaxis",note:"These are adjuncts if time and patient stability permit; they do not replace IM Epinephrine for anaphylaxis."},
    {label:"MEDICATION OPTION",value:medication,note:drug==="methylprednisolone"?"Delayed onset; do not delay transport. Reconstitute and use immediately.":"Administer slow IV/IO when using an IV/IO route."},
    {label:"REASSESSMENT",value:"Continuously reassess airway, respiratory status, skin findings and perfusion"},
    {label:"TRANSPORT / BASE",value:"Transport without delay",note:"Follow DMP 4090 and contact Base for deterioration, uncertainty, or dosing outside the medication monograph."},
  ];
  if(drug==="albuterol") return [
    {label:"REQUIRED MONITORING",value:"Airway, work of breathing, pulse oximetry, heart rate and lung sounds"},
    {label:"PREREQUISITES",value:indication.includes("allergic")?"Wheezing with allergic reaction; IM Epinephrine first":"Bronchospasm / wheezing",note:"Do not use Albuterol as a substitute for IM Epinephrine in anaphylaxis."},
    {label:"MEDICATION OPTION",value:medication,note:"Administer by nebulizer over 5–15 minutes."},
    {label:"REASSESSMENT",value:"Reassess work of breathing and lung sounds after each treatment"},
    {label:"TRANSPORT / BASE",value:"Continue the applicable wheezing or allergy protocol and transport"},
  ];
  return [
    {label:"REQUIRED MONITORING",value:"12-lead ECG before administration",note:"Repeat the 12-lead after conversion and monitor during transport."},
    {label:"PREREQUISITES",value:"Regular narrow-complex suspected AVNRT",note:"Support ABCs, establish IV access and give oxygen. Never administer for an irregular tachycardia or heart-transplant patient."},
    {label:"MEDICATION OPTION",value:medication,note:"Rapid IV bolus followed immediately by normal saline flush."},
    {label:"REASSESSMENT",value:"Immediately reassess rhythm and perfusion",note:"If the rhythm recurs, return to the tachyarrhythmia pathway."},
    {label:"TRANSPORT / BASE",value:"Monitor during transport",note:age!=null&&age<12?"Pediatric Adenosine requires a direct verbal Base order.":"If the rhythm does not convert, contact Base for consultation; contact medical control for dosing beyond the additional 12 mg dose."},
  ];
}
function drugName(drug:SupportedDrug){return drug==="midazolam"?"Midazolam":drug==="magnesium"?"Magnesium Sulfate":drug==="epinephrine"?"Epinephrine":drug==="methylprednisolone"?"Methylprednisolone":drug==="diphenhydramine"?"Diphenhydramine":drug==="albuterol"?"Albuterol":drug[0].toUpperCase()+drug.slice(1)}

function treatmentProtocol(drug:SupportedDrug,indication:string):ProtocolTarget {
  if(drug==="diphenhydramine"||drug==="methylprednisolone") return {id:"4090",name:"Allergy and Anaphylaxis",page:85};
  if(drug==="albuterol") return indication.includes("allergic")?{id:"4090",name:"Allergy and Anaphylaxis",page:85}:{id:"2030/2040",name:"Adult/Pediatric Wheezing",page:61};
  if(drug==="epinephrine") {
    if(indication.includes("Pulseless")) return {id:"3000",name:"Medical Pulseless Arrest",page:66};
    if(indication.includes("Bradycardia")) return {id:"3050",name:"Bradyarrhythmia with Poor Perfusion",page:71};
    if(indication.includes("Hypotension")) return {id:"4000",name:"Medical Shock",page:76};
    if(indication.includes("Stridor")) return {id:"2050",name:"Pediatric Stridor/Croup",page:63};
    if(indication.includes("Wheezing")) return {id:"2030/2040",name:"Adult/Pediatric Wheezing",page:61};
    return {id:"4090",name:"Allergy and Anaphylaxis",page:85};
  }
  if(drug==="magnesium") {
    if(indication==="Eclampsia") return {id:"7010",name:"Obstetrical Complications",page:106};
    if(indication==="Refractory severe bronchospasm") return {id:"2030/2040",name:"Adult/Pediatric Wheezing",page:61};
    if(indication==="Torsades — cardiac arrest") return {id:"3000",name:"Medical Pulseless Arrest",page:66};
    return {id:"3040",name:"Tachyarrhythmia with Poor Perfusion",page:70};
  }
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
function vitalThresholds(age:number){const sbp=age<1?"<70 mmHg":age<=10?`<${fmt(70+2*age)} mmHg`:"<90 mmHg";const hr=age<1?">160 bpm":age<2?">150 bpm":age<5?">140 bpm":age<12?">120 bpm":">100 bpm";return{sbp,hr}}
function fmt(n:number){return Number(n.toFixed(1)).toString()}
