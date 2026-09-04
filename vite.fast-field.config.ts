import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx")){
      // Patient carry-forward is now implemented directly in FieldApp.tsx.
      // Keep a guard so future source changes are noticed, but do not try to
      // rewrite the old openMed implementation at build time.
      const openCurrent='const openMed=(id:string)=>{if(!approvedIds.has(id))return;setPatient(readPatient());setSelectedId(id);setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,5));scrollTo({top:0,behavior:"auto"})};';
      if(!code.includes(openCurrent))throw new Error("FieldApp open-med signature changed before fast workflow");
      return null;
    }

    if(id.endsWith("/src/MedicationEngine.tsx")){
      const ageOld='[age,setAge]=useState(initialPatient?.ageYears!==undefined?String(initialPatient.ageYears):"")';
      const ageNew='[age,setAge]=useState(()=>{try{const carried=JSON.parse(sessionStorage.getItem("mmd-patient")||"{}");const saved=carried.ageYears!==undefined&&String(carried.ageYears)!==""?Number(carried.ageYears):undefined;const value=initialPatient?.ageYears??saved;return value!==undefined?String(value):""}catch{return initialPatient?.ageYears!==undefined?String(initialPatient.ageYears):""}})';
      if(!code.includes(ageOld))throw new Error("MedicationEngine age carry-forward signature changed");
      code=code.replace(ageOld,ageNew);

      const weightOld='[weight,setWeight]=useState(initialPatient?.weightKg!==undefined?String(initialPatient.weightKg):"")';
      const weightNew='[weight,setWeight]=useState(()=>{try{const carried=JSON.parse(sessionStorage.getItem("mmd-patient")||"{}");const saved=carried.weightKg!==undefined&&String(carried.weightKg)!==""?Number(carried.weightKg):undefined;const value=initialPatient?.weightKg??saved;return value!==undefined?String(value):""}catch{return initialPatient?.weightKg!==undefined?String(initialPatient.weightKg):""}})';
      if(!code.includes(weightOld))throw new Error("MedicationEngine weight carry-forward signature changed");
      code=code.replace(weightOld,weightNew);

      // Age is safety-critical whenever it changes dose or pathway eligibility.
      // Adult pathways must not skip an elderly/restricted age band (for example
      // Diphenhydramine >65), and a carried pediatric age must never reach an adult result.
      const ageRequiredOld='ageRequired=ageChangesDose&&path?.patient!=="adult"';
      const ageRequiredNew='ageRequired=ageChangesDose';
      if(!code.includes(ageRequiredOld))throw new Error("MedicationEngine age-required signature changed");
      code=code.replace(ageRequiredOld,ageRequiredNew);

      // If a pediatric age-based weight estimate is chosen, that tap supplies both
      // a calculation weight and the age-band information needed for eligibility.
      // Use those new values immediately instead of waiting for React state to rerender.
      const weightHandlerOld='onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility){';
      const weightHandlerNew='onSelect={(nextKg,source,estimatedAge)=>{if(estimatedAge!==undefined&&age===""){setAgeUnit("years");setAge(String(estimatedAge))}setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextAge=estimatedAge??effectiveAgeYears;const nextEligibility=path?genericEligibilityReason(path,ageRequired?nextAge:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!==""||estimatedAge!==undefined)&&!nextEligibility){';
      if(!code.includes(weightHandlerOld))throw new Error("MedicationEngine weight quick-select handler changed");
      code=code.replace(weightHandlerOld,weightHandlerNew);

      // Linked follow-up doses (for example Amiodarone 150 mg after the initial
      // 300 mg arrest dose) must display the actual next linked amount rather than
      // the generic remaining-dose ceiling.
      const linkedDisplayOld='nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined';
      const linkedDisplayNew='nextDose:showingLinkedDose?`${fmt(linkedAmount)} ${linkedDose?.unit}`:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined';
      if(!code.includes(linkedDisplayOld))throw new Error("MedicationEngine next-dose display signature changed");
      code=code.replace(linkedDisplayOld,linkedDisplayNew);

      const effectAnchor='  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);';
      const fastEffects=`  // Experienced-user fast path: if the selected reason leaves only one
  // protocol-approved route, run the existing route button handler automatically.
  // This preserves all pathway matching and safety logic while removing a redundant tap.
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

  // For medications with one stable field concentration, accept the standard
  // concentration on the initial pass. Epinephrine and other concentration-sensitive
  // medications remain explicit, and editing concentration from the final screen never auto-confirms.
  useEffect(()=>{
    if(step!=="concentration"||returnToResult||concConfirmed||customConcentrationMode||!fieldConcentration)return;
    const fastStandard=new Set(["adenosine","fentanyl","ondansetron","midazolam","naloxone","ketorolac","diphenhydramine"]);
    if(!fastStandard.has(medication.id))return;
    const timer=window.setTimeout(()=>{
      const button=document.querySelector("#active-medication-screen-top .concentration-options button") as HTMLButtonElement|null;
      if(button&&!button.disabled)button.click();
    },0);
    return()=>window.clearTimeout(timer);
  },[step,returnToResult,concConfirmed,customConcentrationMode,fieldConcentration,medication.id]);

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
