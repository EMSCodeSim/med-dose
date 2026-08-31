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
  return <main className="versed-builder fentanyl-builder unified-medication-builder streamlined-medication-flow" aria-label={ariaLabel||`${medication.name} calculator`}>
    <div className="versed-builder-top streamlined-medication-top"><button className="drug-back-button" onClick={close}>‹ Medications</button><strong>{medication.name}</strong><button onClick={reset||close}>Start over</button></div>
    <div className={`versed-layout streamlined-medication-layout${calculationComplete?" calculation-complete":""}`}>
      <aside className="versed-left-column unified-left-column streamlined-progress-column" aria-label="Calculation controls"><CalculationBoard boxes={boxes} className="versed-status-board"/>{leftTools&&<div className="versed-left-tools">{leftTools}</div>}</aside>
      <section className="builder-workspace versed-inline-workspace unified-medication-workspace streamlined-choice-workspace" aria-label={`${medication.name} selection workspace`}>{children}</section>
    </div>
  </main>;
}