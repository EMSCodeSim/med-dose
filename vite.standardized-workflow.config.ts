import {defineConfig,type Plugin,type UserConfig} from "vite";
import baseConfig from "./vite.config";

const standardizedWorkflow:Plugin={
  name:"standardized-reason-route-workflow",
  enforce:"pre",
  transform(code,id){
    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;

    const exportAnchor="export default function MedicationEngine";
    if(!code.includes(exportAnchor))throw new Error("MedicationEngine export signature changed before standardized workflow transform");

    const helpers=`function standardizedReasonLabel(path:GenericDosePath){
  if(path.agent==="Midazolam")return midazolamReasonLabel(path);
  let label=String(path.label||"");
  label=label.replace(/\\s*[—-]\\s*(?:½|1\\/2|half)\\s*dose option.*$/i,"");
  label=label.replace(/\\s*[—-]\\s*\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|mEq)(?:\\/kg)?\\s*(?:upper-end|lower-dose)?\\s*option.*$/i,"");
  return cleanIndicationLabel(label);
}
function standardizedReasonKey(path:GenericDosePath){
  return path.patient+"|"+standardizedReasonLabel(path).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function standardizedReasonOptions(paths:GenericDosePath[],group:"adult"|"pediatric"|"all",medicationId:string,stockConcentration:number){
  const source=medicationId==="midazolam"?midazolamReasonOptions(paths,group):paths.filter(path=>path.patient===group&&epinephrinePathMatchesConcentration(path,stockConcentration,medicationId));
  const seen=new Set<string>();
  return source.filter(path=>{const key=standardizedReasonKey(path);if(seen.has(key))return false;seen.add(key);return true});
}
function standardizedRoutePaths(paths:GenericDosePath[],selected:GenericDosePath,medicationId:string,stockConcentration:number){
  const key=standardizedReasonKey(selected);
  const source=medicationId==="midazolam"?midazolamRoutePaths(paths,selected):paths.filter(path=>path.patient===selected.patient&&epinephrinePathMatchesConcentration(path,stockConcentration,medicationId));
  return source.filter(path=>standardizedReasonKey(path)===key&&!/-half$/.test(path.id));
}

`;
    code=code.replace(exportAnchor,helpers+exportAnchor);

    const optionsOld='const options=medication.id==="midazolam"?midazolamReasonOptions(agentPaths,group):agentPaths.filter(x=>x.patient===group&&epinephrinePathMatchesConcentration(x,conc,medication.id));';
    const optionsNew='const options=standardizedReasonOptions(agentPaths,group,medication.id,conc);';
    if(!code.includes(optionsOld))throw new Error("MedicationEngine indication options signature changed");
    code=code.replace(optionsOld,optionsNew);

    const reasonOld='<b>{medication.id==="midazolam"?midazolamReasonLabel(x):cleanIndicationLabel(x.label)}</b><span>{medication.id==="midazolam"?"Choose route next":x.protocol}</span>';
    const reasonNew='<b>{standardizedReasonLabel(x)}</b><span>Choose route next</span>';
    if(!code.includes(reasonOld))throw new Error("MedicationEngine reason label signature changed");
    code=code.replace(reasonOld,reasonNew);

    const routeListOld='(medication.id==="midazolam"?Array.from(new Set(midazolamRoutePaths(agentPaths,path).flatMap(p=>routesFor(p.route)))):routeChoices)';
    const routeListNew='Array.from(new Set(standardizedRoutePaths(agentPaths,path,medication.id,conc).flatMap(p=>routesFor(p.route))))';
    if(!code.includes(routeListOld))throw new Error("MedicationEngine route list signature changed");
    code=code.replace(routeListOld,routeListNew);

    const routeMatchOld='if(medication.id==="midazolam"){const matched=midazolamRoutePaths(agentPaths,path).find(p=>routesFor(p.route).includes(x));if(matched){activePath=matched;setPath(matched)}}';
    const routeMatchNew='{const matched=standardizedRoutePaths(agentPaths,path,medication.id,conc).find(p=>routesFor(p.route).includes(x));if(matched){activePath=matched;setPath(matched)}}';
    if(!code.includes(routeMatchOld))throw new Error("MedicationEngine route-to-path signature changed");
    code=code.replace(routeMatchOld,routeMatchNew);

    const routeDetailOld='<span>{medication.id==="midazolam"?midazolamReasonLabel(activePathForRoute(agentPaths,path,x)):"Approved route"}</span>';
    const routeDetailNew='<span>{standardizedReasonLabel(standardizedRoutePaths(agentPaths,path,medication.id,conc).find(p=>routesFor(p.route).includes(x))||path)}</span>';
    if(!code.includes(routeDetailOld))throw new Error("MedicationEngine route detail signature changed");
    code=code.replace(routeDetailOld,routeDetailNew);

    const repeatAllowanceOld='maxAdministrations=path?.openEndedRepeats?Number.MAX_SAFE_INTEGER:path?.linkedDose?2:path?.maxAdministrations||1,';
    const repeatAllowanceNew='maxAdministrations=path?.openEndedRepeats||path?.maxCumulative!==undefined||path?.maxCumulativePerKg!==undefined||path?.absoluteCumulativeMax!==undefined?Number.MAX_SAFE_INTEGER:path?.linkedDose?2:path?.maxAdministrations||1,';
    if(!code.includes(repeatAllowanceOld))throw new Error("MedicationEngine repeat allowance signature changed");
    code=code.replace(repeatAllowanceOld,repeatAllowanceNew);

    const ageRequiredOld='ageRequired=ageChangesDose&&path?.patient!=="adult"';
    const ageRequiredNew='ageRequired=ageChangesDose&&(path?.patient!=="adult"||medication.id==="midazolam")';
    if(!code.includes(ageRequiredOld))throw new Error("MedicationEngine age-required signature changed");
    code=code.replace(ageRequiredOld,ageRequiredNew);

    // Field-first sequence. Epinephrine remains concentration-first until its
    // concentration-specific pathway data is normalized independently.
    const initialStepOld='[step,setStep]=useState<Step>(()=>medicationAgents.length===1?(medication.paths.some(pathUsesConcentration)?"concentration":"indication"):"medication")';
    const initialStepNew='[step,setStep]=useState<Step>(()=>medicationAgents.length===1?(medication.id==="epinephrine"&&medication.paths.some(pathUsesConcentration)?"concentration":"indication"):"medication")';
    if(!code.includes(initialStepOld))throw new Error("MedicationEngine initial-step signature changed");
    code=code.replace(initialStepOld,initialStepNew);

    const visibleStepsOld='const visibleSteps:Step[]=[...(medicationAgents.length>1?["medication" as Step]:[]),...(agentNeedsConcentration?["concentration" as Step]:[]),"indication","route",...(needsPatientInfo?["patient" as Step]:[]),"safety","result"]';
    const visibleStepsNew='const visibleSteps:Step[]=[...(medicationAgents.length>1?["medication" as Step]:[]),...(medication.id==="epinephrine"&&agentNeedsConcentration?["concentration" as Step]:[]),"indication","route",...(needsPatientInfo?["patient" as Step]:[]),...(medication.id!=="epinephrine"&&agentNeedsConcentration?["concentration" as Step]:[]),"safety","result"]';
    if(!code.includes(visibleStepsOld))throw new Error("MedicationEngine visible-step signature changed");
    code=code.replace(visibleStepsOld,visibleStepsNew);

    const routePatientOld='const activeNeedsPatient=activeNeedsWeight||activeAgeRequired;if(returnToResult&&patientComplete&&safetyComplete){setReturnToResult(false);setStep("result")}else if(activeNeedsPatient)setStep("patient");else{setStep("safety")}';
    const routePatientNew='const activeNeedsPatient=activeNeedsWeight||activeAgeRequired;const activeNeedsConcentration=activePath.formula.kind!=="instruction"&&!['+"'"+'mL'+"'"+','+"'"+'drops'+"'"+','+"'"+'sprays'+"'"+','+"'"+'device'+"'"+'].includes(activePath.formula.unit)&&(!!activePath.volumeRequired||!!activePath.suggestedConcentration);if(returnToResult&&patientComplete&&safetyComplete){setReturnToResult(false);setStep("result")}else if(activeNeedsPatient)setStep("patient");else if(medication.id!=="epinephrine"&&activeNeedsConcentration&&!concConfirmed)setStep("concentration");else{setStep("safety")}';
    if(!code.includes(routePatientOld))throw new Error("MedicationEngine route-next-step signature changed");
    code=code.replace(routePatientOld,routePatientNew);

    const finishPatientOld='const finishPatient=()=>{if(path&&!eligibility&&(!ageRequired||age!=="")&&(!needsWeight||kg>0)){if(result)setActual(String(result.minDose||result.dose));if(returnToResult&&safetyComplete){setReturnToResult(false);setStep("result")}else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};';
    const finishPatientNew='const finishPatient=()=>{if(path&&!eligibility&&(!ageRequired||age!=="")&&(!needsWeight||kg>0)){if(result)setActual(String(result.minDose||result.dose));if(returnToResult&&safetyComplete){setReturnToResult(false);setStep("result")}else if(medication.id!=="epinephrine"&&needsConcentration&&!concConfirmed)setStep("concentration");else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};';
    if(!code.includes(finishPatientOld))throw new Error("MedicationEngine patient-next-step signature changed");
    code=code.replace(finishPatientOld,finishPatientNew);

    // When concentration is selected after reason/route, continue forward instead
    // of restarting indication/path selection. This replacement applies to the
    // stock concentration buttons injected by the base clinical plugin.
    const concentrationForwardOld='if(returnToResult&&path){setReturnToResult(false);setStep("result")}else if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")';
    const concentrationForwardNew='if(returnToResult&&path){setReturnToResult(false);setStep("result")}else if(path){if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else setStep("result")}else if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")';
    if(code.includes(concentrationForwardOld))code=code.split(concentrationForwardOld).join(concentrationForwardNew);

    return {code,map:null};
  },
};

const base=baseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),standardizedWorkflow]});
