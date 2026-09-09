import {useMemo,useState} from "react";
import {queueCalculationReport} from "./calculationReportLog";
import type {RecordedAdministration} from "./encounterTypes";

export default function EncounterReport({entries,close,onDelete}:{entries:RecordedAdministration[];close:()=>void;onDelete:()=>void}){
  const [incident,setIncident]=useState(""),[provider,setProvider]=useState(""),[status,setStatus]=useState("");
  const text=useMemo(()=>[
    "METRO MED DOSE — ENCOUNTER MEDICATION REPORT",
    `Created: ${new Date().toLocaleString()}`,
    `Incident/ePCR: ${incident||"Not entered"}`,
    `Provider: ${provider||"Not entered"}`,
    "",
    ...entries.flatMap((entry,index)=>[reportEntryText(entry,index),""]),
    "",
    "Reconcile with the agency ePCR and current protocol before finalizing documentation.",
  ].join("\n"),[entries,incident,provider]);
  const share=async()=>{try{if(navigator.share)await navigator.share({title:"Medication encounter report",text});else await navigator.clipboard.writeText(text);queueCalculationReport("shared",entries);setStatus("Shared. A calculation copy was queued for the secure admin log.")}catch(e){if((e as Error).name!=="AbortError")setStatus("Sharing unavailable. Use Print / PDF.")}};
  const email=()=>{
    const subject=incident.trim()?`Medication encounter report — ${incident.trim()}`:"Medication encounter report";
    queueCalculationReport("shared",entries);
    setStatus("Opening an email draft with the report. A calculation copy was queued for the secure admin log.");
    window.location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  };
  const printOrSave=()=>{queueCalculationReport("printed_or_saved",entries);setStatus("A calculation copy was queued for the secure admin log.");window.print()};
  const deleteWithoutSaving=()=>{if(window.confirm("Delete this report and all recorded administrations from this device? This cannot be undone."))onDelete()};

  return <div className="encounter-report-backdrop"><section className="encounter-report-modal" role="dialog" aria-modal="true">
    <header><span><small>ONE ENCOUNTER • {entries.length} ADMINISTRATION{entries.length===1?"":"S"}</small><h2>Medication report</h2></span><button onClick={close}>×</button></header>
    <div className="encounter-report-inputs"><label>Incident / ePCR number<input value={incident} onChange={e=>setIncident(e.target.value)} placeholder="Optional"/></label><label>Provider identifier<input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="Optional"/></label></div>
    <article className="encounter-print" id="encounter-print">
      <header><b>Metro Med Dose</b><span>Encounter medication report</span></header>
      <div className="encounter-print-meta"><span><small>Created</small><b>{new Date().toLocaleString()}</b></span><span><small>Incident / ePCR</small><b>{incident||"Not entered"}</b></span><span><small>Provider</small><b>{provider||"Not entered"}</b></span><span><small>Status</small><b>{entries.length} recorded administration{entries.length===1?"":"s"}</b></span></div>
      <h3>Medication administration history</h3>
      <div className="encounter-entry-list">{entries.map((entry,index)=><ReportEntry entry={entry} index={index} key={`${entry.time}-${index}`}/>)}</div>
      <footer>Clinical decision-support record only • Verify physical medication, concentration, route, current agency protocol and ePCR.</footer>
    </article>
    <p className="encounter-admin-copy-notice">When you share or print/save, the calculation details are sent to the secure administrator log for quality review. The incident/ePCR number and provider identifier are not sent.</p>
    <div className="encounter-report-actions">
      <button onClick={email}>Email report</button>
      <button className="secondary" onClick={share}>More sharing options</button>
      <button className="secondary" onClick={printOrSave}>Print / save PDF</button>
      <button className="delete-report" onClick={deleteWithoutSaving}>Delete without saving</button>
    </div>{status&&<p>{status}</p>}
  </section></div>;
}

function fmt(n:number){const d=Math.abs(n)>0&&Math.abs(n)<1?3:2;return Number(n.toFixed(d)).toString()}
function volumeLabel(entry:RecordedAdministration){return `${fmt(entry.volume)} ${entry.volumeUnit||"mL"}`}

function ReportEntry({entry,index}:{entry:RecordedAdministration;index:number}){
  const math=calculationMath(entry),showConcentration=entry.concentrationRequired??looksLikeConcentration(entry.concentration);
  return <section className="encounter-entry">
    <header><span><small>ADMINISTRATION {index+1}</small><b>{entry.drug}</b></span><time>{new Date(entry.time).toLocaleString()}</time></header>
    <div className="encounter-entry-grid">
      <Detail label="Indication" value={entry.reason}/><Detail label="Route" value={entry.route}/>
      {showConcentration&&<Detail label="Concentration" value={entry.concentration}/>}<Detail label="Patient" value={entry.patient||"No patient detail recorded"}/>
      <Detail label="Safety" value={entry.safety||"Safety selection not retained in this earlier entry"}/>
      {entry.administration&&<Detail label="How to give" value={entry.administration}/>}
      {entry.repeat&&<Detail label="Repeat / reassess" value={entry.repeat}/>}
      {entry.protocol&&<Detail label="Protocol" value={entry.protocol}/>}
      {entry.baseAuthorization&&<Detail label="Base authorization" value={`${entry.baseAuthorization.physician} • ${new Date(entry.baseAuthorization.time).toLocaleString()} • ${entry.baseAuthorization.reason}`}/>}
      {entry.adjustment&&<Detail label="Dose adjustment" value={entry.adjustment}/>}
    </div>
    <div className="encounter-entry-result"><span><small>FINAL DOSE</small><b>{fmt(entry.dose)} {entry.unit}</b></span>{entry.volume>0&&<span><small>{entry.volumeUnit==="mL/hr"?"FINAL RATE":"FINAL VOLUME"}</small><b>{volumeLabel(entry)}</b></span>}</div>
    {math.length>0&&<div className="encounter-entry-math"><small>CALCULATION MATH</small>{math.map((line,i)=><p key={i}>{line}</p>)}</div>}
    {!!entry.monitoring?.length&&<div className="encounter-entry-monitoring"><small>MONITORING / DETAILS</small><ul>{entry.monitoring.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
  </section>;
}

function Detail({label,value}:{label:string;value:string}){return <span><small>{label}</small><b>{value}</b></span>}

function calculationMath(entry:RecordedAdministration){
  if(entry.calculationMath?.length)return entry.calculationMath;
  if(!(entry.volume>0)||!looksLikeConcentration(entry.concentration))return[];
  return [`${fmt(entry.dose)} ${entry.unit} ÷ ${entry.concentration} = ${volumeLabel(entry)}`];
}

function looksLikeConcentration(value:string){return /(?:\/\s*mL|\/mL|%)/i.test(value)}

function reportEntryText(entry:RecordedAdministration,index:number){
  const lines=[
    `${index+1}. ${entry.drug}`,
    `Time: ${new Date(entry.time).toLocaleString()}`,
    `Indication: ${entry.reason}`,
    `Route: ${entry.route}`,
    `Patient: ${entry.patient||"No patient detail recorded"}`,
    `Safety: ${entry.safety||"Safety selection not retained in this earlier entry"}`,
    ...(entry.concentrationRequired??looksLikeConcentration(entry.concentration)?[`Concentration: ${entry.concentration}`]:[]),
    ...(entry.administration?[`How to give: ${entry.administration}`]:[]),
    ...(entry.repeat?[`Repeat / reassess: ${entry.repeat}`]:[]),
    ...(entry.protocol?[`Protocol: ${entry.protocol}`]:[]),
    ...(entry.baseAuthorization?[`Base authorization: ${entry.baseAuthorization.physician} at ${new Date(entry.baseAuthorization.time).toLocaleString()} — ${entry.baseAuthorization.reason}`]:[]),
    ...(entry.adjustment?[`Dose adjustment: ${entry.adjustment}`]:[]),
    `Final dose: ${fmt(entry.dose)} ${entry.unit}`,
    ...(entry.volume>0?[`${entry.volumeUnit==="mL/hr"?"Final rate":"Final volume"}: ${volumeLabel(entry)}`]:[]),
    ...calculationMath(entry).map((line,i)=>`Math ${i+1}: ${line}`),
    ...(entry.monitoring?.map(item=>`Monitoring/detail: ${item}`)||[]),
  ];
  return lines.join("\n");
}
