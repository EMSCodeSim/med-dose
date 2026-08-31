import type {ReactNode} from "react";

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
  repeatAction?:{enabled:boolean;label:string;text:string;detail?:string;onGive:()=>void}|null;
  infusionContent?:ReactNode;
};

export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive,repeat,recorded,repeatAction,infusionContent}:Props){
  return <section className="shared-fentanyl-dashboard final-dose-card" aria-label={`Final ${medication} dose`}>
    <section className={ready?"dashboard-primary-dose ready":"dashboard-primary-dose pending"}>
      <small>FINAL DOSE</small>
      {previewReady?<>
        {recorded?<div className="dashboard-dose-given"><small>DOSE {recorded.count} GIVEN</small><strong>✓ {recorded.detail}</strong></div>:<div className="dashboard-dose-answer"><strong>GIVE {dose||"—"}</strong>{volume&&<span>DRAW <b>{volume}</b></span>}</div>}
        {infusionContent}
        {doseDetail&&<p>{doseDetail}</p>}
        {!recorded&&showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}
      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}
    </section>
    {previewReady&&recorded&&<section className={`final-next-dose repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`} aria-live="polite">
      <span><small>NEXT DOSE</small><strong>{repeat.nextDose||repeat.value}</strong></span>
      <span><small>{repeat.state==="running"?"AVAILABLE IN":"STATUS"}</small><b>{repeat.value}</b></span>
      <p>{repeat.detail}</p>
      {repeatAction&&<button type="button" className="dashboard-next-dose-action" disabled={!repeatAction.enabled} onClick={repeatAction.onGive}><small>{repeatAction.label}</small><strong>{repeatAction.text}</strong>{repeatAction.detail&&<span>{repeatAction.detail}</span>}</button>}
    </section>}
  </section>;
}
