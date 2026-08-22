import {useEffect,useState} from "react";

type Drug = "fentanyl" | "midazolam" | "adenosine";
type Entry = { dose: number; volume: number; time: number };

export default function DoseTracker({entries,unit,total,totalVolume,maxTotal,repeatsLeft,repeatMinutes,secondsLeft,nextDose,concentration,drug,reason,record}:{entries:Entry[];unit:string;total:number;totalVolume:number;maxTotal:number;repeatsLeft:number;repeatMinutes:number;secondsLeft:number;nextDose:number;concentration:number;drug:Drug;reason:string;record:(dose:number)=>void}) {
  const started=entries.length>0,due=started&&secondsLeft===0;
  const [actual,setActual]=useState(String(nextDose));
  useEffect(()=>setActual(String(nextDose)),[entries.length,nextDose]);
  const amount=Number(actual),amountOk=amount>0&&amount<=nextDose,volume=amountOk?amount/concentration:0;
  const need=reason==="Seizure"?"only if the patient is still seizing":"only if reassessment shows it is still clinically indicated";
  const chooser=<div className="partial-dose"><div className="partial-head"><span><small>ACTUAL AMOUNT GIVEN</small><b>Maximum this dose: {fmt(nextDose)} {unit}</b></span></div><label><span>Enter actual dose</span><div><input inputMode="decimal" value={actual} onChange={e=>setActual(e.target.value)} aria-label={`Actual dose given in ${unit}`}/><b>{unit}</b></div></label>{amountOk?<div className="actual-volume"><span>Actual volume</span><strong>{fmt(volume)} mL</strong></div>:<div className="partial-error" role="alert">Enter an amount greater than 0 and no more than {fmt(nextDose)} {unit}.</div>}</div>;
  return <section className="dose-tracker" aria-live="polite">
    <div className="tracker-head"><span><small>ADMINISTRATION TRACKER</small><h2>Record doses as they are given</h2></span><b>{started?repeatsLeft:"—"} repeat{repeatsLeft===1?"":"s"} available</b></div>
    <div className="tracker-stats"><span><small>TOTAL GIVEN</small><strong>{fmt(total)} {unit}</strong></span><span><small>TOTAL VOLUME</small><strong>{fmt(totalVolume)} mL</strong></span><span><small>DMP LIMIT</small><strong>{fmt(maxTotal)} {unit}</strong></span></div>
    {entries.length>0&&<div className="dose-log">{entries.map((x,i)=><div key={x.time}><b>Dose {i+1}</b><span>{fmt(x.dose)} {unit} • {fmt(x.volume)} mL</span><time>{new Date(x.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</time></div>)}</div>}
    {!started?<>{chooser}<button className="record-dose" disabled={!amountOk} onClick={()=>record(amount)}>Record {amountOk?`${fmt(amount)} ${unit} • ${fmt(volume)} mL`:"dose"} given now</button></>:repeatsLeft>0?<div className="repeat-panel"><p><b>Reassess first.</b> Repeat {need}. Wait at least {repeatMinutes} minutes from the last recorded dose.</p><div className="next-repeat"><span><small>MAXIMUM NEXT DOSE</small><b>{fmt(nextDose)} {unit} = {fmt(nextDose/concentration)} mL</b></span>{drug==="fentanyl"&&nextDose<entries[0].dose&&<em>Reduced to stay within cumulative maximum</em>}</div>{due&&chooser}<button className="record-dose" disabled={!due||!amountOk} onClick={()=>record(amount)}>{due?`Record ${amountOk?`${fmt(amount)} ${unit} • ${fmt(volume)} mL`:"repeat dose"} given now`:`Repeat available in ${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`}</button></div>:<div className="limit-reached" role="alert"><b>PROTOCOL LIMIT REACHED</b><span>No standing-order doses remain. Contact Base before any additional dose.</span></div>}
    <p className="tracker-foot">Totals reflect the amounts recorded as actually given. This quick tracker does not replace reassessment or ePCR documentation.</p>
  </section>
}

function fmt(n:number){return Number.isFinite(n)?Number(n.toFixed(2)).toString():"—"}
