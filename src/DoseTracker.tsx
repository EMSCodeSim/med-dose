import {useEffect,useState} from "react";

type Drug = "fentanyl" | "midazolam" | "adenosine" | "magnesium" | "epinephrine";
type Entry = { dose: number; volume: number; time: number };

export default function DoseTracker({entries,unit,total,totalVolume,maxTotal,repeatsLeft,repeatMinutes,secondsLeft,nextDose,concentration,drug,reason,route,intranasal,record,openEndedRepeats=false}:{entries:Entry[];unit:string;total:number;totalVolume:number;maxTotal:number;repeatsLeft:number;repeatMinutes:number;secondsLeft:number;nextDose:number;concentration:number;drug:Drug;reason:string;route:string;intranasal:boolean;record:(dose:number)=>void;openEndedRepeats?:boolean}) {
  const started=entries.length>0,due=started&&secondsLeft===0;
  const [actual,setActual]=useState(String(nextDose));
  const [editing,setEditing]=useState(false);
  useEffect(()=>{setActual(String(nextDose));setEditing(false)},[entries.length,nextDose]);
  const amount=Number(actual),amountOk=amount>0&&amount<=nextDose,volume=amountOk?amount/concentration:0;
  const doseText=(value:number)=>drug==="magnesium"&&value>=1000?`${fmt(value)} mg (${fmt(value/1000)} g)`:`${fmt(value)} ${unit}`;
  const need=reason==="Status epilepticus"?"only if the patient is still seizing":"only if reassessment shows it is still clinically indicated";
  const editor=editing?<div className="partial-dose compact-editor"><div className="partial-head"><span><small>ACTUAL AMOUNT GIVEN</small><b>Maximum {fmt(nextDose)} {unit}</b></span></div><label><span>Enter amount</span><div><input autoFocus inputMode="decimal" value={actual} onChange={e=>setActual(e.target.value)} aria-label={`Actual dose given in ${unit}`}/><b>{unit}</b></div></label>{amountOk?<div className="actual-volume"><span>Volume to record</span><strong>{fmt(volume)} mL{intranasal?` • ${fmt(volume/2)} mL/nostril`:""}</strong></div>:<div className="partial-error" role="alert">Enter more than 0 and no more than {fmt(nextDose)} {unit}.</div>}</div>:null;
  const recordButton=<button className="record-dose" disabled={!amountOk} onClick={()=>record(amount)}>Record {amountOk?`${fmt(amount)} ${unit} • ${fmt(volume)} mL`:`dose`} given now</button>;
  const initialRecordButton=<button className="initial-record-dose" disabled={!amountOk} onClick={()=>record(amount)} aria-label={amountOk?`Give ${fmt(amount)} ${unit}, draw ${fmt(volume)} milliliters by ${route}, and record given now`:"Enter a valid dose before recording"}>
    <span><small>INITIAL DOSE</small><b>{route}</b></span>
    <strong>{amountOk?<>GIVE {doseText(amount)} = DRAW {fmt(volume)} mL</>:"ENTER A VALID DOSE"}</strong>
    {amountOk&&intranasal&&<span className="nostril-split">SPLIT {fmt(volume/2)} mL PER NOSTRIL</span>}
    <em>Tap to record given now</em>
  </button>;
  return <section className={`dose-tracker ${started?"has-doses":"first-dose"}`} aria-live="polite">
    {started&&<div className="tracker-head"><span><small>ADMINISTRATION</small><h2>Dose tracker</h2></span><b>{repeatsLeft} repeat{repeatsLeft===1?"":"s"} available</b></div>}
    {!started?<>
      {editor}
      {initialRecordButton}
      <button className="adjust-amount" onClick={()=>{if(editing)setActual(String(nextDose));setEditing(!editing)}}>{editing?"Use calculated dose":"Change amount given"}</button>
      <div className="compact-limit">{openEndedRepeats?<>Repeat limit: <b>Not specified in DMP 9120</b></>:<>Protocol dose limit: <b>{doseText(maxTotal)}</b></>}</div>
    </>:<>
      <div className="tracker-stats"><span><small>TOTAL GIVEN</small><strong>{fmt(total)} {unit}</strong></span><span><small>TOTAL VOLUME</small><strong>{fmt(totalVolume)} mL</strong></span><span><small>DMP LIMIT</small><strong>{openEndedRepeats?"Not stated":`${fmt(maxTotal)} ${unit}`}</strong></span></div>
      <div className="dose-log">{entries.map((x,i)=><div key={x.time}><b>Dose {i+1}</b><span>{fmt(x.dose)} {unit} • {fmt(x.volume)} mL</span><time>{new Date(x.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</time></div>)}</div>
      {repeatsLeft>0?<div className="repeat-panel"><p><b>Reassess first.</b> Repeat {need}. Wait at least {repeatMinutes} minutes from the last recorded dose.</p><div className="next-repeat"><span><small>MAXIMUM NEXT DOSE</small><b>{fmt(nextDose)} {unit} = {fmt(nextDose/concentration)} mL{intranasal?` • ${fmt(nextDose/concentration/2)} mL/nostril`:""}</b></span>{drug==="fentanyl"&&nextDose<entries[0].dose&&<em>Reduced to stay within cumulative maximum</em>}</div>{due&&<>{editor}{recordButton}<button className="adjust-amount" onClick={()=>{if(editing)setActual(String(nextDose));setEditing(!editing)}}>{editing?"Use maximum next dose":"Change amount given"}</button></>} {!due&&<button className="record-dose" disabled>Repeat available in {Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,"0")}</button>}</div>:<div className="limit-reached" role="alert"><b>PROTOCOL LIMIT REACHED</b><span>No standing-order doses remain. Contact Base before any additional dose.</span></div>}
    </>}
    {started&&<p className="tracker-foot">Recorded totals support documentation but do not replace reassessment or the ePCR.</p>}
  </section>
}

function fmt(n:number){return Number.isFinite(n)?Number(n.toFixed(2)).toString():"—"}
