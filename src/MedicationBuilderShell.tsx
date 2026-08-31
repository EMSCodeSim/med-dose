import type {ReactNode} from "react";
import CalculationBoard, {type CalculationBox} from "./CalculationBoard";
import "./versedBuilder.css";
import "./versedForm.css";
import "./versedConsole.css";
import "./fentanylBuilder.css";
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
  const reference=<aside className="versed-medication-reference fentanyl-medication-reference unified-medication-reference" aria-label={`${medication.name} reference`}>
    <div className="versed-reference-vial fentanyl-reference-vial unified-reference-vial"><small>{(medication.vialLabel||medication.name).toUpperCase()}</small><b>Rx</b><span>MEDICATION</span></div>
    <span><small>SELECTED MEDICATION</small><b>{medication.name}</b>{medication.subtitle&&<em>{medication.subtitle}</em>}{medication.protocolId&&<em>DMP {medication.protocolId}</em>}</span>
  </aside>;

  return <main className="versed-builder fentanyl-builder unified-medication-builder" aria-label={ariaLabel||`${medication.name} calculator`}>
    <div className="versed-builder-top"><button className="drug-back-button" onClick={close}>‹ Back to medications</button><span>{medication.name.toUpperCase()} FORMAT</span><button onClick={reset||close}>Start over</button></div>
    <div className={`versed-layout${calculationComplete?" calculation-complete":""}`}>
      <header className="builder-medication-banner">{reference}</header>
      <aside className="versed-left-column unified-left-column" aria-label="Calculation controls">
        <CalculationBoard boxes={boxes} className="versed-status-board"/>
        {leftTools&&<div className="versed-left-tools">{leftTools}</div>}
      </aside>
      <section className="unified-medication-workspace">{reference}{children}</section>
    </div>
  </main>;
}
