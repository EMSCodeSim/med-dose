import type {GenericDosePath} from "./dmpMedicationData";
import "./protocolAgeQuickSelect.css";

type Props={
  medicationId:string;
  path:GenericDosePath;
  value:string;
  onSelect:(years:number,label:string)=>void;
  onExact:(value:string)=>void;
};

type Choice={label:string;detail:string;years:number};

const elderlyAt65=new Set(["antipsychotics","haloperidol"]);
const elderlyOver65=new Set(["midazolam","diphenhydramine","ketorolac","diltiazem","diazepam","lorazepam"]);

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
  if(min===0&&maxExclusive<=1)return "Under 1 year";
  if(min===0&&maxExclusive===12)return "Pediatric <12";
  if(min===12&&!Number.isFinite(maxExclusive))return "Adult 12+";
  if(min===65&&!Number.isFinite(maxExclusive))return "Adult 65+";
  if(min===66&&!Number.isFinite(maxExclusive))return "Adult 66+";
  if(maxExclusive<=1)return `${Math.round(min*12)}–<${Math.round(maxExclusive*12)} months`;
  if(min<1)return `${Math.round(min*12)} months–<${Math.round(maxExclusive)} years`;
  if(Number.isFinite(maxExclusive))return `${patient==="adult"?"Adult ":patient==="pediatric"?"Pediatric ":""}${Math.round(min)}–${Math.max(Math.round(min),Math.ceil(maxExclusive)-1)}`;
  return `${patient==="adult"?"Adult ":patient==="pediatric"?"Pediatric ":""}${Math.round(min)}+`;
}

function choicesFor(medicationId:string,path:GenericDosePath):Choice[]{
  if(path.formula.kind==="ageBands"){
    return path.formula.bands.map(b=>({label:labelFor(b.min,b.max,path.patient),detail:`Protocol age band • ${ageText(b.min)} to under ${ageText(b.max)}`,years:representative(b.min,b.max)}));
  }
  const baseMin=path.minAge??(path.patient==="adult"?12:0);
  const baseMax=path.maxAge??(path.patient==="pediatric"?12:Infinity);
  const cuts=[baseMin,baseMax];
  if(elderlyAt65.has(medicationId)&&baseMin<65&&baseMax>65)cuts.push(65);
  if(elderlyOver65.has(medicationId)&&baseMin<66&&baseMax>66)cuts.push(66);
  if(baseMin<1&&baseMax>1)cuts.push(1);
  const ordered=Array.from(new Set(cuts)).sort((a,b)=>a-b);
  const out:Choice[]=[];
  for(let i=0;i<ordered.length-1;i++){
    const min=ordered[i],max=ordered[i+1];
    if(!(max>min))continue;
    out.push({label:labelFor(min,max,path.patient),detail:`Protocol age band • ${ageText(min)} to under ${ageText(max)}`,years:representative(min,max)});
  }
  const last=ordered.at(-1)!;
  if(!Number.isFinite(last)&&out.length===0)out.push({label:path.patient==="adult"?"Adult 12+":"All ages",detail:"Protocol age group",years:path.patient==="adult"?40:8});
  if(Number.isFinite(last)&&!Number.isFinite(baseMax))out.push({label:labelFor(last,Infinity,path.patient),detail:`Protocol age band • ${ageText(last)} and older`,years:last});
  if(out.length===0){
    out.push({label:labelFor(baseMin,baseMax,path.patient),detail:"Protocol age group",years:representative(baseMin,baseMax)});
  }
  return out;
}

export default function ProtocolAgeQuickSelect({medicationId,path,value,onSelect,onExact}:Props){
  const choices=choicesFor(medicationId,path);
  return <section className="protocol-age-select">
    <div className="protocol-age-heading"><b>Select patient age group</b><span>Only age bands that can affect this protocol are shown.</span></div>
    <div className="protocol-age-grid">{choices.map(choice=><button type="button" key={`${choice.label}-${choice.years}`} onClick={()=>onSelect(choice.years,choice.label)}><strong>{choice.label}</strong><span>{choice.detail}</span></button>)}</div>
    <details className="protocol-exact-age"><summary>Enter exact age instead</summary><label><span>Age in years</span><input inputMode="decimal" value={value} onChange={e=>onExact(e.target.value)} placeholder="Exact age"/></label></details>
  </section>;
}
