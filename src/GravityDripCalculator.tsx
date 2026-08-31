import {useEffect,useMemo,useState} from "react";
import "./gravityDripCalculator.css";

type Props={
  administration:string;
  route:string;
  calculatedMlHr?:number;
  primary?:boolean;
};

export default function GravityDripCalculator({administration,route,calculatedMlHr,primary=false}:Props){
  const parsedMinutes=useMemo(()=>{
    const text=`${administration} ${route}`;
    const match=text.match(/(?:over|in)\s+(\d+(?:\.\d+)?)\s*(?:min|minute)/i);
    return match?Number(match[1]):0;
  },[administration,route]);
  const [dropFactor,setDropFactor]=useState(60);
  const [preparedVolume,setPreparedVolume]=useState("");
  const [minutes,setMinutes]=useState(parsedMinutes?String(parsedMinutes):"");
  useEffect(()=>{setMinutes(parsedMinutes?String(parsedMinutes):"");setPreparedVolume("")},[parsedMinutes,administration,route]);

  const volume=Number(preparedVolume),duration=Number(minutes);
  const derivedMlHr=calculatedMlHr&&calculatedMlHr>0?calculatedMlHr:volume>0&&duration>0?volume/duration*60:0;
  const gttMin=derivedMlHr>0?derivedMlHr*dropFactor/60:0;

  return <section className={`gravity-drip-calculator ${primary?"primary-infusion":""}`} aria-label="Gravity drip rate calculator">
    <header><span><small>IV DRIP / INFUSION</small><b>{primary?"Administration rate":"Gravity drip rate"}</b></span>{derivedMlHr>0&&<strong>{fmt(gttMin)} drops/min</strong>}</header>
    {!calculatedMlHr&&<div className="gravity-prep-inputs">
      <label><span>Final prepared volume</span><div><input inputMode="decimal" value={preparedVolume} onChange={e=>setPreparedVolume(e.target.value)} placeholder="mL"/><b>mL</b></div></label>
      <label><span>Infusion time</span><div><input inputMode="decimal" value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="min"/><b>min</b></div></label>
    </div>}
    {!calculatedMlHr&&<p className="gravity-confirm-note">Enter the final prepared solution volume. Do not use the medication draw volume unless that is the complete volume being infused.</p>}
    <div className="gravity-drop-sets"><small>DRIP SET</small><div>{[10,15,20,60].map(x=><button type="button" key={x} className={dropFactor===x?"selected":""} onClick={()=>setDropFactor(x)}>{x}<span>gtt/mL</span></button>)}</div></div>
    {derivedMlHr>0?<><div className="gravity-primary-lines">{volume>0&&<span><small>IN</small><b>{fmt(volume)} mL</b></span>}{duration>0&&<span><small>OVER</small><b>{fmt(duration)} min</b></span>}<span><small>PUMP</small><b>{fmt(derivedMlHr)} mL/hr</b></span></div><div className="gravity-results"><span className="primary"><small>GRAVITY RATE</small><b>{fmt(gttMin)} drops/min</b></span></div></>:<div className="gravity-awaiting">Confirm prepared volume and infusion time to calculate the gravity rate.</div>}
  </section>;
}

function fmt(n:number){return Number.isFinite(n)?Number(n.toFixed(n<10?2:1)).toString():"—"}
