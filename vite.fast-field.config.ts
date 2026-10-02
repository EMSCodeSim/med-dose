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

      // Age is safety-critical whenever it changes dose or pathway eligibility.
      const ageRequiredOld='ageRequired=ageChangesDose&&path?.patient!=="adult"';
      const ageRequiredNew='ageRequired=ageChangesDose';
      if(code.includes(ageRequiredOld))code=code.replace(ageRequiredOld,ageRequiredNew);
      else if(!code.includes(ageRequiredNew))throw new Error("MedicationEngine age-required signature changed");

      // Every medication begins with an explicit concentration/formulation check.
      // Liquid medications show department stock plus Different concentration.
      // Non-liquid/device medications still require an explicit formulation confirmation.
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

      // If a pediatric age-based weight estimate is chosen, that tap supplies both
      // a calculation weight and the age-band information needed for eligibility.
      const weightHandlerOld='onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility){';
      const weightHandlerNew='onSelect={(nextKg,source,estimatedAge)=>{if(estimatedAge!==undefined&&age===""){setAgeUnit("years");setAge(String(estimatedAge))}setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextAge=estimatedAge??effectiveAgeYears;const nextEligibility=path?genericEligibilityReason(path,ageRequired?nextAge:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!==""||estimatedAge!==undefined)&&!nextEligibility){';
      if(!code.includes(weightHandlerOld))throw new Error("MedicationEngine weight quick-select handler changed");
      code=code.replace(weightHandlerOld,weightHandlerNew);

      // Linked follow-up doses must display the actual next linked amount.
      const linkedDisplayOld='nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined';
      const linkedDisplayNew='nextDose:showingLinkedDose?`${fmt(linkedAmount)} ${linkedDose?.unit}`:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined';
      if(!code.includes(linkedDisplayOld))throw new Error("MedicationEngine next-dose display signature changed");
      code=code.replace(linkedDisplayOld,linkedDisplayNew);

      const effectAnchor='  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);';
      const fastEffects=`  // Experienced-user fast path: if the selected reason leaves only one
  // protocol-approved route, run the existing route button handler automatically.
  // Concentration/formulation is intentionally excluded from fast-path behavior.
  useEffect(()=>{
    if(step!=="route"||!path||route)return;
    const choices=Array.from(new Set(standardizedRoutePaths(agentPaths,path,medication.id,conc).flatMap(p=>routesFor(p.route))));
    if(choices.length!==1)return;
    const timer=window.setTimeout(()=>{
      const buttons=Array.from(document.querySelectorAll("#active-medication-screen-top .route-options button")) as HTMLButtonElement[];
      if(buttons.length===1&&!buttons[0].disabled)buttons[0].click();
    },0);
    return()=>window.clearTimeout(timer);
  },[step,path,route,agentPaths,medication.id,conc]);

${effectAnchor}`;
      if(!code.includes(effectAnchor))throw new Error("MedicationEngine fast-effect anchor changed");
      code=code.replace(effectAnchor,fastEffects);
      return {code,map:null};
    }
    return null;
  },
};

const base=fieldReleaseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),fastFieldWorkflow]});
