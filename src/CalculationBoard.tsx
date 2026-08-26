import "./calculationBoard.css";

export type CalculationBox={id:string;label:string;value:string;detail?:string;complete:boolean;notRequired?:boolean;active?:boolean;available?:boolean;onClick?:()=>void};

export default function CalculationBoard({boxes,className=""}:{boxes:CalculationBox[];className?:string}){
  return <section className={`fixed-calculation-board ${className}`} aria-label="Medication calculation checks">
    <header><small>LIVE CALCULATION</small><b>Tap a box to open or edit it</b><span><i/> Complete <em/> Required</span></header>
    <div>{boxes.map(box=>{const upcoming=box.available===false,status=box.complete||box.notRequired?"complete":upcoming?"upcoming":"required";return <button key={box.id} type="button" className={`${status}${box.active?" active":""}`} disabled={upcoming} onClick={box.onClick}>
      <small>{box.label}</small><b>{box.complete?box.value:box.notRequired?"Not required":upcoming?"Upcoming":"Check required"}</b><span>{box.complete?(box.detail||"Checked"):box.notRequired?"No check required":box.detail||"Complete this check"}</span><i>{box.complete||box.notRequired?"✓":upcoming?"·":"!"}</i>
    </button>})}</div>
  </section>;
}
