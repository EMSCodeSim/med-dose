import {useMemo} from "react";
import MedicationEngine from "./MedicationEngine";
import type {GenericMedication} from "./dmpMedicationData";
import "./adminCalculatorPreview.css";

type JsonObject=Record<string,any>;

export default function AdminCalculatorPreview({data,close}:{data:JsonObject;close:()=>void}){
  const medication=useMemo<GenericMedication|null>(()=>{
    if(!Array.isArray(data.paths)||data.paths.length===0)return null;
    return {
      id:String(data.id||"admin-preview"),
      name:String(data.name||"Medication preview"),
      protocolId:String(data.protocolId||"PREVIEW"),
      page:Number(data.page||0),
      contraindications:Array.isArray(data.contraindications)?data.contraindications.map(String):[],
      clinicalOverview:Array.isArray(data.notes)?data.notes.map(String):undefined,
      paths:data.paths,
    } as GenericMedication;
  },[data]);
  return <div className="admin-calculator-preview-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
    <section className="admin-calculator-preview" role="dialog" aria-modal="true" aria-label={`${String(data.name||"Medication")} calculator test`}>
      <header><div><small>ADMIN • CALCULATOR TEST</small><h2>{String(data.name||"Medication")}</h2><span>Preview only • no administration is recorded • does not change the live release</span></div><button type="button" onClick={close}>×</button></header>
      {medication?<div className="admin-calculator-preview-body"><MedicationEngine key={JSON.stringify(data.paths)} medication={medication} close={close} record={()=>{}} openProtocol={()=>{}}/></div>:<div className="admin-calculator-preview-empty"><b>No runnable calculator is configured.</b><span>Add at least one indication / route / dose treatment path, save the draft, then test again.</span></div>}
    </section>
  </div>;
}
