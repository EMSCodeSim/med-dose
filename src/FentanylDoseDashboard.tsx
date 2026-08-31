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

export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive}:Props){
  return <section className="shared-fentanyl-dashboard final-dose-card" aria-label={`Final ${medication} dose`}>
    <section className={ready?"dashboard-primary-dose ready":"dashboard-primary-dose pending"}>
      <small>FINAL DOSE</small>
      {previewReady?<>
        <div className="dashboard-dose-answer"><strong>GIVE {dose||"—"}</strong>{volume&&<span>DRAW <b>{volume}</b></span>}</div>
        {doseDetail&&<p>{doseDetail}</p>}
        {showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}
      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}
    </section>
  </section>;
}
