import {useEffect,useMemo,useState} from "react";
import type {GenericTreatmentContext} from "./DmpMedicationCalculator";
import "./versedBuilder.css";

type RecordedAdministration={drug:string;reason:string;route:string;dose:number;unit:string;volume:number;time:number;concentration:string;patient?:string};
type Props={close:()=>void;openProtocol:()=>void;record:(entry:RecordedAdministration)=>void;onContextChange:(context:GenericTreatmentContext|null)=>void};
type Stage="medication"|"concentration"|"indication"|"route"|"patient"|"safety"|"result";
type Patient="adult"|"pediatric"|"";

const indications=[
  "Status epilepticus",
  "Sedation for cardioversion",
  "Sedation for transcutaneous pacing",
  "Agitated/combative patient — IMC-RASS +3/+4",
  "Imminent risk of bodily harm — IMC-RASS +4",
];
const safetyItems=[
  "The patient is not hypotensive for the selected treatment pathway.",
  "No respiratory depression is present; airway and ventilation can be continuously monitored.",
  "No opioid is being given with Midazolam unless a direct physician verbal order has been obtained.",
  "Medication, concentration, indication, patient, route, dose and volume have been verbally repeated back.",
];
const fmt=(n:number)=>Number.isFinite(n)?Number(n.toFixed(Math.abs(n)<1?3:2)).toString():"—";
const isAgitation=(x:string)=>x.includes("Agitated/combative");
const isImminent=(x:string)=>x.includes("Imminent risk");
const routeChoices=(x:string)=>isImminent(x)?["IM"]:isAgitation(x)?["IV/IO","IM"]:["IV/IO","IM","IN"];

function doseFor(indication:string,route:string,patient:Patient,weight:number,pediatricAge:number,halfDose:boolean){
  let dose=0;
  if(isImminent(indication)) dose=10;
  else if(isAgitation(indication)) dose=patient==="adult"?5:pediatricAge===11?5:pediatricAge>=8?2.5:0;
  else if(patient==="adult") dose=indication==="Status epilepticus"?(route==="IV/IO"?5:10):(route==="IV/IO"?2:5);
  else {
    const seizure=indication==="Status epilepticus";
    const nonIv=route==="IM"||route==="IN";
    dose=Math.min(weight*(nonIv?.2:.1),seizure?(nonIv?10:5):(nonIv?5:2));
  }
  return halfDose?dose/2:dose;
}

export default function VersedBuilder({close,openProtocol,record,onContextChange}:Props){
  const [stage,setStage]=useState<Stage>("medication");
  const [medConfirmed,setMedConfirmed]=useState(false);
  const [concentration,setConcentration]=useState<number|null>(null);
  const [customAmount,setCustomAmount]=useState("");
  const [customVolume,setCustomVolume]=useState("");
  const [labelConfirmed,setLabelConfirmed]=useState(false);
  const [indication,setIndication]=useState("");
  const [route,setRoute]=useState("");
  const [patient,setPatient]=useState<Patient>("");
  const [halfDose,setHalfDose]=useState<boolean|null>(null);
  const [pediatricAge,setPediatricAge]=useState("");
  const [weight,setWeight]=useState("");
  const [weightUnit,setWeightUnit]=useState<"kg"|"lb">("kg");
  const [safetyConfirmed,setSafetyConfirmed]=useState(false);
  const [recorded,setRecorded]=useState(false);
  const customConcentration=Number(customAmount)>0&&Number(customVolume)>0?Number(customAmount)/Number(customVolume):0;
  const kg=weightUnit==="lb"?Number(weight)/2.20462:Number(weight);
  const pediatricAgeNumber=Number(pediatricAge);
  const needsPediatricAge=patient==="pediatric"&&isAgitation(indication);
  const needsWeight=patient==="pediatric"&&!isAgitation(indication);
  const patientComplete=patient==="adult"?halfDose!==null:patient==="pediatric"?(needsPediatricAge?pediatricAgeNumber>=8&&pediatricAgeNumber<12:kg>0):false;
  const dose=useMemo(()=>doseFor(indication,route,patient,kg,pediatricAgeNumber,halfDose===true),[indication,route,patient,kg,pediatricAgeNumber,halfDose]);
  const volume=concentration&&dose?dose/concentration:0;
  const administration=route==="IV/IO"?"Administer slowly with continuous respiratory and hemodynamic monitoring.":route==="IN"?"Divide the dose equally between nostrils when feasible.":"Administer IM and begin continuous post-sedation monitoring.";
  const repeat=isImminent(indication)||isAgitation(indication)?"No routine Midazolam repeat; reassess at 5 minutes and follow the agitation pathway.":"May repeat once after 5 minutes when still indicated; contact Base before more than 2 benzodiazepine doses.";
  const patientLabel=patient==="adult"?(halfDose?"Adult • ½-dose consideration":"Adult • standard dose"):needsPediatricAge?`Pediatric • ${pediatricAge} years`:`Pediatric • ${fmt(kg)} kg`;

  useEffect(()=>{
    if(indication) onContextChange({medication:"Midazolam (Versed)",indication,route:route||"Route not selected",dose:dose>0?`${fmt(dose)} mg`:"Pending patient information",volume:volume>0?`${fmt(volume)} mL`:"Pending calculated dose",administration:route?administration:"Select an approved route to show administration guidance.",repeat,monitoring:["Continuous ECG, SpO₂ and ventilation monitoring; waveform capnography when available.","Reassess airway, respiratory rate, blood pressure, perfusion and sedation score."],protocolId:"9070",protocolName:"Midazolam",protocolPage:136});
    else onContextChange(null);
    return()=>onContextChange(null);
  },[stage,dose,concentration,indication,route,volume,administration,repeat,onContextChange]);

  const chooseIndication=(value:string)=>{
    setIndication(value);setSafetyConfirmed(false);setRecorded(false);
    const available=routeChoices(value);setRoute(available.length===1?available[0]:"");
    if(isImminent(value)){setPatient("adult");setHalfDose(false);setStage("patient");}
    else {setPatient("");setHalfDose(null);setPediatricAge("");setWeight("");setStage("route");}
  };
  const editBox=(next:Stage)=>{setStage(next);setRecorded(false)};
  const board=[
    medConfirmed&&{stage:"medication" as Stage,label:"MEDICATION",value:"Midazolam (Versed)",detail:"Physical medication confirmed"},
    concentration&&{stage:"concentration" as Stage,label:"CONCENTRATION",value:`${fmt(concentration)} mg/mL`,detail:"Physical label confirmed"},
    indication&&{stage:"indication" as Stage,label:"INDICATION",value:indication,detail:"DMP pathway selected"},
    route&&{stage:"route" as Stage,label:"ROUTE",value:route,detail:routeChoices(indication).length===1?"Auto-filled":"Selected"},
    patientComplete&&{stage:"patient" as Stage,label:"PATIENT",value:patientLabel,detail:needsWeight?"Weight changes dose":"Only dose-changing information shown"},
    safetyConfirmed&&{stage:"safety" as Stage,label:"SAFETY",value:"All checks confirmed",detail:"One confirmation"},
    stage==="result"&&{stage:"result" as Stage,label:"FINAL DOSE",value:`Give ${fmt(dose)} mg`,detail:`Draw ${fmt(volume)} mL • ${route}`},
  ].filter(Boolean) as {stage:Stage;label:string;value:string;detail:string}[];

  return <main className="versed-builder">
    <div className="versed-builder-top"><button onClick={close}>‹ Medication list</button><span>VERSED FORMAT PILOT</span><button onClick={close}>Start over</button></div>
    <div className="versed-layout">
      <aside className="calculation-board" aria-label="Calculation board"><header><small>LIVE CALCULATION BOARD</small><h2>Your cross-check builds here</h2><p>Tap any completed box to change it.</p></header><div className="board-boxes">{board.map(item=><button key={item.stage} className={stage===item.stage?"active":""} onClick={()=>editBox(item.stage)}><small>{item.label}</small><b>{item.value}</b><span>{item.detail}</span><i>Change</i></button>)}{board.length===0&&<div className="empty-board"><b>No boxes yet</b><span>Confirm Versed to place the first box.</span></div>}</div></aside>
      <section className="builder-workspace">
        {stage==="medication"&&<><small className="eyebrow">1 • MEDICATION</small><h1>Confirm Versed</h1><p className="screen-help">Compare the physical medication with this selection.</p><div className="versed-med-display"><div className="versed-vial"><span>VERSED</span><b>midazolam</b><small>REFERENCE VIAL</small></div><div><small>SELECTED MEDICATION</small><h2>Midazolam (Versed)</h2><p>Use the physical vial label for the concentration check next.</p></div></div><label className={medConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" checked={medConfirmed} onChange={e=>setMedConfirmed(e.target.checked)}/><span><b>Medication matches</b>The vial in hand is Midazolam (Versed).</span></label><button className="continue" disabled={!medConfirmed} onClick={()=>setStage("concentration")}>Place medication box and continue <span>→</span></button></>}
        {stage==="concentration"&&<><small className="eyebrow">2 • CONCENTRATION</small><h1>Confirm the vial concentration</h1><p className="screen-help">Choose a common concentration or enter exactly what the physical label says.</p><div className="builder-options concentration-options"><button className={concentration===1?"selected":""} onClick={()=>{setConcentration(1);setLabelConfirmed(false);setRecorded(false)}}><b>1 mg/mL</b><span>Common concentration</span></button><button className={concentration===5?"selected":""} onClick={()=>{setConcentration(5);setLabelConfirmed(false);setRecorded(false)}}><b>5 mg/mL</b><span>Common concentration</span></button><button className={concentration===0?"selected":""} onClick={()=>{setConcentration(0);setLabelConfirmed(false);setRecorded(false)}}><b>Custom label</b><span>Enter total drug and volume</span></button></div>{concentration===0&&<div className="builder-custom"><label>Total drug<input inputMode="decimal" value={customAmount} onChange={e=>{setCustomAmount(e.target.value);setLabelConfirmed(false)}}/><b>mg</b></label><label>Total volume<input inputMode="decimal" value={customVolume} onChange={e=>{setCustomVolume(e.target.value);setLabelConfirmed(false)}}/><b>mL</b></label>{customConcentration>0&&<strong>{fmt(customConcentration)} mg/mL</strong>}</div>}<label className={labelConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" disabled={concentration===null||(concentration===0&&!customConcentration)} checked={labelConfirmed} onChange={e=>setLabelConfirmed(e.target.checked)}/><span><b>Concentration matches the physical label</b>{concentration===0&&customConcentration?`${customAmount} mg in ${customVolume} mL`:concentration?`${fmt(concentration)} mg/mL`:"Select a concentration"}</span></label><button className="continue" disabled={!labelConfirmed} onClick={()=>{if(concentration===0)setConcentration(customConcentration);setStage(safetyConfirmed?"result":"indication")}}>{safetyConfirmed?"Update calculation":"Place concentration box and continue"} <span>→</span></button></>}
        {stage==="indication"&&<><small className="eyebrow">3 • INDICATION</small><h1>Why is Versed being given?</h1><p className="screen-help">The selected pathway determines the available routes and dose.</p><div className="builder-options indication-options">{indications.map(x=><button key={x} className={indication===x?"selected":""} onClick={()=>chooseIndication(x)}><b>{x}</b><span>Choose pathway ›</span></button>)}</div></>}
        {stage==="route"&&<><small className="eyebrow">4 • ROUTE</small><h1>Confirm the approved route</h1><p className="screen-help">Only routes available for the selected indication are displayed.</p><div className="builder-options route-options">{routeChoices(indication).map(x=><button key={x} className={route===x?"selected":""} onClick={()=>{setRoute(x);setSafetyConfirmed(false);setRecorded(false)}}><b>{x}</b></button>)}</div><button className="continue" disabled={!route} onClick={()=>setStage(patientComplete?"safety":"patient")}>Place route box and continue <span>→</span></button></>}
        {stage==="patient"&&<><small className="eyebrow">5 • PATIENT</small><h1>Enter only what changes this dose</h1><p className="screen-help">Adult age is not required when all adult doses are the same. Pediatric weight or an age band appears only when it changes this pathway.</p>{!isImminent(indication)&&<div className="builder-options patient-options"><button className={patient==="adult"?"selected":""} onClick={()=>{setPatient("adult");setHalfDose(null);setSafetyConfirmed(false);setRecorded(false)}}><b>Adult</b><span>No age entry required</span></button><button className={patient==="pediatric"?"selected":""} onClick={()=>{setPatient("pediatric");setHalfDose(null);setSafetyConfirmed(false);setRecorded(false)}}><b>Pediatric</b><span>{isAgitation(indication)?"Age band changes dose":"Weight changes dose"}</span></button></div>}{patient==="adult"&&<div className="dose-change-question"><b>Does the ½-dose consideration apply?</b><span>Choose yes for a patient over 65 or a small adult under 50 kg.</span><div><button className={halfDose===false?"selected":""} onClick={()=>{setHalfDose(false);setSafetyConfirmed(false);setRecorded(false)}}>No — standard dose</button><button className={halfDose===true?"selected":""} onClick={()=>{setHalfDose(true);setSafetyConfirmed(false);setRecorded(false)}}>Yes — ½ dose</button></div></div>}{needsPediatricAge&&<label className="builder-number"><span>Patient age (8–11 years)</span><input inputMode="numeric" value={pediatricAge} onChange={e=>{setPediatricAge(e.target.value);setSafetyConfirmed(false);setRecorded(false)}} placeholder="Age"/></label>}{needsPediatricAge&&pediatricAge!==""&&!patientComplete&&<div className="hard-stop" role="alert"><b>THIS STANDING-ORDER PATHWAY DOES NOT APPLY</b><span>Pediatric agitation patients under 8 require Base contact; this fixed-dose age band applies only from 8 through 11 years.</span></div>}{needsWeight&&<><div className="unit-toggle"><button className={weightUnit==="kg"?"selected":""} onClick={()=>{setWeightUnit("kg");setWeight("");setSafetyConfirmed(false)}}>Kilograms</button><button className={weightUnit==="lb"?"selected":""} onClick={()=>{setWeightUnit("lb");setWeight("");setSafetyConfirmed(false)}}>Pounds</button></div><label className="builder-number"><span>Patient weight ({weightUnit})</span><input inputMode="decimal" value={weight} onChange={e=>{setWeight(e.target.value);setSafetyConfirmed(false);setRecorded(false)}} placeholder="0"/></label>{kg>0&&<div className="live-math"><small>LIVE DOSE</small><b>{fmt(dose)} mg</b><span>{fmt(dose)} mg ÷ {fmt(concentration||0)} mg/mL = {fmt(volume)} mL</span></div>}</>}<button className="continue" disabled={!patientComplete} onClick={()=>setStage("safety")}>Place patient box and continue <span>→</span></button></>}
        {stage==="safety"&&<><small className="eyebrow">6 • SAFETY</small><h1>Review all safety checks</h1><p className="screen-help">Everything remains visible. One confirmation is required after reviewing the complete list.</p><div className="live-math"><small>CALCULATED DOSE</small><b>{fmt(dose)} mg • draw {fmt(volume)} mL</b><span>{route} • {fmt(concentration||0)} mg/mL</span></div><div className="builder-safety-list">{safetyItems.map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</div><label className={safetyConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" checked={safetyConfirmed} onChange={e=>setSafetyConfirmed(e.target.checked)}/><span><b>Confirm all safety checks</b>I reviewed every item above; no listed contraindication is present and all required conditions are met.</span></label><button className="continue" disabled={!safetyConfirmed} onClick={()=>setStage("result")}>Place safety box and show final dose <span>→</span></button></>}
        {stage==="result"&&<><small className="eyebrow">FINAL DOSE</small><h1>Dose ready</h1><div className="builder-final"><div><small>MEDICATION</small><b>Midazolam (Versed)</b></div><div><small>ROUTE</small><b>{route}</b></div><div><small>GIVE DOSE</small><strong>{fmt(dose)} mg</strong></div><div><small>DRAW VOLUME</small><strong>{fmt(volume)} mL</strong></div></div><details className="result-collapsible"><summary>Protocol, monitoring and calculation</summary><div className="builder-details"><p><span>Calculation</span><b>{fmt(dose)} mg ÷ {fmt(concentration||0)} mg/mL = {fmt(volume)} mL</b></p><p><span>Administration</span><b>{administration}</b></p><p><span>Repeat</span><b>{repeat}</b></p><p><span>Monitoring</span><b>Continuous ECG, SpO₂ and ventilation; waveform capnography when available.</b></p><button onClick={openProtocol}>Open DMP 9070 • Midazolam ↗</button></div></details><button className="initial-record-dose" disabled={recorded} onClick={()=>{record({drug:"Midazolam (Versed)",reason:indication,route,dose,unit:"mg",volume,time:Date.now(),concentration:`${fmt(concentration||0)} mg/mL`,patient:patientLabel});setRecorded(true)}}><span><small>{recorded?"ADMINISTRATION RECORDED":"RECORD ADMINISTRATION"}</small><b>{route}</b></span><strong>{fmt(dose)} mg • {fmt(volume)} mL</strong><em>{recorded?"Saved to encounter report":"Tap to record"}</em></button><button className="new-calc" onClick={close}>Return to medication list</button></>}
      </section>
    </div>
  </main>;
}
