import {useMemo,useState} from "react";
import type {GenericMedication,GenericDosePath} from "./dmpMedicationData";
import "./genericMedication.css";

type RecordedAdministration={drug:string;reason:string;route:string;dose:number;unit:string;volume:number;time:number;concentration:string;patient?:string};
type Props={medication:GenericMedication;close:()=>void;record:(entry:RecordedAdministration)=>void;openProtocol:()=>void};
type AgeUnit="years"|"months"|"days";

export default function DmpMedicationCalculator({medication,close,record,openProtocol}:Props){
  const [step,setStep]=useState<"path"|"patient"|"verify"|"result">("path"),[path,setPath]=useState<GenericDosePath|null>(null),
    [age,setAge]=useState(""),[ageUnit,setAgeUnit]=useState<AgeUnit>("years"),[weight,setWeight]=useState(""),[weightUnit,setWeightUnit]=useState<"kg"|"lb">("kg"),
    [route,setRoute]=useState(""),[concentration,setConcentration]=useState(""),[medConfirmed,setMedConfirmed]=useState(false),[concConfirmed,setConcConfirmed]=useState(false),
    [checks,setChecks]=useState<boolean[]>([]),[basePhysician,setBasePhysician]=useState(""),[baseApproved,setBaseApproved]=useState(false),[actual,setActual]=useState(""),[recorded,setRecorded]=useState(false);
  const ageYears=ageUnit==="years"?Number(age):ageUnit==="months"?Number(age)/12:Number(age)/365.25,
    kg=weightUnit==="kg"?Number(weight):Number(weight)/2.20462,
    needsWeight=!!path&&(path.formula.kind==="perKg"||path.requiresWeight),
    routeChoices=path?routesFor(path.route):[],
    selectedRoute=route||routeChoices[0]||"",
    eligibility=path?genericEligibilityReason(path,ageYears,kg):"",
    result=useMemo(()=>path?calculateGenericDose(path,ageYears,kg,medication.id):null,[path,ageYears,kg,medication.id]),
    needsConcentration=!!path&&path.formula.kind!=="instruction"&&path.formula.unit!=="mL"&&path.formula.unit!=="drops"&&path.formula.unit!=="sprays"&&path.formula.unit!=="device"&&(!!path.volumeRequired||!!path.suggestedConcentration)&&(!["ODT","PO","Sublingual","PO — chew"].includes(selectedRoute)||!!path.suggestedConcentration),
    conc=Number(concentration),volume=result&&needsConcentration&&conc>0?result.dose/conc:0,
    patientText=age!==""?`${age} ${ageUnit}${needsWeight&&kg>0?` • ${fmt(kg)} kg`:""}`:"",
    verificationItems=path?[...medication.contraindications,...(path.special||[])]:[],
    verified=medConfirmed&&(!needsConcentration||(conc>0&&concConfirmed))&&verificationItems.every((_,i)=>checks[i])&&(!path?.baseContact||(baseApproved&&!!basePhysician.trim())),
    actualDose=Number(actual),actualOk=!!result&&result.numeric&&actualDose>0&&actualDose<=result.dose,
    belowProtocolMin=!!result&&result.numeric&&!!result.minDose&&actualDose>0&&actualDose<result.minDose,
    actualVolume=actualOk&&needsConcentration?actualDose/conc:volume,
    additionalAdjustment=(medication.id==="diazepam"||medication.id==="lorazepam")&&path?.patient==="adult"&&(ageYears>65||kg<50)?"DMP 9070 half-dose applied for age over 65 or adult weight under 50 kg":(medication.id==="morphine"||medication.id==="hydromorphone")&&ageYears>65?"DMP 9230 elderly starting dose reduced by one-half":"";
  const choosePath=(next:GenericDosePath)=>{setPath(next);setRoute(routesFor(next.route)[0]||"");setAge("");setWeight("");setChecks([]);setConcentration(next.suggestedConcentration?String(next.suggestedConcentration):"");setConcConfirmed(false);setMedConfirmed(false);setBaseApproved(false);setBasePhysician("");setStep("patient")};
  const finishPatient=()=>{if(path&&result&&!eligibility&&age!==""&&(!needsWeight||kg>0)){setActual(result.numeric?String(result.minDose||result.dose):"");setStep("verify")}};
  const recordNow=()=>{if(!path||!result||recorded)return;const amount=result.numeric?actualDose:1;record({drug:path.agent,reason:path.label,route:selectedRoute,dose:amount,unit:result.numeric?`${result.unit}${medication.id==="dopamine"?"/min":""}`:"treatment",volume:result.unit==="mL"?amount:needsConcentration?actualVolume:0,time:Date.now(),concentration:needsConcentration?`${fmt(conc)} ${result.unit}/mL`:path.administration,patient:patientText});setRecorded(true);setStep("result")};
  return <div className="generic-calc-backdrop"><main className="generic-calc" role="dialog" aria-modal="true" aria-label={`${medication.name} calculator`}>
    <header><button onClick={step==="path"?close:()=>setStep(step==="patient"?"path":step==="verify"?"patient":"verify")}>‹ {step==="path"?"Close":"Back"}</button><span><small>DMP {medication.protocolId}</small><b>{medication.name}</b></span><button onClick={openProtocol}>Protocol §</button></header>
    <div className="generic-progress"><i className={step==="path"?"active":"done"}>1</i><span/><i className={step==="patient"?"active":step==="path"?"":"done"}>2</i><span/><i className={step==="verify"?"active":step==="result"?"done":""}>3</i><span/><i className={step==="result"?"active":""}>4</i></div>
    <section className="generic-body">
      {step==="result"&&additionalAdjustment&&<div className="generic-dose-adjustment"><b>MEDICATION-SPECIFIC ADJUSTMENT</b><span>{additionalAdjustment}</span></div>}
      {step==="path"&&<><small className="generic-eyebrow">INDICATION / DOSE PATHWAY</small><h1>Select the exact DMP use</h1><p>Only pathways in medication DMP {medication.protocolId} are shown.</p><div className="generic-paths">{medication.paths.map(x=><button key={x.id} onClick={()=>choosePath(x)}><span><b>{x.label}</b><small>{x.agent} • {x.route}</small></span><i>›</i></button>)}</div></>}
      {step==="patient"&&path&&<><small className="generic-eyebrow">PATIENT / ROUTE</small><h1>{path.agent}</h1><div className="selected-generic-path"><b>{path.label}</b><span>{path.protocol}</span></div><label className="generic-field"><span>Patient age</span><div><input autoFocus inputMode="decimal" value={age} onChange={e=>setAge(e.target.value)} placeholder="0"/><select value={ageUnit} onChange={e=>setAgeUnit(e.target.value as AgeUnit)}><option value="years">years</option><option value="months">months</option><option value="days">days</option></select></div></label>{needsWeight&&<><div className="generic-toggle"><button className={weightUnit==="kg"?"selected":""} onClick={()=>{setWeightUnit("kg");setWeight("")}}>kg</button><button className={weightUnit==="lb"?"selected":""} onClick={()=>{setWeightUnit("lb");setWeight("")}}>lb</button></div><label className="generic-field"><span>Calculation weight</span><div><input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="0"/><b>{weightUnit}</b></div></label>{kg>0&&<div className="kg-lock"><small>CALCULATION WEIGHT</small><b>{fmt(kg)} kg</b></div>}</>}{routeChoices.length>1&&<div className="generic-routes"><small>ROUTE</small>{routeChoices.map(x=><button key={x} className={route===x?"selected":""} onClick={()=>setRoute(x)}>{x}</button>)}</div>}{eligibility&&age!==""&&<div className="generic-stop" role="alert"><b>THIS PATHWAY DOES NOT APPLY</b><span>{eligibility}</span><button onClick={()=>setStep("path")}>Choose the correct pathway</button></div>}<button className="generic-continue" disabled={!age||!!eligibility||(needsWeight&&!(kg>0))} onClick={finishPatient}>Continue to medication check →</button></>}
      {step==="verify"&&path&&result&&<><small className="generic-eyebrow">MEDICATION SAFETY CHECK</small><h1>Confirm before calculation</h1><div className="generic-dose-preview"><small>DMP DOSE</small><b>{result.text}</b><span>{selectedRoute} • {path.administration}</span></div>{needsConcentration&&<label className="generic-field"><span>Concentration from physical medication ({result.unit}/mL)</span><div><input inputMode="decimal" value={concentration} onChange={e=>{setConcentration(e.target.value);setConcConfirmed(false)}} placeholder="0"/><b>{result.unit}/mL</b></div></label>}<div className="generic-checks"><label><input type="checkbox" checked={medConfirmed} onChange={e=>setMedConfirmed(e.target.checked)}/><span><b>Correct medication</b>Physical medication says {path.agent}</span></label>{needsConcentration&&<label><input type="checkbox" checked={concConfirmed} disabled={!(conc>0)} onChange={e=>setConcConfirmed(e.target.checked)}/><span><b>Concentration confirmed</b>{conc>0?`${fmt(conc)} ${result.unit}/mL = ${fmt(volume)} mL calculated volume`:"Enter the physical concentration"}</span></label>}{verificationItems.map((x,i)=><label key={x}><input type="checkbox" checked={!!checks[i]} onChange={e=>setChecks(c=>{const n=[...c];n[i]=e.target.checked;return n})}/><span><b>Reviewed / not present</b>{x}</span></label>)}</div>{path.baseContact&&<div className="generic-base"><b>BASE CONTACT REQUIRED</b><span>{path.baseContact}</span><input placeholder="Approving physician name" value={basePhysician} onChange={e=>{setBasePhysician(e.target.value);setBaseApproved(false)}}/><label><input type="checkbox" checked={baseApproved} onChange={e=>setBaseApproved(e.target.checked)}/><span>Direct verbal order received and read back</span></label></div>}<button className="generic-continue" disabled={!verified} onClick={()=>setStep("result")}>Show final dose →</button></>}
      {step==="result"&&path&&result&&<><small className="generic-eyebrow">FINAL CROSS-CHECK</small><h1>{recorded?"Administration recorded":"Dose ready"}</h1><div className="generic-final"><small>{path.agent.toUpperCase()} • {selectedRoute}</small><strong>{result.text}</strong>{needsConcentration&&<b>{medication.id==="dopamine"?`INFUSE ${fmt(result.dose/conc)} mL/min • ${fmt(result.dose/conc*60)} mL/hr`:`DRAW ${fmt(result.dose/conc)} mL`}</b>}<span>{patientText}</span></div><div className="generic-summary"><p><span>Indication</span><b>{path.label}</b></p><p><span>Administration</span><b>{path.administration}</b></p><p><span>Repeat</span><b>{path.repeat}</b></p>{(medication.id==="diltiazem"||medication.id==="antipsychotics")&&ageYears>65&&<p><span>Age adjustment</span><b>DMP over-65 half-dose applied</b></p>}<p><span>Protocol</span><b>DMP {medication.protocolId} • {path.protocol}</b></p>{path.baseContact&&<p><span>Base authorization</span><b>Approved by {basePhysician}</b></p>}</div>{result.numeric&&!recorded&&<label className="generic-field actual-generic"><span>Actual amount being given</span><div><input inputMode="decimal" value={actual} onChange={e=>setActual(e.target.value)}/><b>{result.unit}{medication.id==="dopamine"?"/min":""}</b></div></label>}{belowProtocolMin&&!recorded&&<div className="generic-dose-adjustment"><b>BELOW THE LISTED DMP DOSE RANGE</b><span>The entered amount will be documented exactly as given. Recheck the protocol dose and clinical reason before recording.</span></div>}{!recorded&&result.numeric&&!actualOk&&<div className="generic-stop"><b>CHECK ACTUAL DOSE</b><span>Enter more than 0 and no more than the calculated {result.text}.</span></div>}{!recorded?<button className="generic-record" disabled={result.numeric&&!actualOk} onClick={recordNow}>{result.numeric?`Record ${fmt(actualDose)} ${result.unit}${medication.id==="dopamine"?"/min":""}${needsConcentration?` • ${fmt(actualVolume)} mL${medication.id==="dopamine"?"/min":""}`:result.unit==="mL"?` • ${fmt(actualDose)} mL`:""} given now`:"Record treatment completed"}</button>:<div className="generic-recorded"><b>Saved to this encounter</b><span>{new Date().toLocaleTimeString()}</span></div>}<button className="generic-secondary" onClick={close}>{recorded?"Return to medication list":"Close without recording"}</button></>}
    </section>
  </main></div>;
}

export function calculateGenericDose(path:GenericDosePath,age:number,weight:number,medicationId:string){
  const f=path.formula;
  if(f.kind==="instruction")return{numeric:false,dose:0,minDose:0,unit:f.unit,text:f.text};
  let dose=0,minDose=0,unit=f.unit;
  if(f.kind==="fixed")dose=f.amount;
  if(f.kind==="range"){dose=f.max;minDose=f.min}
  if(f.kind==="perKg")dose=Math.min(f.max??Infinity,Math.max(f.min??0,weight*f.amount));
  if(f.kind==="ageBands")dose=f.bands.find(x=>age>=x.min&&age<x.max)?.amount||0;
  if(medicationId==="diltiazem"&&age>65){dose*=.5;dose=Math.min(dose,path.id==="initial"?10:20)}
  if(medicationId==="antipsychotics"&&age>65)dose*=.5;
  if((medicationId==="diazepam"||medicationId==="lorazepam")&&path.patient==="adult"&&(age>65||weight<50)){dose*=.5;minDose*=.5}
  if((medicationId==="morphine"||medicationId==="hydromorphone")&&age>65){dose*=.5;minDose*=.5}
  const rate=medicationId==="dopamine"?"/min":"";
  return{numeric:true,dose,minDose,unit,text:f.kind==="range"?`${fmt(minDose)}–${fmt(dose)} ${unit}`:`${fmt(dose)} ${unit}${rate}`};
}
export function genericEligibilityReason(path:GenericDosePath,age:number,weight:number){
  if(!Number.isFinite(age)||age<0||age>=130)return"Enter a valid patient age.";
  if(path.patient==="adult"&&age<12)return"This is an adult pathway. Choose the pediatric pathway when one is listed.";
  if(path.patient==="pediatric"&&age>=12)return"This is a pediatric pathway for patients under 12 years.";
  if(path.minAge!==undefined&&age<path.minAge)return`DMP ${path.label} begins at ${ageLabel(path.minAge)}.`;
  if(path.maxAge!==undefined&&age>=path.maxAge)return`This pathway applies below ${ageLabel(path.maxAge)}.`;
  if(path.id==="ped-hypo-small"&&weight>=25)return"This Glucagon pathway is for patients under 25 kg.";
  if(path.id==="ped-hypo-large"&&weight>0&&weight<25)return"This Glucagon pathway is for patients 25 kg or greater.";
  if(path.id==="poison-adult"&&weight>0&&weight<40)return"The adult organophosphate pathway requires a weight of 40 kg or greater. Choose the under-40 kg pathway.";
  return"";
}
function routesFor(route:string){
  const map:Record<string,string[]>={"IV/IM/PO/ODT":["IV","IM","PO","ODT"],"IV/PO/ODT":["IV","PO","ODT"],"IV/IO/IM/IN":["IV/IO","IM","IN"],"IV/IO/IM":["IV/IO","IM"],"IV/IM":["IV","IM"],"Slow IV/IM":["IV","IM"],"IM or ODT":["IM","ODT"]};
  return map[route]||[route];
}
function ageLabel(years:number){return years<1?`${Math.round(years*12)} months`:`${fmt(years)} years`}
function fmt(n:number){const d=Math.abs(n)>0&&Math.abs(n)<1?3:2;return Number.isFinite(n)?Number(n.toFixed(d)).toString():"—"}
