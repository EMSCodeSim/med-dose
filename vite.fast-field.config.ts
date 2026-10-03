import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

/** Production field workflow. Concentration/formulation is one dedicated step. */
const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx"))return null;
    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;
    if(code.includes('sessionStorage.getItem("mmd-patient")'))throw new Error("MedicationEngine must not carry patient data between calculations");
    const replaceIfPresent=(oldValue:string,newValue:string)=>{if(code.includes(oldValue))code=code.replace(oldValue,newValue)};

    replaceIfPresent('ageRequired=ageChangesDose&&path?.patient!=="adult"','ageRequired=ageChangesDose');

    // Concentration has already been explicitly confirmed on its own screen.
    // Do not repeat it inside the contraindication/safety checklist.
    const passiveSafetyConcentration='{agentNeedsConcentration&&<div className="safety-concentration-check"><b>CONCENTRATION CHECK</b><span>Default: {defaultConcentrationText} • In hand: {usedConcentrationText}</span>{concentrationChanged&&<strong role="alert">NON-DEFAULT CONCENTRATION — verify the physical medication label before administration.</strong>}</div>}';
    replaceIfPresent(passiveSafetyConcentration,'');

    replaceIfPresent('    else if(safetyChanged||contraindications.length||applicableSpecialChecks(nextPath).length||nextPath.baseContact)setStep("safety");\n    else{setReturnToResult(false);setStep("result")}\n  };','    else setStep("safety");\n  };');
    replaceIfPresent('else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};','else setStep("safety")}};');

    replaceIfPresent('nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined','nextDose:showingLinkedDose?`${fmt(linkedAmount)} ${linkedDose?.unit}`:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined');

    const timerOld='repeatTimerMinutes=path?.linkedDose?.afterMinutes||path?.titrationStepMinutes||path?.repeatAfterMinutes,secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
    const timerNew='documentedInfusionMinutes=path&&/infusion|drip/i.test(`${selectedRoute} ${path.administration}`)?Number(path.administration.match(/(?:over|for)\\s+(\\d+(?:\\.\\d+)?)\\s*minutes?/i)?.[1]||0):0,infusionRepeatMinimum=documentedInfusionMinutes>0?documentedInfusionMinutes+5:0,repeatTimerMinutes=Math.max(path?.linkedDose?.afterMinutes||0,path?.titrationStepMinutes||0,path?.repeatAfterMinutes||0,infusionRepeatMinimum),secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
    replaceIfPresent(timerOld,timerNew);
    replaceIfPresent('detail:secondsLeft?"Repeat button unlocks when the medication-specific interval is complete.":"Tap to record the next dose using the current medication-specific limit."','detail:secondsLeft?(infusionRepeatMinimum>0?`Infusion/reassessment lockout: ${documentedInfusionMinutes} min infusion + 5 min reassessment. Next drip cannot start until the countdown reaches zero.`:"Repeat button unlocks when the medication-specific interval is complete."):"Tap to record the next dose using the current medication-specific limit."');
    return {code,map:null};
  },
};

const base=fieldReleaseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),fastFieldWorkflow]});
