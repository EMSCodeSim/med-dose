import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

/**
 * Production field-workflow transforms that have not yet been folded into the
 * shared MedicationEngine source. Keep these transforms small and idempotent.
 * Concentration/formulation selection is intentionally its own workflow step;
 * it must never be injected into the later contraindication/safety screen.
 */
const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx"))return null;
    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;

    if(code.includes('sessionStorage.getItem("mmd-patient")')){
      throw new Error("MedicationEngine must not carry patient data between calculations");
    }

    const replaceIfPresent=(oldValue:string,newValue:string)=>{
      if(code.includes(oldValue))code=code.replace(oldValue,newValue);
    };

    // Every medication starts with an explicit concentration/formulation step.
    replaceIfPresent(
      '[step,setStep]=useState<Step>(()=>medicationAgents.length===1?(medication.paths.some(pathUsesConcentration)?"concentration":"indication"):"medication")',
      '[step,setStep]=useState<Step>(()=>medicationAgents.length===1?"concentration":"medication")'
    );
    replaceIfPresent(
      'const paths=medication.paths.filter(p=>p.agent===x);if(paths.some(pathUsesConcentration))setStep("concentration");else if(paths.length===1)choosePath(paths[0]);else setStep("indication")',
      'const paths=medication.paths.filter(p=>p.agent===x);setStep("concentration")'
    );
    replaceIfPresent(
      '{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No department concentration configured</b><span>Choose Custom for this calculation, then have Admin set the department default.</span></div>}',
      '{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No liquid concentration configured</b><span>If this is a tablet, device, gas, spray, or other non-liquid product, confirm the formulation. If a liquid medication is in hand, choose Different concentration and enter the physical label.</span><button type="button" className="continue" onClick={()=>{setConcConfirmed(true);if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}}>CONFIRM NON-LIQUID / DEVICE FORMULATION →</button></div>}'
    );
    replaceIfPresent(
      '<small className="eyebrow">CONCENTRATION</small><h1>Select concentration</h1>',
      '<small className="eyebrow">MEDICATION SAFETY CHECK</small><h1>Select concentration / formulation</h1>'
    );

    // Adult protocol bands must still request an explicit age-band choice.
    replaceIfPresent('ageRequired=ageChangesDose&&path?.patient!=="adult"','ageRequired=ageChangesDose');

    // All completed medication selections still pass through the clinical
    // contraindication/safety review, but concentration is NOT repeated there.
    replaceIfPresent(
      '    else if(safetyChanged||contraindications.length||applicableSpecialChecks(nextPath).length||nextPath.baseContact)setStep("safety");\n    else{setReturnToResult(false);setStep("result")}\n  };',
      '    else setStep("safety");\n  };'
    );
    replaceIfPresent(
      'else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};',
      'else setStep("safety")}};'
    );

    // Weight quick-picks may supply an estimated age for pediatric bands.
    replaceIfPresent(
      'onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility){',
      'onSelect={(nextKg,source,estimatedAge)=>{if(estimatedAge!==undefined&&age===""){setAgeUnit("years");setAge(String(estimatedAge))}setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextAge=estimatedAge??effectiveAgeYears;const nextEligibility=path?genericEligibilityReason(path,ageRequired?nextAge:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!==""||estimatedAge!==undefined)&&!nextEligibility){'
    );

    replaceIfPresent(
      'nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined',
      'nextDose:showingLinkedDose?`${fmt(linkedAmount)} ${linkedDose?.unit}`:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined'
    );

    // Timed drips cannot repeat until the infusion duration plus a five-minute
    // reassessment period has elapsed. A longer protocol repeat interval wins.
    const timerOld='repeatTimerMinutes=path?.linkedDose?.afterMinutes||path?.titrationStepMinutes||path?.repeatAfterMinutes,secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
    const timerNew='documentedInfusionMinutes=path&&/infusion|drip/i.test(`${selectedRoute} ${path.administration}`)?Number(path.administration.match(/(?:over|for)\\s+(\\d+(?:\\.\\d+)?)\\s*minutes?/i)?.[1]||0):0,infusionRepeatMinimum=documentedInfusionMinutes>0?documentedInfusionMinutes+5:0,repeatTimerMinutes=Math.max(path?.linkedDose?.afterMinutes||0,path?.titrationStepMinutes||0,path?.repeatAfterMinutes||0,infusionRepeatMinimum),secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
    replaceIfPresent(timerOld,timerNew);
    replaceIfPresent(
      'detail:secondsLeft?"Repeat button unlocks when the medication-specific interval is complete.":"Tap to record the next dose using the current medication-specific limit."',
      'detail:secondsLeft?(infusionRepeatMinimum>0?`Infusion/reassessment lockout: ${documentedInfusionMinutes} min infusion + 5 min reassessment. Next drip cannot start until the countdown reaches zero.`:"Repeat button unlocks when the medication-specific interval is complete."):"Tap to record the next dose using the current medication-specific limit."'
    );

    return {code,map:null};
  },
};

const base=fieldReleaseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),fastFieldWorkflow]});
