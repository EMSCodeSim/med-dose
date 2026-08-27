import {useEffect,useMemo,useState} from "react";
import type {GenericTreatmentContext} from "./DmpMedicationCalculator";
import CalculationBoard, {type CalculationBox} from "./CalculationBoard";
import WeightQuickSelect from "./WeightQuickSelect";
import DoseSyringe from "./DoseSyringe";
import "./versedBuilder.css";
import "./versedForm.css";
import "./versedConsole.css";

type RecordedAdministration={drug:string;reason:string;route:string;dose:number;unit:string;volume:number;time:number;concentration:string;patient?:string};
type MedicationOption={id:string;name:string;brand:string;released:boolean};
export type EncounterPatient={patient:"adult"|"pediatric";ageYears?:number;weightKg?:number;halfDose?:boolean};
type Props={close:()=>void;openProtocol:()=>void;record:(entry:RecordedAdministration)=>void;onContextChange:(context:GenericTreatmentContext|null)=>void;medicationOptions:MedicationOption[];selectMedication:(id:string,patient?:EncounterPatient)=>void;initialPatient?:EncounterPatient|null};
type Stage="medication"|"concentration"|"indication"|"route"|"patient"|"dose"|"safety"|"result";
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

export default function VersedBuilder({close,openProtocol,record,onContextChange,medicationOptions,selectMedication,initialPatient}:Props){
  const [stage,setStage]=useState<Stage>("result");
  const [medConfirmed,setMedConfirmed]=useState(true);
  const [concentration,setConcentration]=useState<number|null>(null);
  const [customAmount,setCustomAmount]=useState("");
  const [customVolume,setCustomVolume]=useState("");
  const [labelConfirmed,setLabelConfirmed]=useState(false);
  const [indication,setIndication]=useState("");
  const [route,setRoute]=useState("");
  const [patient,setPatient]=useState<Patient>(initialPatient?.patient||"");
  const [halfDose,setHalfDose]=useState<boolean|null>(initialPatient?.patient==="adult"?initialPatient.halfDose===true:null);
  const [pediatricAge,setPediatricAge]=useState("");
  const [weight,setWeight]=useState(initialPatient?.weightKg?String(initialPatient.weightKg):"");
  const [weightUnit,setWeightUnit]=useState<"kg"|"lb">("kg");
  const [weightSource,setWeightSource]=useState(initialPatient?.weightKg?"carried from current patient":"");
  const [safetyConfirmed,setSafetyConfirmed]=useState(false);
  const [recorded,setRecorded]=useState(false);
  const [recordedAt,setRecordedAt]=useState<number|null>(null);
  const [administrationCount,setAdministrationCount]=useState(0);
  const [plannedDose,setPlannedDose]=useState("");
  const [editingDose,setEditingDose]=useState(false);
  const [addingMedication,setAddingMedication]=useState(false);
  const [now,setNow]=useState(Date.now());
  const customConcentration=Number(customAmount)>0&&Number(customVolume)>0?Number(customAmount)/Number(customVolume):0;
  const kg=weightUnit==="lb"?Number(weight)/2.20462:Number(weight);
  const pediatricAgeNumber=Number(pediatricAge);
  const needsPediatricAge=patient==="pediatric"&&isAgitation(indication);
  const needsWeight=patient==="pediatric"&&!isAgitation(indication);
  const patientComplete=patient==="adult"?halfDose!==null:patient==="pediatric"?(needsPediatricAge?pediatricAgeNumber>=8&&pediatricAgeNumber<12:kg>0):false;
  const dose=useMemo(()=>doseFor(indication,route,patient,kg,pediatricAgeNumber,halfDose===true),[indication,route,patient,kg,pediatricAgeNumber,halfDose]);
  const selectedDose=Number(plannedDose);
  const selectedDoseValid=selectedDose>0&&selectedDose<=dose;
  const volume=concentration&&selectedDoseValid?selectedDose/concentration:0;
  const administration=route==="IV/IO"?"Administer slowly with continuous respiratory and hemodynamic monitoring.":route==="IN"?"Divide the dose equally between nostrils when feasible.":"Administer IM and begin continuous post-sedation monitoring.";
  const repeat=isImminent(indication)||isAgitation(indication)?"No routine Midazolam repeat; reassess at 5 minutes and follow the agitation pathway.":"May repeat once after 5 minutes when still indicated; contact Base before more than 2 benzodiazepine doses.";
  const patientLabel=patient==="adult"?(halfDose?"Adult • ½-dose consideration":"Adult • standard dose"):needsPediatricAge?`Pediatric • ${pediatricAge} years`:`Pediatric • ${fmt(kg*2.20462)} lb (${fmt(kg)} kg)${weightSource?` • ${weightSource}`:""}`;
  const timerSeconds=recordedAt?Math.max(0,Math.ceil((recordedAt+5*60_000-now)/1000)):300;
  const timerText=`${String(Math.floor(timerSeconds/60)).padStart(2,"0")}:${String(timerSeconds%60).padStart(2,"0")}`;
  const routineRepeat=!!indication&&!(isImminent(indication)||isAgitation(indication));
  const repeatFinished=administrationCount>=2;
  const calculationReady=medConfirmed&&!!concentration&&labelConfirmed&&!!indication&&!!route&&patientComplete&&safetyConfirmed;
  const hasStarted=medConfirmed||!!concentration||!!indication||!!route||!!patient;

  useEffect(()=>{
    if(indication) onContextChange({medication:"Midazolam (Versed)",indication,route:route||"Route not selected",dose:selectedDoseValid?`${fmt(selectedDose)} mg`:dose>0?`${fmt(dose)} mg`:"Pending patient information",volume:volume>0?`${fmt(volume)} mL`:"Pending calculated dose",administration:route?administration:"Select an approved route to show administration guidance.",repeat,monitoring:["Continuous ECG, SpO₂ and ventilation monitoring; waveform capnography when available.","Reassess airway, respiratory rate, blood pressure, perfusion and sedation score."],protocolId:"9070",protocolName:"Midazolam",protocolPage:136});
    else onContextChange(null);
    return()=>onContextChange(null);
  },[stage,dose,selectedDose,selectedDoseValid,concentration,indication,route,volume,administration,repeat,onContextChange]);
  useEffect(()=>{if(!recordedAt||timerSeconds===0)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[recordedAt,timerSeconds]);
  useEffect(()=>{if(!recorded)setPlannedDose(dose>0?fmt(dose):"")},[dose,recorded]);

  const chooseIndication=(value:string)=>{
    setIndication(value);setSafetyConfirmed(false);setRecorded(false);
    const available=routeChoices(value);setRoute(current=>available.includes(current)?current:available.length===1?available[0]:"");
    if(isImminent(value)){setPatient("adult");setHalfDose(false);}
    setStage(available.length===1?"safety":"route");
  };
  const editBox=(next:Stage)=>{if(!recorded)setStage(next)};
  const patientSnapshot:EncounterPatient|undefined=patient?{patient,ageYears:needsPediatricAge?pediatricAgeNumber:undefined,weightKg:needsWeight?kg:undefined,halfDose:patient==="adult"?halfDose===true:undefined}:undefined;
  const giveNow=()=>{
    if(!calculationReady||!selectedDoseValid||!concentration||administrationCount>=2)return;
    const time=Date.now(),givenVolume=selectedDose/concentration;
    record({drug:"Midazolam (Versed)",reason:indication,route,dose:selectedDose,unit:"mg",volume:givenVolume,time,concentration:`${fmt(concentration)} mg/mL`,patient:patientLabel});
    setRecorded(true);setRecordedAt(time);setAdministrationCount(count=>count+1);setNow(time);setEditingDose(false);
  };
  const submitConcentration=()=>{
    const confirmedConcentration=concentration===0?customConcentration:concentration;
    if(!labelConfirmed||!confirmedConcentration)return;
    setConcentration(confirmedConcentration);
    setStage("indication");
  };
  const board:CalculationBox[]=[
    {id:"concentration",label:"CONCENTRATION",value:`${fmt(concentration||0)} mg/mL`,detail:labelConfirmed?"Physical label confirmed":"Confirm physical label",complete:!!concentration&&labelConfirmed,active:stage==="concentration",available:!recorded,onClick:()=>editBox("concentration"),quickChoices:recorded?[]:[1,5].map(value=>({label:`${value} mg/mL`,selected:concentration===value&&labelConfirmed,onClick:()=>{setConcentration(value);setLabelConfirmed(true);setSafetyConfirmed(false);setRecorded(false);setStage("indication")}})).concat([{label:"Custom",selected:concentration===0,onClick:()=>{setConcentration(0);setLabelConfirmed(false);setStage("concentration")}}])},
    {id:"indication",label:"INDICATION",value:indication,detail:indication?"DMP pathway selected":"Select reason for use",complete:!!indication,active:stage==="indication",available:!recorded,onClick:()=>editBox("indication")},
    {id:"route",label:"ROUTE",value:route,detail:route&&indication&&routeChoices(indication).length===1?"Auto-filled":"Select approved route",complete:!!route,active:stage==="route",available:!recorded,onClick:()=>editBox("route"),quickChoices:recorded?[]:routeChoices(indication).map(value=>({label:value,selected:route===value,onClick:()=>{setRoute(value);setSafetyConfirmed(false);setRecorded(false);setStage(isImminent(indication)?"safety":"patient")}}))},
    {id:"patient",label:"PATIENT",value:patientLabel,detail:patientComplete?(needsWeight?"Weight changes dose":"Only dose-changing information shown"):"Enter dose-changing information",complete:patientComplete,active:stage==="patient",available:!recorded,onClick:()=>editBox("patient"),quickChoices:recorded||isImminent(indication)?[]:[{label:"Adult",selected:patient==="adult"&&halfDose===false,onClick:()=>{setPatient("adult");setHalfDose(false);setSafetyConfirmed(false);setStage("safety")}},{label:"Adult ½",selected:patient==="adult"&&halfDose===true,onClick:()=>{setPatient("adult");setHalfDose(true);setSafetyConfirmed(false);setStage("safety")}},{label:"Pediatric",selected:patient==="pediatric",onClick:()=>{setPatient("pediatric");setHalfDose(null);setSafetyConfirmed(false);setStage("patient")}}]},
    {id:"dose",label:"DOSE",value:selectedDoseValid?`${fmt(selectedDose)} mg`:dose>0?`${fmt(dose)} mg`:"",detail:dose>0?(selectedDoseValid&&selectedDose<dose?"Lesser dose selected":"Protocol-calculated dose"):"Complete patient information",complete:dose>0&&selectedDoseValid,active:stage==="dose",available:!recorded&&patientComplete,onClick:()=>editBox("dose")},
    {id:"safety",label:"SAFETY",value:"All checks confirmed",detail:safetyConfirmed?"One confirmation":"Review complete safety list",complete:safetyConfirmed,active:stage==="safety",available:!recorded,onClick:()=>editBox("safety")},
  ];
  const visibleMedicationOptions=medicationOptions.filter(option=>option.released);
  const medicationReference=medConfirmed?<aside className="versed-medication-reference" aria-label="Selected medication reference image"><div className="versed-reference-vial"><small>MIDAZOLAM</small><b>Rx</b><span>INJECTION</span></div><span><small>SELECTED MEDICATION</small><b>Midazolam</b><em>Versed</em></span></aside>:null;

  return <main className="versed-builder">
    <div className="versed-builder-top"><button className="drug-back-button" onClick={close}>‹ Back to medications</button><span>VERSED FORMAT PILOT</span><button onClick={close}>Start over</button></div>
    <div className={`versed-layout${calculationReady?" calculation-complete":""}`}>
      <header className="builder-medication-banner">{medicationReference}</header>
      <aside className="versed-left-column" aria-label="Calculation controls">
        <CalculationBoard boxes={board} className="versed-status-board"/>
        <div id="versed-left-tools" className="versed-left-tools" aria-label="Report treatment and protocol tools"/>
      </aside>
      {stage==="result"&&!hasStarted&&<section className="versed-empty-workspace" aria-label="Selection workspace"/>}
      {((stage==="result"&&hasStarted)||stage==="safety")&&<section className="versed-dashboard" aria-label="Live Versed dose and treatment information">
        {medicationReference}
        <header className="administration-area-heading"><small>DRUG ADMINISTRATION</small><b>Midazolam (Versed)</b><span>{route||"Route pending"}</span></header>
        <section className={calculationReady?"dashboard-primary-dose ready":"dashboard-primary-dose pending"}>
          <small>DOSE AND AMOUNT TO GIVE</small>
          {calculationReady&&dose>0?<>
            <div className="dashboard-dose-answer"><strong>{selectedDoseValid?`${fmt(selectedDose)} mg`:"—"}</strong><span>Draw <b>{volume>0?`${fmt(volume)} mL`:"—"}</b></span></div>
            <p>Protocol-calculated dose: {fmt(dose)} mg</p>
            {editingDose?<div className="dashboard-dose-editor"><label>Actual dose to give<input autoFocus inputMode="decimal" value={plannedDose} onChange={event=>setPlannedDose(event.target.value)}/><b>mg</b></label>{!selectedDoseValid&&<span>Enter more than 0 and no more than {fmt(dose)} mg.</span>}<button onClick={()=>{setPlannedDose(fmt(dose));setEditingDose(false)}}>Use calculated dose</button></div>:!recorded&&<button className="dashboard-lower-dose" onClick={()=>setEditingDose(true)}>Change to a lesser dose</button>}
          </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}
        </section>
        {calculationReady&&<DoseSyringe volume={volume}/>}
        {calculationReady&&<section className="administration-special"><small>SPECIAL INSTRUCTIONS</small><div><span><b>Route</b>{route}</span><span><b>How to give</b>{administration}</span>{route==="IN"&&<span className="wide"><b>Intranasal split</b>{fmt(volume/2)} mL per nostril • {fmt(volume)} mL total</span>}</div></section>}
        {!calculationReady&&<button className="dashboard-required" onClick={()=>setStage(board.find(item=>!item.complete)?.id as Stage||"concentration")}><b>Choose any red box</b><span>Complete checks in the order that is fastest for you.</span><i>Open next check ›</i></button>}
        {!recorded?<button className="dashboard-give-now" disabled={!calculationReady||!selectedDoseValid||!(volume>0)} onClick={giveNow}><small>GIVE NOW</small><strong>{selectedDoseValid?`${fmt(selectedDose)} mg • ${fmt(volume)} mL`:"Complete dose"}</strong><span>{route||"Route pending"} • records administration and starts timer</span></button>:timerSeconds===0&&!(isImminent(indication)||isAgitation(indication))&&administrationCount<2?<button className="dashboard-give-now repeat" disabled={!selectedDoseValid} onClick={giveNow}><small>GIVE NEXT DOSE NOW</small><strong>{fmt(selectedDose)} mg • {fmt(volume)} mL</strong><span>Reassess and confirm it remains indicated</span></button>:<div className="dashboard-recorded"><b>✓ Dose {administrationCount} recorded</b><span>{fmt(selectedDose)} mg • {fmt(volume)} mL saved to this encounter</span></div>}
        <section className={`dashboard-timer repeat-status ${recordedAt&&routineRepeat&&!repeatFinished?"running":""} ${!routineRepeat||repeatFinished?"unavailable":""}`}>
          {!indication?<><small>REPEAT DOSE</small><strong>—</strong><span>Select an indication to show repeat-dose availability</span></>:!routineRepeat?<><small>NO REPEAT AVAILABLE</small><strong>—</strong><span>Reassess at 5 minutes and continue the agitation pathway</span></>:repeatFinished?<><small>NO REPEAT AVAILABLE</small><strong>LIMIT</strong><span>Two protocol doses have been recorded</span></>:!recordedAt?<><small>REPEAT DOSE</small><strong>05:00</strong><span>Available five minutes after the first recorded dose</span></>:timerSeconds>0?<><small>REPEAT DOSE AVAILABLE IN</small><strong>{timerText}</strong><span>Reassess before giving the next dose</span><b className="next-dose-field">Up to {fmt(dose)} mg • {concentration?fmt(dose/concentration):"—"} mL</b></>:<><small>REPEAT DOSE</small><strong>AVAILABLE NOW</strong><span>Give only after reassessment confirms it remains indicated</span><b className="next-dose-field">Up to {fmt(dose)} mg • {concentration?fmt(dose/concentration):"—"} mL</b></>}
        </section>
        {recorded&&<button className="dashboard-add-med" onClick={()=>{setAddingMedication(true);setStage("medication")}}>+ Additional medication • same patient</button>}
      </section>}
      {stage!=="result"&&stage!=="safety"&&<section className="builder-workspace versed-inline-workspace" aria-label={`Edit ${stage}`}>{medicationReference}<button className="versed-inline-close" onClick={()=>setStage("result")} aria-label="Close selection">×</button>
        {stage==="medication"&&<><small className="eyebrow">MEDICATION</small><h1>{addingMedication?"Add medication to this patient":"Select medication"}</h1><p className="screen-help">{addingMedication?"Patient information and the existing administration record will carry forward.":"Choose the medication in your hand."}</p><div className="versed-medication-list">{visibleMedicationOptions.map(option=><button key={option.id} className={option.id==="midazolam"&&medConfirmed?"selected":""} onClick={()=>{if(option.id==="midazolam"){setAddingMedication(false);if(!recorded){setMedConfirmed(true);setSafetyConfirmed(false)}setStage("result")}else selectMedication(option.id,addingMedication?patientSnapshot:undefined)}}><b>{option.name}</b><span>{option.brand}</span><i>{option.id==="midazolam"?"Select":"Open"}</i></button>)}</div></>}
        {stage==="concentration"&&<form className="builder-stage-form" onSubmit={e=>{e.preventDefault();submitConcentration()}}><small className="eyebrow">CONCENTRATION</small><h1>Select the vial concentration</h1><p className="screen-help">Common concentrations are one tap. Use custom only when the label is different.</p><div className="builder-options concentration-options"><button type="button" className={concentration===1&&labelConfirmed?"selected":""} onClick={()=>{setConcentration(1);setLabelConfirmed(true);setSafetyConfirmed(false);setRecorded(false);setStage("indication")}}><b>1 mg/mL</b><span>Confirm label and select</span></button><button type="button" className={concentration===5&&labelConfirmed?"selected":""} onClick={()=>{setConcentration(5);setLabelConfirmed(true);setSafetyConfirmed(false);setRecorded(false);setStage("indication")}}><b>5 mg/mL</b><span>Confirm label and select</span></button><button type="button" className={concentration===0?"selected":""} onClick={()=>{setConcentration(0);setLabelConfirmed(false);setRecorded(false)}}><b>Custom label</b><span>Enter total drug and volume</span></button></div>{concentration===0&&<><div className="builder-custom"><label>Total drug<input inputMode="decimal" value={customAmount} onChange={e=>{setCustomAmount(e.target.value);setLabelConfirmed(false)}}/><b>mg</b></label><label>Total volume<input inputMode="decimal" value={customVolume} onChange={e=>{setCustomVolume(e.target.value);setLabelConfirmed(false)}}/><b>mL</b></label>{customConcentration>0&&<strong>{fmt(customConcentration)} mg/mL</strong>}</div><label className={labelConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" disabled={!customConcentration} checked={labelConfirmed} onChange={e=>setLabelConfirmed(e.target.checked)}/><span><b>Custom concentration matches label</b>{customConcentration?`${customAmount} mg in ${customVolume} mL`:"Enter both label values"}</span></label><button type="submit" className="continue" disabled={!labelConfirmed||!customConcentration}>Use custom concentration <span>→</span></button></>}</form>}
        {stage==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is Versed being given?</h1><p className="screen-help">One tap selects the pathway and updates available routes.</p><div className="builder-options indication-options">{indications.map(x=><button key={x} className={indication===x?"selected":""} onClick={()=>chooseIndication(x)}><b>{x}</b><span>Select</span></button>)}</div></>}
        {stage==="route"&&<><small className="eyebrow">ROUTE</small><h1>Select route</h1><p className="screen-help">{indication?"Only routes approved for the selected indication are shown.":"Choose now; the indication selection will verify that the route is approved."}</p><div className="builder-options route-options">{routeChoices(indication).map(x=><button key={x} className={route===x?"selected":""} onClick={()=>{setRoute(x);setSafetyConfirmed(false);setRecorded(false);setStage(isImminent(indication)?"safety":"patient")}}><b>{x}</b><span>Select</span></button>)}</div></>}
        {stage==="patient"&&<><small className="eyebrow">PATIENT</small><h1>Enter only dose-changing information</h1><p className="screen-help">No adult age entry. Choose the adult dose group with one tap; pediatric weight choices avoid typing whenever possible.</p>{!isImminent(indication)&&<div className="builder-options patient-options"><button className={patient==="adult"&&halfDose===false?"selected":""} onClick={()=>{setPatient("adult");setHalfDose(false);setSafetyConfirmed(false);setRecorded(false);setStage("safety")}}><b>Adult • standard dose</b><span>Age does not change dose</span></button><button className={patient==="adult"&&halfDose===true?"selected":""} onClick={()=>{setPatient("adult");setHalfDose(true);setSafetyConfirmed(false);setRecorded(false);setStage("safety")}}><b>Adult • ½ dose</b><span>Over 65 or small adult under 50 kg</span></button><button className={patient==="pediatric"?"selected":""} onClick={()=>{setPatient("pediatric");setHalfDose(null);setSafetyConfirmed(false);setRecorded(false)}}><b>Pediatric</b><span>{indication?isAgitation(indication)?"Age band changes dose":"Weight changes dose":"Select indication to determine required entry"}</span></button></div>}{patient==="pediatric"&&!indication&&<button className="continue" onClick={()=>setStage("indication")}>Select indication to determine pediatric information <span>→</span></button>}{needsPediatricAge&&<><div className="builder-options patient-age-quick">{[8,9,10,11].map(age=><button key={age} className={pediatricAge===String(age)?"selected":""} onClick={()=>{setPediatricAge(String(age));setSafetyConfirmed(false);setRecorded(false);setStage("safety")}}><b>{age} years</b></button>)}</div></>}{needsWeight&&<WeightQuickSelect kind="pediatric" valueKg={kg>0?kg:0} onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setSafetyConfirmed(false);setRecorded(false);setStage("safety")}}/>}</>}
        {stage==="dose"&&<><small className="eyebrow">DOSE</small><h1>Select amount to give</h1><p className="screen-help">The protocol-calculated dose is prefilled. A lesser dose may be entered when clinically appropriate.</p><div className="live-math"><small>PROTOCOL-CALCULATED DOSE</small><b>{fmt(dose)} mg</b><span>{concentration?`Draw ${fmt(dose/concentration)} mL at ${fmt(concentration)} mg/mL`:"Concentration pending"}</span></div><div className="dashboard-dose-editor"><label>Selected dose<input autoFocus inputMode="decimal" value={plannedDose} onChange={event=>setPlannedDose(event.target.value)}/><b>mg</b></label>{!selectedDoseValid&&<span>Enter more than 0 and no more than {fmt(dose)} mg.</span>}<button onClick={()=>setPlannedDose(fmt(dose))}>Use calculated dose</button></div><button className="continue" disabled={!selectedDoseValid} onClick={()=>setStage("safety")}>Use selected dose <span>→</span></button></>}
      </section>}
    </div>
    {stage==="safety"&&<div className="versed-popup-backdrop" onClick={()=>setStage("result")}><section className="builder-workspace versed-popup" role="dialog" aria-modal="true" aria-label="Safety review" onClick={e=>e.stopPropagation()}><button className="versed-popup-close" onClick={()=>setStage("result")} aria-label="Close popup">×</button><small className="eyebrow">SAFETY</small><h1>Review all safety checks</h1><p className="screen-help">All contraindications and conditions are visible. Only one confirmation is required.</p>{(!medConfirmed||!concentration||!labelConfirmed||!indication||!route||!patientComplete)&&<div className="hard-stop"><b>CALCULATION INFORMATION IS INCOMPLETE</b><span>Review the list now, then complete the remaining red boxes before confirming.</span></div>}<div className="live-math"><small>LIVE CALCULATION</small><b>{dose>0?`${fmt(dose)} mg`:"Dose pending"}{volume>0?` • draw ${fmt(volume)} mL`:""}</b><span>{route||"Route pending"} • {concentration?`${fmt(concentration)} mg/mL`:"Concentration pending"}</span></div><div className="builder-safety-list">{safetyItems.map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</div><label className={safetyConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" disabled={!medConfirmed||!concentration||!labelConfirmed||!indication||!route||!patientComplete} checked={safetyConfirmed} onChange={e=>setSafetyConfirmed(e.target.checked)}/><span><b>Confirm all safety checks</b>I reviewed every item above; no listed contraindication is present and all required conditions are met.</span></label><button className="continue" disabled={!safetyConfirmed} onClick={()=>setStage("result")}>Confirm and show final dose <span>→</span></button></section></div>}
  </main>;
}
