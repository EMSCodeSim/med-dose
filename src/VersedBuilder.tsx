import {useEffect,useMemo,useState} from "react";
import type {GenericTreatmentContext} from "./DmpMedicationCalculator";
import CalculationBoard, {type CalculationBox} from "./CalculationBoard";
import "./versedBuilder.css";
import "./versedForm.css";
import "./versedConsole.css";

type RecordedAdministration={drug:string;reason:string;route:string;dose:number;unit:string;volume:number;time:number;concentration:string;patient?:string};
type MedicationOption={id:string;name:string;brand:string;released:boolean};
type Props={close:()=>void;openProtocol:()=>void;record:(entry:RecordedAdministration)=>void;onContextChange:(context:GenericTreatmentContext|null)=>void;medicationOptions:MedicationOption[];selectMedication:(id:string)=>void};
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

export default function VersedBuilder({close,openProtocol,record,onContextChange,medicationOptions,selectMedication}:Props){
  const [stage,setStage]=useState<Stage>("result");
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
  const [recordedAt,setRecordedAt]=useState<number|null>(null);
  const [now,setNow]=useState(Date.now());
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
  const timerSeconds=recordedAt?Math.max(0,Math.ceil((recordedAt+5*60_000-now)/1000)):300;
  const timerText=`${String(Math.floor(timerSeconds/60)).padStart(2,"0")}:${String(timerSeconds%60).padStart(2,"0")}`;
  const calculationReady=medConfirmed&&!!concentration&&labelConfirmed&&!!indication&&!!route&&patientComplete&&safetyConfirmed;
  const hasStarted=medConfirmed||!!concentration||!!indication||!!route||!!patient;

  useEffect(()=>{
    if(indication) onContextChange({medication:"Midazolam (Versed)",indication,route:route||"Route not selected",dose:dose>0?`${fmt(dose)} mg`:"Pending patient information",volume:volume>0?`${fmt(volume)} mL`:"Pending calculated dose",administration:route?administration:"Select an approved route to show administration guidance.",repeat,monitoring:["Continuous ECG, SpO₂ and ventilation monitoring; waveform capnography when available.","Reassess airway, respiratory rate, blood pressure, perfusion and sedation score."],protocolId:"9070",protocolName:"Midazolam",protocolPage:136});
    else onContextChange(null);
    return()=>onContextChange(null);
  },[stage,dose,concentration,indication,route,volume,administration,repeat,onContextChange]);
  useEffect(()=>{if(!recordedAt||timerSeconds===0)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[recordedAt,timerSeconds]);

  const chooseIndication=(value:string)=>{
    setIndication(value);setSafetyConfirmed(false);setRecorded(false);
    const available=routeChoices(value);setRoute(current=>available.includes(current)?current:available.length===1?available[0]:"");
    if(isImminent(value)){setPatient("adult");setHalfDose(false);}
    setStage("result");
  };
  const editBox=(next:Stage)=>{if(!recorded)setStage(next)};
  const submitConcentration=()=>{
    const confirmedConcentration=concentration===0?customConcentration:concentration;
    if(!labelConfirmed||!confirmedConcentration)return;
    setConcentration(confirmedConcentration);
    setStage("result");
  };
  const board:CalculationBox[]=[
    {id:"medication",label:"MEDICATION",value:"Midazolam (Versed)",detail:medConfirmed?"Physical medication confirmed":"Confirm physical medication",complete:medConfirmed,active:stage==="medication",available:!recorded,onClick:()=>editBox("medication")},
    {id:"concentration",label:"CONCENTRATION",value:`${fmt(concentration||0)} mg/mL`,detail:labelConfirmed?"Physical label confirmed":"Confirm physical label",complete:!!concentration&&labelConfirmed,active:stage==="concentration",available:!recorded,onClick:()=>editBox("concentration")},
    {id:"indication",label:"INDICATION",value:indication,detail:indication?"DMP pathway selected":"Select reason for use",complete:!!indication,active:stage==="indication",available:!recorded,onClick:()=>editBox("indication")},
    {id:"route",label:"ROUTE",value:route,detail:route&&indication&&routeChoices(indication).length===1?"Auto-filled":"Select approved route",complete:!!route,active:stage==="route",available:!recorded,onClick:()=>editBox("route")},
    {id:"patient",label:"PATIENT",value:patientLabel,detail:patientComplete?(needsWeight?"Weight changes dose":"Only dose-changing information shown"):"Enter dose-changing information",complete:patientComplete,active:stage==="patient",available:!recorded,onClick:()=>editBox("patient")},
    {id:"safety",label:"SAFETY",value:"All checks confirmed",detail:safetyConfirmed?"One confirmation":"Review complete safety list",complete:safetyConfirmed,active:stage==="safety",available:!recorded,onClick:()=>editBox("safety")},
  ];

  return <main className="versed-builder">
    <div className="versed-builder-top"><button onClick={close}>‹ Medication list</button><span>VERSED FORMAT PILOT</span><button onClick={close}>Start over</button></div>
    <div className="versed-layout">
      <CalculationBoard boxes={board} className="versed-status-board"/>
      {stage==="result"&&!hasStarted&&<section className="versed-empty-workspace"><b>Select any box</b><span>Build the calculation in the order that is fastest for you.</span></section>}
      {((stage==="result"&&hasStarted)||stage==="safety")&&<section className="versed-dashboard" aria-label="Live Versed dose and treatment information">
        <header><small>LIVE CALCULATION</small><h1>Midazolam (Versed)</h1><b>{route||"Route pending"}</b></header>
        <div className={calculationReady?"dashboard-dose ready":"dashboard-dose pending"}><div><small>GIVE DOSE</small><strong>{calculationReady&&dose>0?`${fmt(dose)} mg`:"—"}</strong></div><div><small>DRAW VOLUME</small><strong>{calculationReady&&volume>0?`${fmt(volume)} mL`:"—"}</strong></div></div>
        {!calculationReady&&<button className="dashboard-required" onClick={()=>setStage(board.find(item=>!item.complete)?.id as Stage||"medication")}><b>Choose any red box</b><span>Complete checks in the order that is fastest for you.</span><i>Open next check ›</i></button>}
        <section className={recordedAt?"dashboard-timer running":"dashboard-timer"}><small>REASSESSMENT TIMER</small><strong>{timerText}</strong><span>{recordedAt?(timerSeconds?"Counting down from recorded administration":"Reassessment due now"):"Starts when administration is recorded"}</span></section>
        <div className="dashboard-details">
          <details open><summary>Administration <i>⌄</i></summary><p>{route?administration:"Select the indication and route to display administration guidance."}</p></details>
          <details><summary>Repeat dose <i>⌄</i></summary><p>{indication?repeat:"Select an indication to display the repeat-dose rule."}</p></details>
          <details><summary>Monitoring <i>⌄</i></summary><p>Continuous ECG, SpO₂ and ventilation monitoring; waveform capnography when available. Reassess airway, respiratory rate, blood pressure, perfusion and sedation score.</p></details>
          <details><summary>Calculation <i>⌄</i></summary><p>{dose>0&&concentration?`${fmt(dose)} mg ÷ ${fmt(concentration)} mg/mL = ${fmt(volume)} mL`:"Complete the required boxes to show the dose and volume equation."}</p></details>
          <details><summary>Documentation <i>⌄</i></summary><p>Record medication, dose, route, concentration, time, response, adverse effects and pre/post vital signs.</p></details>
        </div>
        <button className="dashboard-protocol" onClick={openProtocol}>Open DMP 9070 • Midazolam ↗</button>
        <button className="initial-record-dose dashboard-record" disabled={!calculationReady||recorded||!(dose>0)||!(volume>0)} onClick={()=>{const time=Date.now();record({drug:"Midazolam (Versed)",reason:indication,route,dose,unit:"mg",volume,time,concentration:`${fmt(concentration||0)} mg/mL`,patient:patientLabel});setRecorded(true);setRecordedAt(time);setNow(time)}}><span><small>{recorded?"ADMINISTRATION RECORDED":"RECORD ADMINISTRATION"}</small><b>{route||"Route pending"}</b></span><strong>{calculationReady&&dose>0&&volume>0?`${fmt(dose)} mg • ${fmt(volume)} mL`:"Complete required checks"}</strong><em>{recorded?"Timer started • saved to encounter report":calculationReady?"Tap to record and start timer":"Complete the red boxes in any order"}</em></button>
      </section>}
      {stage!=="result"&&stage!=="safety"&&<section className="builder-workspace versed-inline-workspace" aria-label={`Edit ${stage}`}><button className="versed-inline-close" onClick={()=>setStage("result")} aria-label="Close selection">×</button>
        {stage==="medication"&&<><small className="eyebrow">MEDICATION</small><h1>Select a DMP medication</h1><p className="screen-help">Tap the medication in your hand. Medications still under review remain visible but locked.</p><div className="versed-medication-list">{medicationOptions.map(option=><button key={option.id} disabled={!option.released} className={option.id==="midazolam"&&medConfirmed?"selected":""} onClick={()=>{if(option.id==="midazolam"){setMedConfirmed(true);setSafetyConfirmed(false);setRecorded(false);setStage("result")}else selectMedication(option.id)}}><b>{option.name}</b><span>{option.brand}</span><i>{option.released?option.id==="midazolam"?"Select":"Open":"Under review"}</i></button>)}</div></>}
        {stage==="concentration"&&<form className="builder-stage-form" onSubmit={e=>{e.preventDefault();submitConcentration()}}><small className="eyebrow">CONCENTRATION</small><h1>Select the vial concentration</h1><p className="screen-help">Common concentrations are one tap. Use custom only when the label is different.</p><div className="builder-options concentration-options"><button type="button" className={concentration===1&&labelConfirmed?"selected":""} onClick={()=>{setConcentration(1);setLabelConfirmed(true);setSafetyConfirmed(false);setRecorded(false);setStage("result")}}><b>1 mg/mL</b><span>Confirm label and select</span></button><button type="button" className={concentration===5&&labelConfirmed?"selected":""} onClick={()=>{setConcentration(5);setLabelConfirmed(true);setSafetyConfirmed(false);setRecorded(false);setStage("result")}}><b>5 mg/mL</b><span>Confirm label and select</span></button><button type="button" className={concentration===0?"selected":""} onClick={()=>{setConcentration(0);setLabelConfirmed(false);setRecorded(false)}}><b>Custom label</b><span>Enter total drug and volume</span></button></div>{concentration===0&&<><div className="builder-custom"><label>Total drug<input inputMode="decimal" value={customAmount} onChange={e=>{setCustomAmount(e.target.value);setLabelConfirmed(false)}}/><b>mg</b></label><label>Total volume<input inputMode="decimal" value={customVolume} onChange={e=>{setCustomVolume(e.target.value);setLabelConfirmed(false)}}/><b>mL</b></label>{customConcentration>0&&<strong>{fmt(customConcentration)} mg/mL</strong>}</div><label className={labelConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" disabled={!customConcentration} checked={labelConfirmed} onChange={e=>setLabelConfirmed(e.target.checked)}/><span><b>Custom concentration matches label</b>{customConcentration?`${customAmount} mg in ${customVolume} mL`:"Enter both label values"}</span></label><button type="submit" className="continue" disabled={!labelConfirmed||!customConcentration}>Use custom concentration <span>→</span></button></>}</form>}
        {stage==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is Versed being given?</h1><p className="screen-help">One tap selects the pathway and updates available routes.</p><div className="builder-options indication-options">{indications.map(x=><button key={x} className={indication===x?"selected":""} onClick={()=>chooseIndication(x)}><b>{x}</b><span>Select</span></button>)}</div></>}
        {stage==="route"&&<><small className="eyebrow">ROUTE</small><h1>Select route</h1><p className="screen-help">{indication?"Only routes approved for the selected indication are shown.":"Choose now; the indication selection will verify that the route is approved."}</p><div className="builder-options route-options">{routeChoices(indication).map(x=><button key={x} className={route===x?"selected":""} onClick={()=>{setRoute(x);setSafetyConfirmed(false);setRecorded(false);setStage("result")}}><b>{x}</b><span>Select</span></button>)}</div></>}
        {stage==="patient"&&<><small className="eyebrow">PATIENT</small><h1>Enter only dose-changing information</h1><p className="screen-help">No adult age entry. Choose the adult dose group with one tap; pediatric entry appears only when required.</p>{!isImminent(indication)&&<div className="builder-options patient-options"><button className={patient==="adult"&&halfDose===false?"selected":""} onClick={()=>{setPatient("adult");setHalfDose(false);setSafetyConfirmed(false);setRecorded(false);setStage("result")}}><b>Adult • standard dose</b><span>Age does not change dose</span></button><button className={patient==="adult"&&halfDose===true?"selected":""} onClick={()=>{setPatient("adult");setHalfDose(true);setSafetyConfirmed(false);setRecorded(false);setStage("result")}}><b>Adult • ½ dose</b><span>Over 65 or small adult under 50 kg</span></button><button className={patient==="pediatric"?"selected":""} onClick={()=>{setPatient("pediatric");setHalfDose(null);setSafetyConfirmed(false);setRecorded(false)}}><b>Pediatric</b><span>{indication?isAgitation(indication)?"Age band changes dose":"Weight changes dose":"Select indication to determine required entry"}</span></button></div>}{patient==="pediatric"&&!indication&&<button className="continue" onClick={()=>setStage("indication")}>Select indication to determine pediatric information <span>→</span></button>}{needsPediatricAge&&<><div className="builder-options patient-age-quick">{[8,9,10,11].map(age=><button key={age} className={pediatricAge===String(age)?"selected":""} onClick={()=>{setPediatricAge(String(age));setSafetyConfirmed(false);setRecorded(false);setStage("result")}}><b>{age} years</b></button>)}</div></>}{needsWeight&&<><div className="unit-toggle"><button className={weightUnit==="kg"?"selected":""} onClick={()=>{setWeightUnit("kg");setWeight("");setSafetyConfirmed(false)}}>kg</button><button className={weightUnit==="lb"?"selected":""} onClick={()=>{setWeightUnit("lb");setWeight("");setSafetyConfirmed(false)}}>lb</button></div><label className="builder-number"><span>Patient weight ({weightUnit})</span><input inputMode="decimal" value={weight} onChange={e=>{setWeight(e.target.value);setSafetyConfirmed(false);setRecorded(false)}} placeholder="0"/></label>{kg>0&&<><div className="live-math"><small>LIVE DOSE</small><b>{fmt(dose)} mg</b><span>{concentration?`${fmt(dose)} mg ÷ ${fmt(concentration)} mg/mL = ${fmt(volume)} mL`:"Select concentration to calculate volume"}</span></div><button className="continue" onClick={()=>setStage("result")}>Use this weight <span>→</span></button></>}</>}</>}
      </section>}
    </div>
    {stage==="safety"&&<div className="versed-popup-backdrop" onClick={()=>setStage("result")}><section className="builder-workspace versed-popup" role="dialog" aria-modal="true" aria-label="Safety review" onClick={e=>e.stopPropagation()}><button className="versed-popup-close" onClick={()=>setStage("result")} aria-label="Close popup">×</button><small className="eyebrow">SAFETY</small><h1>Review all safety checks</h1><p className="screen-help">All contraindications and conditions are visible. Only one confirmation is required.</p>{(!medConfirmed||!concentration||!labelConfirmed||!indication||!route||!patientComplete)&&<div className="hard-stop"><b>CALCULATION INFORMATION IS INCOMPLETE</b><span>Review the list now, then complete the remaining red boxes before confirming.</span></div>}<div className="live-math"><small>LIVE CALCULATION</small><b>{dose>0?`${fmt(dose)} mg`:"Dose pending"}{volume>0?` • draw ${fmt(volume)} mL`:""}</b><span>{route||"Route pending"} • {concentration?`${fmt(concentration)} mg/mL`:"Concentration pending"}</span></div><div className="builder-safety-list">{safetyItems.map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</div><label className={safetyConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" disabled={!medConfirmed||!concentration||!labelConfirmed||!indication||!route||!patientComplete} checked={safetyConfirmed} onChange={e=>setSafetyConfirmed(e.target.checked)}/><span><b>Confirm all safety checks</b>I reviewed every item above; no listed contraindication is present and all required conditions are met.</span></label><button className="continue" disabled={!safetyConfirmed} onClick={()=>setStage("result")}>Confirm and show final dose <span>→</span></button></section></div>}
  </main>;
}
