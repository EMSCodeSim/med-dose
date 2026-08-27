import {useState} from "react";
import "./weightQuickSelect.css";

type Kind="adult"|"pediatric";
type Props={kind:Kind;valueKg:number;onSelect:(kg:number,source:string)=>void};

const adultWeights=[50,60,70,80,90,100,110,120,130];
const ageBands=[
  {label:"6–11 months",kg:6.5},
  {label:"1 year",kg:10},
  {label:"2–3 years",kg:14},
  {label:"4–5 years",kg:19},
  {label:"6–8 years",kg:25},
  {label:"9–10 years",kg:31},
  {label:"11 years",kg:38},
];
const lengthBands=[
  {label:"Grey",kg:4,color:"#7b8790",text:"#fff"},
  {label:"Pink",kg:6.5,color:"#f49bbb",text:"#4c1830"},
  {label:"Red",kg:8.5,color:"#d84040",text:"#fff"},
];

export default function WeightQuickSelect({kind,valueKg,onSelect}:Props){
  const [method,setMethod]=useState<"quick"|"manual"|"age"|"length">(kind==="adult"?"quick":"age"),[manual,setManual]=useState(""),[unit,setUnit]=useState<"kg"|"lb">("kg");
  const manualKg=unit==="kg"?Number(manual):Number(manual)/2.20462;
  const choose=(kg:number,source:string)=>onSelect(kg,source);
  return <section className="weight-quick-select">
    {kind==="adult"?<>
      <div className="weight-method-heading"><small>ESTIMATED ADULT WEIGHT</small><span>Tap the closest estimate</span></div>
      <div className="adult-weight-grid">{adultWeights.map(kg=><button key={kg} className={Math.abs(valueKg-kg)<.01?"selected":""} onClick={()=>{setMethod("quick");choose(kg,"estimated adult weight")}}><b>{kg}</b><span>kg</span></button>)}</div>
      <button className={method==="manual"?"weight-manual-toggle selected":"weight-manual-toggle"} onClick={()=>setMethod("manual")}>Enter a different weight</button>
    </>:<>
      <div className="weight-methods"><button className={method==="manual"?"selected":""} onClick={()=>setMethod("manual")}><b>Measured / estimated</b><span>Enter a known weight</span></button><button className={method==="age"?"selected":""} onClick={()=>setMethod("age")}><b>Age based</b><span>6 months–11 years</span></button><button className={method==="length"?"selected":""} onClick={()=>setMethod("length")}><b>Length based</b><span>Birth–6 months</span></button></div>
      {method==="age"&&<div className="age-weight-grid">{ageBands.map(band=><button key={band.label} className={Math.abs(valueKg-band.kg)<.01?"selected":""} onClick={()=>choose(band.kg,`DMP age-band estimate • ${band.label}`)}><b>{band.label}</b><span>{band.kg} kg</span></button>)}</div>}
      {method==="length"&&<><p className="weight-method-note">Select the length-based color that physically matches the infant.</p><div className="infant-length-grid">{lengthBands.map(band=><button key={band.label} className={Math.abs(valueKg-band.kg)<.01?"selected":""} style={{background:band.color,color:band.text}} onClick={()=>choose(band.kg,`${band.label} length-based band`)}><b>{band.label}</b><span>{band.kg} kg</span></button>)}</div></>}
    </>}
    {method==="manual"&&<div className="manual-weight-entry"><div className="weight-unit-toggle"><button className={unit==="kg"?"selected":""} onClick={()=>{setUnit("kg");setManual("")}}>kg</button><button className={unit==="lb"?"selected":""} onClick={()=>{setUnit("lb");setManual("")}}>lb</button></div><label><span>Patient weight</span><div><input autoFocus inputMode="decimal" value={manual} onChange={event=>setManual(event.target.value)} placeholder="0"/><b>{unit}</b></div></label><button className="use-manual-weight" disabled={!(manualKg>0)} onClick={()=>choose(manualKg,kind==="adult"?"entered adult estimate":"measured / estimated pediatric weight")}>Use {manualKg>0?`${format(manualKg)} kg`:"weight"}</button></div>}
    {valueKg>0&&<div className="selected-calculation-weight"><small>CALCULATION WEIGHT</small><b>{format(valueKg)} kg</b><span>Tap another choice to replace it</span></div>}
  </section>;
}

function format(value:number){return Number(value.toFixed(value<10?1:0)).toString()}
