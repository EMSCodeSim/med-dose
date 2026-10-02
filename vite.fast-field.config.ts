import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx"))return null;

    if(id.endsWith("/src/MedicationEngine.tsx")){
      if(code.includes('sessionStorage.getItem("mmd-patient")'))throw new Error("MedicationEngine must not carry patient data between calculations");
      const replaceIfPresent=(oldValue:string,newValue:string)=>{if(code.includes(oldValue))code=code.replace(oldValue,newValue)};

      replaceIfPresent('ageRequired=ageChangesDose&&path?.patient!=="adult"','ageRequired=ageChangesDose');
      replaceIfPresent('[step,setStep]=useState<Step>(()=>medicationAgents.length===1?(medication.paths.some(pathUsesConcentration)?"concentration":"indication"):"medication")','[step,setStep]=useState<Step>(()=>medicationAgents.length===1?"concentration":"medication")');
      replaceIfPresent('const paths=medication.paths.filter(p=>p.agent===x);if(paths.some(pathUsesConcentration))setStep("concentration");else if(paths.length===1)choosePath(paths[0]);else setStep("indication")','const paths=medication.paths.filter(p=>p.agent===x);setStep("concentration")');
      replaceIfPresent('{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No department concentration configured</b><span>Choose Custom for this calculation, then have Admin set the department default.</span></div>}','{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No liquid concentration configured</b><span>If this is a tablet, device, gas, spray, or other non-liquid product, confirm the formulation. If a liquid medication is in hand, choose Different concentration and enter the physical label.</span><button type="button" className="continue" onClick={()=>{setConcConfirmed(true);if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}}>CONFIRM NON-LIQUID / DEVICE FORMULATION →</button></div>}');
      replaceIfPresent('<small className="eyebrow">CONCENTRATION</small><h1>Select concentration</h1>','<small className="eyebrow">MEDICATION SAFETY CHECK</small><h1>Select concentration / formulation</h1>');

      // field-release may already have appended selectedAgeLabel to this state chain.
      // Add safety state after whichever state declaration is present, exactly once.
      if(!code.includes('[safetyMedicationConfirmed,setSafetyMedicationConfirmed]')){
        if(code.includes('[selectedAgeLabel,setSelectedAgeLabel]=useState("");')){
          code=code.replace('[selectedAgeLabel,setSelectedAgeLabel]=useState("");','[selectedAgeLabel,setSelectedAgeLabel]=useState(""),[safetyMedicationConfirmed,setSafetyMedicationConfirmed]=useState(false);');
        }else{
          replaceIfPresent('[editingFinalDose,setEditingFinalDose]=useState(false);','[editingFinalDose,setEditingFinalDose]=useState(false),[safetyMedicationConfirmed,setSafetyMedicationConfirmed]=useState(false);');
        }
      }

      replaceIfPresent('safetyComplete=safetyListConfirmed&&(!path?.baseContact||(baseApproved&&!!basePhysician.trim())),','safetyComplete=safetyMedicationConfirmed&&safetyListConfirmed&&(!path?.baseContact||(baseApproved&&!!basePhysician.trim())),');
      replaceIfPresent('  const selectRoute=(nextRoute:string)=>{\n    if(!path)return;','  const selectRoute=(nextRoute:string)=>{\n    if(!path)return;\n    setSafetyMedicationConfirmed(false);');

      // Route every completed selection through safety. Match the COMPLETE old else block,
      // including its closing brace, so the transform cannot leave an orphaned `}`.
      replaceIfPresent('    else if(safetyChanged||contraindications.length||applicableSpecialChecks(nextPath).length||nextPath.baseContact)setStep("safety");\n    else{setReturnToResult(false);setStep("result")}\n  };','    else setStep("safety");\n  };');
      // Same rule for patient completion; replace the complete nested tail so braces stay balanced.
      replaceIfPresent('else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};','else setStep("safety")}};');

      const passiveOld='{agentNeedsConcentration&&<div className="safety-concentration-check"><b>CONCENTRATION CHECK</b><span>Default: {defaultConcentrationText} • In hand: {usedConcentrationText}</span>{concentrationChanged&&<strong role="alert">NON-DEFAULT CONCENTRATION — verify the physical medication label before administration.</strong>}</div>}';
      const interactiveNew='<div className="safety-concentration-check"><b>{agentNeedsConcentration?"CONCENTRATION CHECK":"FORMULATION CHECK"}</b><span>{agentNeedsConcentration?"Select the concentration physically in hand before continuing.":"Confirm the medication/formulation physically in hand before continuing."}</span><div className="builder-options concentration-options">{fieldConcentration&&<button type="button" className={!customConcentrationMode&&safetyMedicationConfirmed?"selected":""} onClick={()=>{setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);setSafetyMedicationConfirmed(true)}}><b>{fieldConcentration.label||defaultConcentrationText}</b><span>DEPARTMENT DEFAULT — tap to confirm in hand</span></button>}{agentNeedsConcentration&&<button type="button" className={customConcentrationMode?"selected":""} onClick={()=>{setCustomConcentrationMode(true);setCustomConcentration("");setConcConfirmed(false);setSafetyMedicationConfirmed(false)}}><b>Different concentration</b><span>Enter the concentration from the physical label</span></button>}{!agentNeedsConcentration&&!fieldConcentration&&<button type="button" className={safetyMedicationConfirmed?"selected":""} onClick={()=>setSafetyMedicationConfirmed(true)}><b>Confirm formulation in hand</b><span>Tablet, device, gas, spray, or other non-liquid formulation</span></button>}</div>{customConcentrationMode&&agentNeedsConcentration&&<div className="builder-custom"><label>Concentration<input inputMode="decimal" value={customConcentration} onChange={e=>{setCustomConcentration(e.target.value);setConcConfirmed(false);setSafetyMedicationConfirmed(false)}} placeholder="0"/><b>{concentrationUnit}/mL</b></label><button type="button" className="continue" disabled={!(Number(customConcentration)>0)} onClick={()=>{setConcConfirmed(true);setSafetyMedicationConfirmed(true)}}>CONFIRM PHYSICAL LABEL →</button></div>}{concentrationChanged&&safetyMedicationConfirmed&&<strong role="alert">NON-DEFAULT CONCENTRATION — physical label confirmed.</strong>}</div>';
      replaceIfPresent(passiveOld,interactiveNew);
      replaceIfPresent('<input type="checkbox" checked={safetyListConfirmed} onChange={e=>{const confirmed=e.target.checked;','<input type="checkbox" disabled={!safetyMedicationConfirmed} checked={safetyListConfirmed&&safetyMedicationConfirmed} onChange={e=>{const confirmed=e.target.checked;');
      replaceIfPresent('onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility){','onSelect={(nextKg,source,estimatedAge)=>{if(estimatedAge!==undefined&&age===""){setAgeUnit("years");setAge(String(estimatedAge))}setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextAge=estimatedAge??effectiveAgeYears;const nextEligibility=path?genericEligibilityReason(path,ageRequired?nextAge:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!==""||estimatedAge!==undefined)&&!nextEligibility){');
      replaceIfPresent('nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined','nextDose:showingLinkedDose?`${fmt(linkedAmount)} ${linkedDose?.unit}`:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined');

      const timerOld='repeatTimerMinutes=path?.linkedDose?.afterMinutes||path?.titrationStepMinutes||path?.repeatAfterMinutes,secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
      const timerNew='documentedInfusionMinutes=path&&/infusion|drip/i.test(`${selectedRoute} ${path.administration}`)?Number(path.administration.match(/(?:over|for)\\s+(\\d+(?:\\.\\d+)?)\\s*minutes?/i)?.[1]||0):0,infusionRepeatMinimum=documentedInfusionMinutes>0?documentedInfusionMinutes+5:0,repeatTimerMinutes=Math.max(path?.linkedDose?.afterMinutes||0,path?.titrationStepMinutes||0,path?.repeatAfterMinutes||0,infusionRepeatMinimum),secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
      replaceIfPresent(timerOld,timerNew);
      replaceIfPresent('detail:secondsLeft?"Repeat button unlocks when the medication-specific interval is complete.":"Tap to record the next dose using the current medication-specific limit."','detail:secondsLeft?(infusionRepeatMinimum>0?`Infusion/reassessment lockout: ${documentedInfusionMinutes} min infusion + 5 min reassessment. Next drip cannot start until the countdown reaches zero.`:"Repeat button unlocks when the medication-specific interval is complete."):"Tap to record the next dose using the current medication-specific limit."');

      const effectAnchor='  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);';
      if(code.includes(effectAnchor)&&!code.includes('if(step!=="route"||!path||route)return;')){
        const fastEffects=`  useEffect(()=>{\n    if(step!=="route"||!path||route)return;\n    const choices=Array.from(new Set(standardizedRoutePaths(agentPaths,path,medication.id,conc).flatMap(p=>routesFor(p.route))));\n    if(choices.length!==1)return;\n    const timer=window.setTimeout(()=>{\n      const buttons=Array.from(document.querySelectorAll("#active-medication-screen-top .route-options button")) as HTMLButtonElement[];\n      if(buttons.length===1&&!buttons[0].disabled)buttons[0].click();\n    },0);\n    return()=>window.clearTimeout(timer);\n  },[step,path,route,agentPaths,medication.id,conc]);\n\n${effectAnchor}`;
        code=code.replace(effectAnchor,fastEffects);
      }
      return {code,map:null};
    }
    return null;
  },
};

const base=fieldReleaseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),fastFieldWorkflow]});
