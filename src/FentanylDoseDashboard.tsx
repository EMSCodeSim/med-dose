import DoseSyringe from "./DoseSyringe";

type Props={
  medication:string;
  route?:string;
  ready:boolean;
  previewReady:boolean;
  dose:string;
  volume?:string;
  doseDetail?:string;
  secondaryDetail?:string;
  math?:string;
  mathDetails?:string[];
  showMath:boolean;
  setShowMath:(show:boolean)=>void;
  syringeVolume?:number;
  instructions?:{label:string;value:string;wide?:boolean}[];
  correction?:{title:string;detail:string;action:string;onClick:()=>void}|null;
  giveLabel?:string;
  giveText:string;
  giveDetail?:string;
  giveDisabled:boolean;
  showGiveAction?:boolean;
  onGive:()=>void;
  repeat:{label:string;value:string;detail:string;nextDose?:string;state?:"running"|"unavailable"|"ready"};
  recorded?:{count:number;detail:string}|null;
};

export default function FentanylDoseDashboard({medication,route,ready,previewReady,dose,volume,doseDetail,secondaryDetail,math,mathDetails=[],showMath,setShowMath,syringeVolume,instructions=[],correction,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive,repeat,recorded}:Props){
  return <section className="versed-dashboard shared-fentanyl-dashboard" aria-label={`Live ${medication} dose and repeat information`}>
    <header className="administration-area-heading"><small>DRUG ADMINISTRATION</small><b>{medication}</b><span>{route||"Route pending"}</span></header>
    <section className={ready?"dashboard-primary-dose ready":"dashboard-primary-dose pending"}>
      <small>DOSE AND AMOUNT TO GIVE</small>
      {previewReady?<><div className="dashboard-dose-answer"><strong>{dose||"—"}</strong>{volume&&<span>Draw <b>{volume}</b></span>}{secondaryDetail&&<em>{secondaryDetail}</em>}</div>{doseDetail&&<p>{doseDetail}</p>}</>:<strong className="dashboard-dose-pending">Complete required checks</strong>}
    </section>
    {previewReady&&math&&<section className="dose-math-control"><button type="button" aria-expanded={showMath} onClick={()=>setShowMath(!showMath)}>{showMath?"Hide math":"Show math"} <span>{showMath?"−":"+"}</span></button>{showMath&&<div className="dose-math-box"><small>DOSE CALCULATION</small><b>{math}</b>{mathDetails.map(item=><span key={item}>{item}</span>)}</div>}</section>}
    {previewReady&&syringeVolume!==undefined&&syringeVolume>=0&&<DoseSyringe volume={syringeVolume}/>} 
    {previewReady&&instructions.length>0&&<section className="administration-special"><small>SPECIAL INSTRUCTIONS</small><div>{instructions.map(item=><span key={`${item.label}-${item.value}`} className={item.wide?"wide":undefined}><b>{item.label}</b>{item.value}</span>)}</div></section>}
    {correction&&<button className="dashboard-required" onClick={correction.onClick}><b>{correction.title}</b><span>{correction.detail}</span><i>{correction.action} ›</i></button>}
    {showGiveAction&&<button className="dashboard-give-now" disabled={giveDisabled} onClick={onGive}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}
    <section className={`dashboard-timer repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`}><small>{repeat.label}</small><strong>{repeat.value}</strong><span>{repeat.detail}</span>{repeat.nextDose&&<b className="next-dose-field">{repeat.nextDose}</b>}</section>
    {recorded&&<div className="dashboard-recorded"><b>✓ {recorded.count} dose{recorded.count===1?"":"s"} recorded</b><span>{recorded.detail}</span></div>}
  </section>;
}
