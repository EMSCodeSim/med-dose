import "./calculationBoard.css";

export type CalculationQuickChoice={label:string;selected?:boolean;disabled?:boolean;onClick:()=>void};
export type CalculationBox={id:string;label:string;value:string;detail?:string;complete:boolean;notRequired?:boolean;active?:boolean;available?:boolean;onClick?:()=>void;quickChoices?:CalculationQuickChoice[]};

export default function CalculationBoard({boxes,className=""}:{boxes:CalculationBox[];className?:string}){
  return <section className={`fixed-calculation-board ${className}`} aria-label="Medication calculation checks">
    <header><small>LIVE CALCULATION</small><b>Tap a box to open or edit it</b><span><i/> Complete <em/> Required</span></header>
    <div>{boxes.map(box=>{
      const upcoming=box.available===false,status=box.complete||box.notRequired?"complete":upcoming?"upcoming":"required",interactive=!upcoming&&typeof box.onClick==="function";
      const open=()=>{if(interactive)box.onClick?.()};
      return <section
        key={box.id}
        className={`calculation-box ${status}${box.active?" active":""}${interactive?" interactive":""}`}
        onClick={open}
        onKeyDown={event=>{if(interactive&&(event.key==="Enter"||event.key===" ")){event.preventDefault();open()}}}
        role={interactive?"button":undefined}
        tabIndex={interactive?0:undefined}
        aria-label={interactive?`${box.label}: ${box.complete?box.value:box.detail||"check required"}. Tap to open.`:undefined}
      >
        <button type="button" className={`calculation-box-main ${status}${box.active?" active":""}`} disabled={!interactive} onClick={event=>{event.stopPropagation();open()}}>
          <small>{box.label}</small><b>{box.complete?box.value:box.notRequired?"Auto-filled":upcoming?"Upcoming":"Check required"}</b><span>{box.complete?(box.detail||"Checked"):box.notRequired?(box.detail||"No check required"):box.detail||"Complete this check"}</span><i>{box.complete||box.notRequired?"✓":upcoming?"·":"!"}</i>
        </button>
        {!!box.quickChoices?.length&&!upcoming&&<div className="calculation-quick" aria-label={`${box.label} quick choices`}>{box.quickChoices.map(choice=><button key={choice.label} type="button" className={choice.selected?"selected":""} disabled={choice.disabled} onClick={event=>{event.stopPropagation();choice.onClick()}}>{choice.label}</button>)}</div>}
      </section>
    })}</div>
  </section>;
}