import type {ReactNode} from "react";
import CalculationBoard, {type CalculationBox} from "./CalculationBoard";
import "./medicationBuilderShell.css";

export type MedicationReference={
  name:string;
  subtitle?:string;
  protocolId?:string;
  vialLabel?:string;
};

type Props={
  medication:MedicationReference;
  boxes:CalculationBox[];
  close:()=>void;
  reset?:()=>void;
  children:ReactNode;
  leftTools?:ReactNode;
  calculationComplete?:boolean;
  ariaLabel?:string;
};

export default function MedicationBuilderShell({medication,boxes,close,reset,children,leftTools,calculationComplete=false,ariaLabel}:Props){
  const reference=<aside className="medication-builder-reference" aria-label={`${medication.name} reference`}>
    <div className="medication-builder-vial"><small>{(medication.vialLabel||medication.name).toUpperCase()}</small><b>Rx</b><span>MEDICATION</span></div>
    <span><small>SELECTED MEDICATION</small><b>{medication.name}</b>{medication.subtitle&&<em>{medication.subtitle}</em>}{medication.protocolId&&<i>DMP {medication.protocolId}</i>}</span>
  </aside>;
  return <main className="medication-builder" aria-label={ariaLabel||`${medication.name} calculator`}>
    <div className="medication-builder-top"><button className="drug-back-button" onClick={close}>‹ Back to medications</button><span>{medication.name.toUpperCase()}</span><button onClick={reset||close}>Start over</button></div>
    <div className={`medication-builder-layout${calculationComplete?" calculation-complete":""}`}>
      <header className="medication-builder-banner">{reference}</header>
      <aside className="medication-builder-left" aria-label="Calculation controls"><CalculationBoard boxes={boxes} className="medication-builder-status-board"/>{leftTools&&<div className="medication-builder-left-tools">{leftTools}</div>}</aside>
      <section className="medication-builder-workspace">{reference}{children}</section>
    </div>
  </main>;
}
