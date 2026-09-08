import {useEffect,useMemo,useState} from "react";
import type {RecordedAdministration} from "./encounterTypes";
import {errorMessage,neonAdminClient} from "./neonAdmin";
import "./adminCalculationLog.css";

type CalculationReportRow={
  report_id:string;
  event_type:"shared"|"printed_or_saved";
  entries:RecordedAdministration[];
  entry_count:number;
  client_created_at:string;
  release_version:number|null;
  protocol_revision:string|null;
  created_at:string;
  reviewed_at:string|null;
  reviewed_by:string|null;
  review_note:string|null;
};

export default function AdminCalculationLog({reviewer,close}:{reviewer:string;close:()=>void}){
  const [rows,setRows]=useState<CalculationReportRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[showReviewed,setShowReviewed]=useState(false),[busy,setBusy]=useState("");
  const load=async()=>{
    setLoading(true);setError("");
    const {data,error:loadError}=await neonAdminClient.from("calculation_reports").select("report_id,event_type,entries,entry_count,client_created_at,release_version,protocol_revision,created_at,reviewed_at,reviewed_by,review_note").order("created_at",{ascending:false}).limit(250);
    if(loadError)setError(errorMessage(loadError,"Unable to load the calculation log."));
    else setRows((data||[]) as CalculationReportRow[]);
    setLoading(false);
  };
  useEffect(()=>{void load()},[]);
  const visible=useMemo(()=>showReviewed?rows:rows.filter(row=>!row.reviewed_at),[rows,showReviewed]);
  const review=async(reportId:string)=>{
    setBusy(reportId);setError("");
    const reviewedAt=new Date().toISOString();
    const {error:updateError}=await neonAdminClient.from("calculation_reports").update({reviewed_at:reviewedAt,reviewed_by:reviewer}).eq("report_id",reportId);
    if(updateError)setError(errorMessage(updateError,"Unable to mark this calculation reviewed."));
    else setRows(items=>items.map(item=>item.report_id===reportId?{...item,reviewed_at:reviewedAt,reviewed_by:reviewer}:item));
    setBusy("");
  };
  return <div className="admin-calculation-log-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><section className="admin-calculation-log" role="dialog" aria-modal="true" aria-labelledby="calculation-log-heading">
    <header><div><small>QUALITY REVIEW</small><h2 id="calculation-log-heading">Calculation log</h2><p>{rows.filter(row=>!row.reviewed_at).length} awaiting review • most recent 250 reports</p></div><button aria-label="Close" onClick={close}>×</button></header>
    <div className="admin-calculation-log-tools"><label><input type="checkbox" checked={showReviewed} onChange={event=>setShowReviewed(event.target.checked)}/> Show reviewed reports</label><button onClick={()=>void load()} disabled={loading}>Refresh</button></div>
    {error&&<div className="admin-calculation-log-error" role="alert">{error}</div>}
    {loading?<p className="admin-calculation-log-empty">Loading calculation reports…</p>:visible.length===0?<p className="admin-calculation-log-empty">{showReviewed?"No calculation reports have been received.":"No calculations are awaiting review."}</p>:<div className="admin-calculation-log-list">{visible.map(row=><article key={row.report_id} className={row.reviewed_at?"reviewed":"new"}>
      <header><span><b>{row.entry_count} medication administration{row.entry_count===1?"":"s"}</b><small>{new Date(row.created_at).toLocaleString()} • {row.event_type==="shared"?"Shared":"Printed / saved"}</small></span><em>{row.reviewed_at?"Reviewed":"Needs review"}</em></header>
      <div className="admin-calculation-log-meta"><span><small>Calculated on device</small><b>{new Date(row.client_created_at).toLocaleString()}</b></span><span><small>Release</small><b>{row.release_version?`Release ${row.release_version}`:"Built-in"}{row.protocol_revision?` • ${row.protocol_revision}`:""}</b></span><span><small>Privacy</small><b>Incident and provider identifiers excluded</b></span></div>
      <div className="admin-calculation-entry-list">{row.entries.map((entry,index)=><div key={`${entry.time}-${index}`}><span><b>{entry.drug}</b><small>{entry.reason}</small></span><span><b>{format(entry.dose)} {entry.unit}{entry.volume?` • ${format(entry.volume)} ${entry.volumeUnit||"mL"}`:""}</b><small>{entry.route} • {entry.concentration}</small></span></div>)}</div>
      {row.reviewed_at?<p className="admin-calculation-reviewed">Reviewed {new Date(row.reviewed_at).toLocaleString()} by {row.reviewed_by}</p>:<button className="admin-calculation-review-button" disabled={busy===row.report_id} onClick={()=>void review(row.report_id)}>{busy===row.report_id?"Saving…":"Mark reviewed"}</button>}
    </article>)}</div>}
  </section></div>;
}

function format(value:number){return Number(value.toFixed(Math.abs(value)>0&&Math.abs(value)<1?3:2)).toString()}
