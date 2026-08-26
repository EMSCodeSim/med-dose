import "./calculationBoard.css";

export type CalculationBox={id:string;label:string;value:string;detail?:string;complete:boolean;notRequired?:boolean;active?:boolean;available?:boolean;onClick?:()=>void};

export default function CalculationBoard({boxes,className=""}:{boxes:CalculationBox[];className?:string}){
  return <section className={`fixed-calculation-board ${className}`} aria-label="Medication calculation checks">
    <header><small>LIVE CALCULATION</small><b>Tap any green box to change it</b><span><i/> Complete or not required <em/> Check required</span></header>
    <div>{boxes.map(box=><button key={box.id} type="button" className={`${box.complete||box.notRequired?"complete":"required"}${box.active?" active":""}`} disabled={box.available===false} onClick={box.onClick}>
      <small>{box.label}</small><b>{box.complete?box.value:box.notRequired?"Not required":"Check required"}</b><span>{box.complete?(box.detail||"Checked"):box.notRequired?"No check required":box.detail||"Complete this check"}</span><i>{box.complete||box.notRequired?"✓":"!"}</i>
    </button>)}</div>
  </section>;
}
