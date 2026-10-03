import {useMemo,useState} from "react";
import "./adminMedicationSafetyPanel.css";

type JsonObject=Record<string,any>;
const clinicalKeys=["name","protocolId","concentrations","indications","routes","paths","contraindications","monitoring","administration","doseRules","notes"];
const stable=(value:any)=>JSON.stringify(value??null);
const calcSignature=(id:string,data:JsonObject)=>`${id}:${stable(data.paths)}:${stable(data.concentrations)}`;
const testKey=(id:string)=>`mmd-admin-calculator-tested:${id}`;
export const calculatorTestCurrent=(id:string,data:JsonObject)=>{
  try{return localStorage.getItem(testKey(id))===calcSignature(id,data)}catch{return false}
};
export const markCalculatorTested=(id:string,data:JsonObject)=>{
  try{localStorage.setItem(testKey(id),calcSignature(id,data))}catch{}
};
export const clearCalculatorTest=(id:string)=>{try{localStorage.removeItem(testKey(id))}catch{}};

const summarize=(key:string,value:any)=>{
  if(key==="paths"&&Array.isArray(value))return `${value.length} treatment pathway${value.length===1?"":"s"}`;
  if(key==="concentrations"&&Array.isArray(value))return value.map(x=>x?.label||x?.concentration||"configured").join(", ")||"none";
  if(Array.isArray(value))return value.length?`${value.length} item${value.length===1?"":"s"}`:"none";
  if(value&&typeof value==="object")return `${Object.keys(value).length} configured field${Object.keys(value).length===1?"":"s"}`;
  return String(value??"none");
};
const label=(key:string)=>({protocolId:"Protocol",paths:"Calculator pathways",concentrations:"Concentrations",contraindications:"Contraindications",doseRules:"Dose rules"}[key]||key.replace(/([A-Z])/g," $1").replace(/^./,x=>x.toUpperCase()));

export default function AdminMedicationSafetyPanel({medicationId,currentData,publishedData,validationComplete,approvals,onTest}:{medicationId:string;currentData:JsonObject;publishedData:JsonObject;validationComplete:boolean;approvals:number;onTest:()=>void}){
  const [tested,setTested]=useState(()=>calculatorTestCurrent(medicationId,currentData));
  const changes=useMemo(()=>clinicalKeys.filter(key=>stable(currentData?.[key])!==stable(publishedData?.[key])).map(key=>({key,before:summarize(key,publishedData?.[key]),after:summarize(key,currentData?.[key])})),[currentData,publishedData]);
  const hasCalculator=Array.isArray(currentData?.paths)&&currentData.paths.length>0;
  const concentrationReady=Array.isArray(currentData?.concentrations)&&currentData.concentrations.length>0;
  const safetyReady=Array.isArray(currentData?.contraindications);
  const testCurrent=hasCalculator&&tested&&calculatorTestCurrent(medicationId,currentData);
  const blockers=[!hasCalculator&&"Add at least one calculator pathway",!concentrationReady&&"Configure medication concentration/formulation",!safetyReady&&"Review contraindications / safety checks",!validationComplete&&"Complete required validation checks",hasCalculator&&!testCurrent&&"Run and sign off the calculator test"].filter(Boolean) as string[];
  const status=blockers.length?`${blockers.length} item${blockers.length===1?"":"s"} before review`:approvals>=2?"Ready to publish":"Ready for reviewer approval";
  return <section className="admin-safety-readiness">
    <header><div><small>REVIEW READINESS</small><h3>{status}</h3><p>Clinical changes must pass validation and a calculator test before reviewer signatures are accepted.</p></div><span className={blockers.length?"needs-work":"ready"}>{blockers.length?"NEEDS WORK":"READY"}</span></header>
    <div className="admin-readiness-grid">
      <div><b>Required checks</b>{blockers.length?<ul>{blockers.map(item=><li key={item}>{item}</li>)}</ul>:<p>All pre-review checks are complete.</p>}</div>
      <div><b>Calculator test</b><p>{testCurrent?"Passed for the current calculator/concentration configuration.":"Not yet signed off for the current configuration."}</p><div className="admin-readiness-actions"><button type="button" onClick={onTest}>Test calculator</button><button type="button" disabled={!hasCalculator} onClick={()=>{markCalculatorTested(medicationId,currentData);setTested(true)}}>Mark calculator tested</button></div></div>
    </div>
    <div className="admin-change-review"><b>Changes from current live record</b>{changes.length===0?<p>No clinical differences from the published record.</p>:<div>{changes.map(change=><article key={change.key}><strong>{label(change.key)}</strong><span><del>{change.before}</del><b>→</b><ins>{change.after}</ins></span></article>)}</div>}</div>
  </section>;
}
