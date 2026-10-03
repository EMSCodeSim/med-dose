import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

/** Production field workflow. Concentration/formulation is one dedicated step. */
const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/AdminMedicationManager.tsx")){
      const importAnchor='import type { ReleasePayload } from "./medicationRelease";';
      if(!code.includes('AdminCalculatorPreview')){
        if(!code.includes(importAnchor))throw new Error("Admin medication calculator preview import anchor changed");
        code=code.replace(importAnchor,`${importAnchor}\nimport AdminCalculatorPreview from "./AdminCalculatorPreview";`);
      }
      if(!code.includes('AdminMedicationSafetyPanel')){
        if(!code.includes(importAnchor))throw new Error("Admin medication safety panel import anchor changed");
        code=code.replace(importAnchor,`${importAnchor}\nimport AdminMedicationSafetyPanel,{calculatorTestCurrent,clearCalculatorTest} from "./AdminMedicationSafetyPanel";`);
      }
      const managerStateAnchor='  const [catalogDirty, setCatalogDirty] = useState(false);';
      if(!code.includes('calculatorPreviewOpen')){
        if(!code.includes(managerStateAnchor))throw new Error("Admin medication calculator preview state anchor changed");
        code=code.replace(managerStateAnchor,`${managerStateAnchor}\n  const [calculatorPreviewOpen, setCalculatorPreviewOpen] = useState(false);`);
      }
      const actionsAnchor='              {!editing && (\n                <button onClick={beginEdit}>Edit medication fields</button>\n              )}';
      if(!code.includes('Test calculator')){
        if(!code.includes(actionsAnchor))throw new Error("Admin medication calculator preview action anchor changed");
        code=code.replace(actionsAnchor,`${actionsAnchor}\n              {!editing && Array.isArray(currentData.paths) && (\n                <button className="primary" type="button" onClick={()=>setCalculatorPreviewOpen(true)}>Test calculator</button>\n              )}`);
      }
      const recordAnchor='            {selectedValidation&&<section id="medication-validation"';
      if(!code.includes('admin-calculator-summary')){
        if(!code.includes(recordAnchor))throw new Error("Admin medication calculator summary anchor changed");
        const summary=`            {!editing && Array.isArray(currentData.paths) && <section className="admin-calculator-summary"><header><div><small>CALCULATOR</small><h3>Field dose calculator</h3><p>{currentData.paths.length} treatment path{currentData.paths.length===1?"":"s"} saved for this medication. Test the same workflow field users will see before approval.</p></div><button type="button" className="primary" onClick={()=>setCalculatorPreviewOpen(true)}>Test calculator</button></header><div className="admin-calculator-paths">{currentData.paths.slice(0,8).map((path:any,index:number)=><div key={path.id||index}><b>{path.label||"Untitled pathway"}</b><span>{path.patient||"all"} • {path.route||"route not set"}</span><span>{formulaSummary(path.formula)}</span></div>)}</div></section>}\n            {calculatorPreviewOpen&&<AdminCalculatorPreview data={currentData} close={()=>setCalculatorPreviewOpen(false)}/>}\n`;
        code=code.replace(recordAnchor,summary+recordAnchor);
      }
      if(!code.includes('admin-review-readiness-panel')){
        if(!code.includes(recordAnchor))throw new Error("Admin review readiness panel anchor changed");
        const readiness=`            {!editing&&selected&&currentData&&<div className="admin-review-readiness-panel"><AdminMedicationSafetyPanel medicationId={selected.id} currentData={currentData} publishedData={(loadClinicalOverrides()[selected.id] as JsonObject|undefined)||baseData(selected)} validationComplete={Boolean(selectedValidation?.complete)} approvals={signatureCount(reviews[selected.id]||{})} onTest={()=>setCalculatorPreviewOpen(true)}/></div>}\n`;
        code=code.replace(recordAnchor,readiness+recordAnchor);
      }
      const approvalAnchor='    if(!validationProgress.complete){\n      setError(`Complete all ${validationProgress.total} required validation checks before recording medication approval.`);\n      return;\n    }';
      if(!code.includes('Calculator test must be completed for the current')){
        if(!code.includes(approvalAnchor))throw new Error("Admin approval safety gate anchor changed");
        code=code.replace(approvalAnchor,`${approvalAnchor}\n    if(!calculatorTestCurrent(selected.id,currentData||{})){\n      setError("Calculator test must be completed for the current dose pathways and concentration before recording medication approval.");\n      return;\n    }`);
      }
      const resetAnchor='      resetSignatures(selected.id);\n      setSavedMessage(';
      if(!code.includes('clearCalculatorTest(selected.id)')){
        if(!code.includes(resetAnchor))throw new Error("Admin calculator test invalidation anchor changed");
        code=code.replace(resetAnchor,`      resetSignatures(selected.id);\n      clearCalculatorTest(selected.id);\n      setSavedMessage(`);
      }
      return {code,map:null};
    }
    if(id.endsWith("/src/FieldApp.tsx"))return null;
    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;
    if(code.includes('sessionStorage.getItem("mmd-patient")'))throw new Error("MedicationEngine must not carry patient data between calculations");
    const replaceIfPresent=(oldValue:string,newValue:string)=>{if(code.includes(oldValue))code=code.replace(oldValue,newValue)};

    replaceIfPresent('[step,setStep]=useState<Step>(()=>medicationAgents.length===1?(medication.paths.some(pathUsesConcentration)?"concentration":"indication"):"medication")','[step,setStep]=useState<Step>(()=>medicationAgents.length===1?"concentration":"medication")');
    replaceIfPresent('const paths=medication.paths.filter(p=>p.agent===x);if(paths.some(pathUsesConcentration))setStep("concentration");else if(paths.length===1)choosePath(paths[0]);else setStep("indication")','const paths=medication.paths.filter(p=>p.agent===x);setStep("concentration")');
    replaceIfPresent('{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No department concentration configured</b><span>Choose Custom for this calculation, then have Admin set the department default.</span></div>}','{!fieldConcentration&&!customConcentrationMode&&<div className="input-guidance"><b>No liquid concentration configured</b><span>If this is a tablet, device, gas, spray, or other non-liquid product, confirm the formulation. If a liquid medication is in hand, choose Different concentration and enter the physical label.</span><button type="button" className="continue" onClick={()=>{setConcConfirmed(true);if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}}>CONFIRM NON-LIQUID / DEVICE FORMULATION →</button></div>}');
    replaceIfPresent('<small className="eyebrow">CONCENTRATION</small><h1>Select concentration</h1>','<small className="eyebrow">CONCENTRATION CHECK</small><h1>Confirm medication concentration</h1>');
    replaceIfPresent('ageRequired=ageChangesDose&&path?.patient!=="adult"','ageRequired=ageChangesDose');

    const passiveSafetyConcentration='{agentNeedsConcentration&&<div className="safety-concentration-check"><b>CONCENTRATION CHECK</b><span>Default: {defaultConcentrationText} • In hand: {usedConcentrationText}</span>{concentrationChanged&&<strong role="alert">NON-DEFAULT CONCENTRATION — verify the physical medication label before administration.</strong>}</div>}';
    replaceIfPresent(passiveSafetyConcentration,'');

    replaceIfPresent('    else if(safetyChanged||contraindications.length||applicableSpecialChecks(nextPath).length||nextPath.baseContact)setStep("safety");\n    else{setReturnToResult(false);setStep("result")}\n  };','    else setStep("safety");\n  };');
    replaceIfPresent('else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};','else setStep("safety")}};');

    replaceIfPresent('onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);setConcentrationSafetyConfirmed(false);const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility){','onSelect={(nextKg,source,estimatedAge)=>{if(estimatedAge!==undefined&&age===""){setAgeUnit("years");setAge(String(estimatedAge))}setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);setConcentrationSafetyConfirmed(false);const nextAge=estimatedAge??effectiveAgeYears;const nextEligibility=path?genericEligibilityReason(path,ageRequired?nextAge:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!==""||estimatedAge!==undefined)&&!nextEligibility){');
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
