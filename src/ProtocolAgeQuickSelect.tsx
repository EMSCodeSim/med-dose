import {useState} from "react";
import type {GenericDosePath} from "./dmpMedicationData";
import "./protocolAgeQuickSelect.css";

type DoseMode="standard"|"half"|"fentanyl-low";
type Props={
  medicationId:string;
  path:GenericDosePath;
  value:string;
  onSelect:(years:number,label:string,doseMode?:DoseMode)=>void;
  onExact:(value:string)=>void;
};

type Choice={label:string;detail:string;years:number};

const elderlyAt65=new Set(["antipsychotics","haloperidol"]);
const elderlyOver65=new Set(["midazolam","diphenhydramine","ketorolac","diltiazem","diazepam","lorazepam","fentanyl"]);

function ageText(years:number){
  if(years<1){const months=Math.max(1,Math.round(years*12));return `${months} month${months===1?"":"s"}`}
  return Number.isInteger(years)?`${years} years`:`${years.toFixed(1)} years`;
}
function representative(min:number,maxExclusive:number){
  if(maxExclusive<=1)return Math.max(min,Math.min(maxExclusive-0.01,0.5));
  if(min<1)return Math.max(min,1/12);
  if(Number.isFinite(maxExclusive))return Math.max(min,Math.min(maxExclusive-0.01,min));
  return min;
}
function labelFor(min:number,maxExclusive:number,patient:GenericDosePath["patient"]){
  if((min>65&&min<66||min===66)&&patient==="adult")return "Adult >65";
  if(min===0&&maxExclusive<=1)return "Under 1 year";
  if(min===0&&maxExclusive===12)return "Pediatric <12";
  if(min===12&&!Number.isFinite(maxExclusive))return "Adult 12+";
  if(min===65&&!Number.isFinite(maxExclusive))return "Adult 65+";
  if(maxExclusive<=1)return `${Math.round(min*12)}–<${Math.round(maxExclusive*12)} months`;
  if(min<1)return `${Math.round(min*12)} months–<${Math.round(maxExclusive)} years`;
  if(Number.isFinite(maxExclusive))return `${patient==="adult"?"Adult ":patient==="pediatric"?"Pediatric ":""}${Math.round(min)}–${Math.max(Math.round(min),Math.ceil(maxExclusive)-1)}`;
  return `${patient==="adult"?"Adult ":patient==="pediatric"?"Pediatric ":""}${Math.round(min)}+`;
}

function orderAgeChoices(choices:Choice[]){
  return choices.map((choice,index)=>({choice,index})).sort((a,b)=>{
    const rank=(choice:Choice)=>choice.years>=12?0:choice.years>=1?1:2;
    return rank(a.choice)-rank(b.choice)||a.index-b.index;
  }).map(item=>item.choice);
}

function choicesFor(medicationId:string,path:GenericDosePath):Choice[]{
  if(path.formula.kind==="ageBands"){
    return orderAgeChoices(path.formula.bands.map(b=>({label:labelFor(b.min,b.max,path.patient),detail:`Protocol age band • ${ageText(b.min)} to under ${ageText(b.max)}`,years:representative(b.min,b.max)})));
  }
  const baseMin=path.minAge??(path.patient==="adult"?12:0);
  const baseMax=path.maxAge??(path.patient==="pediatric"?12:Infinity);

  if(path.patient==="adult"&&elderlyOver65.has(medicationId)&&baseMax>65&&baseMax<=66){
    return orderAgeChoices([
      {label:"Adult 12–65",detail:"Protocol age band • 12 years through age 65",years:40},
      {label:"Adult >65",detail:medicationId==="ketorolac"?"CONTRAINDICATED • patients over 65":"Protocol age band • over 65 years",years:66},
    ]);
  }

  const cuts=[baseMin,baseMax];
  if(elderlyAt65.has(medicationId)&&baseMin<65&&baseMax>65)cuts.push(65);
  if(elderlyOver65.has(medicationId)&&baseMin<66&&baseMax>66)cuts.push(66);
  if(baseMin<1&&baseMax>1)cuts.push(1);
  const ordered=Array.from(new Set(cuts)).sort((a,b)=>a-b);
  const out:Choice[]=[];
  for(let i=0;i<ordered.length-1;i++){
    const min=ordered[i],max=ordered[i+1];
    if(!(max>min))continue;
    const isOlderAdult=path.patient==="adult"&&min>=66;
    const detail=isOlderAdult&&medicationId==="fentanyl"?"Elderly/frail: strongly consider the lower end of the 1–2 mcg/kg range":`Protocol age band • ${ageText(min)} to under ${ageText(max)}`;
    out.push({label:labelFor(min,max,path.patient),detail,years:representative(min,max)});
  }
  const last=ordered.at(-1)!;
  if(!Number.isFinite(last)&&out.length===0)out.push({label:path.patient==="adult"?"Adult 12+":"All ages",detail:"Protocol age group",years:path.patient==="adult"?40:8});
  if(Number.isFinite(last)&&!Number.isFinite(baseMax)){
    const detail=path.patient==="adult"&&last>=66&&medicationId==="fentanyl"?"Elderly/frail: strongly consider the lower end of the 1–2 mcg/kg range":`Protocol age band • ${ageText(last)} and older`;
    out.push({label:labelFor(last,Infinity,path.patient),detail,years:last});
  }
  if(out.length===0){
    out.push({label:labelFor(baseMin,baseMax,path.patient),detail:"Protocol age group",years:representative(baseMin,baseMax)});
  }
  return orderAgeChoices(out);
}

function persistAge(years:number|string){
  const n=Number(years);
  if(!(n>=0))return;
  try{
    const current=JSON.parse(sessionStorage.getItem("mmd-patient")||"{}");
    sessionStorage.setItem("mmd-patient",JSON.stringify({...current,ageYears:String(n)}));
  }catch{}
}

export default function ProtocolAgeQuickSelect({medicationId,path,value,onSelect,onExact}:Props){
  const choices=choicesFor(medicationId,path);
  const [pendingOlderAdult,setPendingOlderAdult]=useState<Choice|null>(null);
  const finish=(choice:Choice,doseMode?:DoseMode)=>{
    persistAge(choice.years);
    onSelect(choice.years,choice.label,doseMode);
    setPendingOlderAdult(null);
    window.setTimeout(()=>{
      const button=document.querySelector("#active-medication-screen-top button.continue") as HTMLButtonElement|null;
      if(button&&!button.disabled)button.click();
    },0);
  };
  const choose=(choice:Choice)=>{
    const olderAdult=path.patient==="adult"&&choice.years>65;
    if(olderAdult&&medicationId==="midazolam"){
      persistAge(choice.years);
      setPendingOlderAdult(choice);
      return;
    }
    if(olderAdult&&medicationId==="fentanyl"&&path.formula.kind==="perKg"&&path.formula.amount>1){
      persistAge(choice.years);
      setPendingOlderAdult(choice);
      return;
    }
    finish(choice,"standard");
  };
  const exact=(next:string)=>{
    persistAge(next);
    onExact(next);
    if(Number(next)>65&&(medicationId==="midazolam"||(medicationId==="fentanyl"&&path.formula.kind==="perKg"&&path.formula.amount>1))){
      setPendingOlderAdult({label:"Adult >65",detail:"Exact age entered",years:Number(next)});
    }else setPendingOlderAdult(null);
  };

  if(pendingOlderAdult&&medicationId==="midazolam")return <section className="protocol-age-select elderly-dose-decision">
    <div className="protocol-age-heading"><b>Adult &gt;65 selected</b><span>DMP 9070: lower doses may be sufficient. Consider one-half dosing.</span></div>
    <div className="protocol-age-grid">
      <button type="button" onClick={()=>finish(pendingOlderAdult,"standard")}><strong>Standard dose</strong><span>Continue with the standard protocol dose</span></button>
      <button type="button" onClick={()=>finish(pendingOlderAdult,"half")}><strong>Consider ½ dose</strong><span>Select the available one-half dose pathway</span></button>
    </div>
    <button type="button" className="age-decision-back" onClick={()=>setPendingOlderAdult(null)}>← Change age group</button>
  </section>;

  if(pendingOlderAdult&&medicationId==="fentanyl")return <section className="protocol-age-select elderly-dose-decision">
    <div className="protocol-age-heading"><b>Elderly/frail dosing consideration</b><span>DMP 9230: strongly consider the lower end of the 1–2 mcg/kg range.</span></div>
    <div className="protocol-age-grid">
      <button type="button" onClick={()=>finish(pendingOlderAdult,"fentanyl-low")}><strong>Use 1 mcg/kg</strong><span>Lower end of the protocol range</span></button>
      <button type="button" onClick={()=>finish(pendingOlderAdult,"standard")}><strong>Continue selected dose</strong><span>{path.formula.kind==="perKg"?`${path.formula.amount} mcg/kg selected`:"Continue current pathway"}</span></button>
    </div>
    <button type="button" className="age-decision-back" onClick={()=>setPendingOlderAdult(null)}>← Change age group</button>
  </section>;

  return <section className="protocol-age-select">
    <div className="protocol-age-heading"><b>Select patient age group</b><span>Adult choices first, then pediatric age bands that affect this protocol.</span></div>
    <div className="protocol-age-grid">{choices.map(choice=><button type="button" key={`${choice.label}-${choice.years}`} onClick={()=>choose(choice)}><strong>{choice.label}</strong><span>{choice.detail}</span></button>)}</div>
    <details className="protocol-exact-age"><summary>Enter exact age instead</summary><label><span>Age in years</span><input inputMode="decimal" value={value} onChange={e=>exact(e.target.value)} placeholder="Exact age"/></label></details>
  </section>;
}
