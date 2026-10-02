import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx")){
      // FieldApp owns the fresh-patient boundary. Never inject persistence or
      // carry-forward behavior during the production build.
      return null;
    }

    if(id.endsWith("/src/MedicationEngine.tsx")){
      if(code.includes('sessionStorage.getItem("mmd-patient")'))throw new Error("MedicationEngine must not carry patient data between calculations");

      const ageRequiredOld='ageRequired=ageChangesDose&&path?.patient!=="adult"';
      const ageRequiredNew='ageRequired=ageChangesDose';
      if(code.includes(ageRequiredOld))code=code.replace(ageRequiredOld,ageRequiredNew);
      else if(!code.includes(ageRequiredNew))throw new Error("MedicationEngine age-required signature changed");

      const initialStepOld='[step,setStep]=useState<Step>(()=>medicationAgents.length===1?(medication.paths.some(pathUsesConcentration)?"concentration":"indication"):"medication")';
      const initialStepNew='[step,setStep]=useState<Step>(()=>medicationAgents.length===1?"concentration":"medication")';
      if(!code.includes(initialStepOld))throw new Error("MedicationEngine initial concentration step signature changed");
      code=code.replace(initialStepOld,initialStepNew);

      const agentSelectionOld='const paths=medication.paths.filter(p=>p.agent===x);if(paths.some(pathUsesConcentration))setStep("concentration");else if(paths.length===1)choosePath(paths[0]);else setStep("indication")';
      const agentSelectionNew='const paths=medication.paths.filter(p=>p.agent===x);setStep("concentration")';
      if(!code.includes(agentSelectionOld))throw new Error("MedicationEngine agent concentration step signature changed");
      code=code.replace(agentSelectionOld,agentSelectionNew);

      const noDefaultOld='{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No department concentration configured</b><span>Choose Custom for this calculation, then have Admin set the department default.</span></div>}';
      const noDefaultNew='{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No liquid concentration configured</b><span>If this is a tablet, device, gas, spray, or other non-liquid product, confirm the formulation. If a liquid medication is in hand, choose Different concentration and enter the physical label.</span><button type="button" className="continue" onClick={()=>{setConcConfirmed(true);if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}}>CONFIRM NON-LIQUID / DEVICE FORMULATION →</button></div>}';
      if(!code.includes(noDefaultOld))throw new Error("MedicationEngine no-default concentration guidance signature changed");
      code=code.replace(noDefaultOld,noDefaultNew);

      const headingOld='<small className="eyebrow">CONCENTRATION</small><h1>Select concentration</h1>';
      const headingNew='<small className="eyebrow">MEDICATION SAFETY CHECK</small><h1>Select concentration / formulation</h1>';
      if(!code.includes(headingOld))throw new Error("MedicationEngine concentration heading signature changed");
      code=code.replace(headingOld,headingNew);

      const stateOld='[editingFinalDose,setEditingFinalDose]=useState(false);';
      const stateNew='[editingFinalDose,setEditingFinalDose]=useState(false),[safetyMedicationConfirmed,setSafetyMedicationConfirmed]=useState(false);';
      if(!code.includes(stateOld))throw new Error("MedicationEngine safety confirmation state anchor changed");
      code=code.replace(stateOld,stateNew);

      const safetyCompleteOld='safetyComplete=safetyListConfirmed&&(!path?.baseContact||(baseApproved&&!!basePhysician.trim())),';
      const safetyCompleteNew='safetyComplete=safetyMedicationConfirmed&&safetyListConfirmed&&(!path?.baseContact||(baseApproved&&!!basePhysician.trim())),';
      if(!code.includes(safetyCompleteOld))throw new Error("MedicationEngine safetyComplete signature changed");
      code=code.replace(safetyCompleteOld,safetyCompleteNew);

      const routeStartOld='  const selectRoute=(nextRoute:string)=>{\n    if(!path)return;';
      const routeStartNew='  const selectRoute=(nextRoute:string)=>{\n    if(!path)return;\n    setSafetyMedicationConfirmed(false);';
      if(!code.includes(routeStartOld))throw new Error("MedicationEngine route safety reset anchor changed");
      code=code.replace(routeStartOld,routeStartNew);

      code=code.replace('else if(safetyChanged||contraindications.length||applicableSpecialChecks(nextPath).length||nextPath.baseContact)setStep("safety");\n    else{setReturnToResult(false);setStep("result")}', 'else setStep("safety")');
      code=code.replace('else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")', 'else setStep("safety")');

      const passiveOld='{agentNeedsConcentration&&<div className="safety-concentration-check"><b>CONCENTRATION CHECK</b><span>Default: {defaultConcentrationText} • In hand: {usedConcentrationText}</span>{concentrationChanged&&<strong role="alert">NON-DEFAULT CONCENTRATION — verify the physical medication label before administration.</strong>}</div>}';
      const interactiveNew='<div className="safety-concentration-check"><b>{agentNeedsConcentration?"CONCENTRATION CHECK":"FORMULATION CHECK"}</b><span>{agentNeedsConcentration?"Select the concentration physically in hand before continuing.":"Confirm the medication/formulation physically in hand before continuing."}</span><div className="builder-options concentration-options">{fieldConcentration&&<button type="button" className={!customConcentrationMode&&safetyMedicationConfirmed?"selected":""} onClick={()=>{setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);setSafetyMedicationConfirmed(true)}}><b>{fieldConcentration.label||defaultConcentrationText}</b><span>DEPARTMENT DEFAULT — tap to confirm in hand</span></button>}{agentNeedsConcentration&&<button type="button" className={customConcentrationMode?"selected":""} onClick={()=>{setCustomConcentrationMode(true);setCustomConcentration("");setConcConfirmed(false);setSafetyMedicationConfirmed(false)}}><b>Different concentration</b><span>Enter the concentration from the physical label</span></button>}{!agentNeedsConcentration&&!fieldConcentration&&<button type="button" className={safetyMedicationConfirmed?"selected":""} onClick={()=>setSafetyMedicationConfirmed(true)}><b>Confirm formulation in hand</b><span>Tablet, device, gas, spray, or other non-liquid formulation</span></button>}</div>{customConcentrationMode&&agentNeedsConcentration&&<div className="builder-custom"><label>Concentration<input inputMode="decimal" value={customConcentration} onChange={e=>{setCustomConcentration(e.target.value);setConcConfirmed(false);setSafetyMedicationConfirmed(false)}} placeholder="0"/><b>{concentrationUnit}/mL</b></label><button type="button" className="continue" disabled={!(Number(customConcentration)>0)} onClick={()=>{setConcConfirmed(true);setSafetyMedicationConfirmed(true)}}>CONFIRM PHYSICAL LABEL →</button></div>}{concentrationChanged&&safetyMedicationConfirmed&&<strong role="alert">NON-DEFAULT CONCENTRATION — physical label confirmed.</strong>}</div>';
      if(!code.includes(passiveOld))throw new Error("MedicationEngine passive concentration safety block changed");
      code=code.replace(passiveOld,interactiveNew);

      const masterOld='<input type="checkbox" checked={safetyListConfirmed} onChange={e=>{const confirmed=e.target.checked;';
      const masterNew='<input type="checkbox" disabled={!safetyMedicationConfirmed} checked={safetyListConfirmed&&safetyMedicationConfirmed} onChange={e=>{const confirmed=e.target.checked;';
      if(!code.includes(masterOld))throw new Error("MedicationEngine master safety checkbox signature changed");
      code=code.replace(masterOld,masterNew);

      const weightHandlerOld='onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility){';
      const weightHandlerNew='onSelect={(nextKg,source,estimatedAge)=>{if(estimatedAge!==undefined&&age===""){setAgeUnit("years");setAge(String(estimatedAge))}setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextAge=estimatedAge??effectiveAgeYears;const nextEligibility=path?genericEligibilityReason(path,ageRequired?nextAge:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!==""||estimatedAge!==undefined)&&!nextEligibility){';
      if(!code.includes(weightHandlerOld))throw new Error("MedicationEngine weight quick-select handler changed");
      code=code.replace(weightHandlerOld,weightHandlerNew);

      const linkedDisplayOld='nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined';
      const linkedDisplayNew='nextDose:showingLinkedDose?`${fmt(linkedAmount)} ${linkedDose?.unit}`:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined';
      if(!code.includes(linkedDisplayOld))throw new Error("MedicationEngine next-dose display signature changed");
      code=code.replace(linkedDisplayOld,linkedDisplayNew);

      // Timed drips/infusions cannot be repeated while the first infusion is still running.
      // Parse the documented administration duration and add a five-minute reassessment period.
      // Example: "infuse over 10 minutes" => repeat control stays locked for at least 15 minutes.
      const timerOld='repeatTimerMinutes=path?.linkedDose?.afterMinutes||path?.titrationStepMinutes||path?.repeatAfterMinutes,secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
      const timerNew='documentedInfusionMinutes=path&&/infusion|drip/i.test(`${selectedRoute} ${path.administration}`)?Number(path.administration.match(/(?:over|for)\\s+(\\d+(?:\\.\\d+)?)\\s*minutes?/i)?.[1]||0):0,infusionRepeatMinimum=documentedInfusionMinutes>0?documentedInfusionMinutes+5:0,repeatTimerMinutes=Math.max(path?.linkedDose?.afterMinutes||0,path?.titrationStepMinutes||0,path?.repeatAfterMinutes||0,infusionRepeatMinimum),secondsLeft=repeatTimerMinutes&&lastAdministration?Math.max(0,Math.ceil((lastAdministration.time+repeatTimerMinutes*60000-now)/1000)):0,';
      if(!code.includes(timerOld))throw new Error("MedicationEngine repeat timer signature changed");
      code=code.replace(timerOld,timerNew);

      const detailOld='detail:secondsLeft?"Repeat button unlocks when the medication-specific interval is complete.":"Tap to record the next dose using the current medication-specific limit."';
      const detailNew='detail:secondsLeft?(infusionRepeatMinimum>0?`Infusion/reassessment lockout: ${documentedInfusionMinutes} min infusion + 5 min reassessment. Next drip cannot start until the countdown reaches zero.`:"Repeat button unlocks when the medication-specific interval is complete."):"Tap to record the next dose using the current medication-specific limit."';
      if(!code.includes(detailOld))throw new Error("MedicationEngine repeat timer detail signature changed");
      code=code.replace(detailOld,detailNew);

      const effectAnchor='  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);';
      const fastEffects=`  useEffect(()=>{\n    if(step!=="route"||!path||route)return;\n    const choices=Array.from(new Set(standardizedRoutePaths(agentPaths,path,medication.id,conc).flatMap(p=>routesFor(p.route))));\n    if(choices.length!==1)return;\n    const timer=window.setTimeout(()=>{\n      const buttons=Array.from(document.querySelectorAll("#active-medication-screen-top .route-options button")) as HTMLButtonElement[];\n      if(buttons.length===1&&!buttons[0].disabled)buttons[0].click();\n    },0);\n    return()=>window.clearTimeout(timer);\n  },[step,path,route,agentPaths,medication.id,conc]);\n\n${effectAnchor}`;
      if(!code.includes(effectAnchor))throw new Error("MedicationEngine fast-effect anchor changed");
      code=code.replace(effectAnchor,fastEffects);
      return {code,map:null};
    }
    return null;
  },
};

const base=fieldReleaseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),fastFieldWorkflow]});
