import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const clinicalMedicationOverrides={
  name:"clinical-medication-overrides",
  enforce:"pre" as const,
  resolveId(source:string,importer?:string){
    if(source==="./fieldMedicationDefinitions"&&importer?.endsWith("/src/UnifiedApp.tsx")){
      return fileURLToPath(new URL("./src/expandedFieldMedicationDefinitions.ts",import.meta.url));
    }
    if(source==="./emsMedicationDefaults"&&importer?.endsWith("/src/MedicationEngine.tsx")){
      return fileURLToPath(new URL("./src/clinicalMedicationDefaults.ts",import.meta.url));
    }
    return null;
  },
  transform(code:string,id:string){
    if(id.endsWith("/src/UnifiedApp.tsx")){
      const directive='"use client";\n';
      const approvalImport='"use client";\nimport {medicationApprovalStatus} from "./medicationApprovalStatus";\n';
      if(!code.includes(directive))throw new Error("UnifiedApp client directive changed");
      code=code.replace(directive,approvalImport);

      const stateSignature='[catalogRevision,setCatalogRevision]=useState(0);';
      const stateReplacement='[catalogRevision,setCatalogRevision]=useState(0),[drugSearch,setDrugSearch]=useState("");';
      if(!code.includes(stateSignature))throw new Error("UnifiedApp search-state signature changed");
      code=code.replace(stateSignature,stateReplacement);

      const visibleSignature='const visibleIds=useMemo(()=>DEFAULT_FIELD_MEDICATION_IDS.filter(id=>!medicationCatalogRetired(id)&&medicationCatalogVisible(id,true)&&!!fieldMedicationDefinition(id)),[catalogRevision]);';
      const filteredReplacement=`const visibleIds=useMemo(()=>DEFAULT_FIELD_MEDICATION_IDS.filter(id=>!medicationCatalogRetired(id)&&medicationCatalogVisible(id,true)&&!!fieldMedicationDefinition(id)),[catalogRevision]);
  const filteredVisibleIds=useMemo(()=>{const q=drugSearch.trim().toLowerCase();if(!q)return visibleIds;return visibleIds.filter(id=>{const def=fieldMedicationDefinition(id),med=catalog.find(item=>item.id===id);if(!def)return false;const searchable=[id,def.name,def.protocolId,med?.brand,med?.sub,...def.paths.map(path=>path.label),...def.paths.map(path=>path.protocol)].filter(Boolean).join(" ").toLowerCase();return searchable.includes(q)})},[visibleIds,drugSearch,catalog]);`;
      if(!code.includes(visibleSignature))throw new Error("UnifiedApp visible medication signature changed");
      code=code.replace(visibleSignature,filteredReplacement);

      const gridSignature='</p></div><div className="pilot-medication-grid">{visibleIds.map(id=>';
      const gridReplacement='</p></div><div className="pilot-medication-search"><label htmlFor="drug-search">Find a medication</label><div><span aria-hidden="true">⌕</span><input id="drug-search" type="search" inputMode="search" autoComplete="off" placeholder="Search drug, indication, or protocol" value={drugSearch} onChange={e=>setDrugSearch(e.target.value)}/>{drugSearch&&<button type="button" onClick={()=>setDrugSearch("")} aria-label="Clear medication search">×</button>}</div><small>{filteredVisibleIds.length} of {visibleIds.length} medications</small></div><div className="pilot-medication-grid">{filteredVisibleIds.map(id=>';
      if(!code.includes(gridSignature))throw new Error("UnifiedApp medication grid signature changed");
      code=code.replace(gridSignature,gridReplacement);

      const cardInfoSignature='<span>{med?.sub||subtitles[id]||`DMP ${def.protocolId}`}</span>';
      const cardInfoReplacement='<span>{def.paths.length?`${def.paths.slice(0,2).map(path=>path.label).join(" • ")}${def.paths.length>2?` • +${def.paths.length-2} more`:""}`:med?.sub||subtitles[id]||`DMP ${def.protocolId}`}</span><em className={`med-approval ${medicationApprovalStatus(id).state}`}>{medicationApprovalStatus(id).label}</em>';
      if(!code.includes(cardInfoSignature))throw new Error("UnifiedApp medication card information signature changed");
      code=code.replace(cardInfoSignature,cardInfoReplacement);

      const footerSignature='<span>{visibleIds.length} released medications • one renderer • one state machine</span>';
      const footerReplacement='<span>{drugSearch?`${filteredVisibleIds.length} matching medications`:`${visibleIds.length} released medications`} • one renderer • one state machine • approval tracked per medication</span>';
      if(!code.includes(footerSignature))throw new Error("UnifiedApp footer signature changed");
      code=code.replace(footerSignature,footerReplacement);

      return {code,map:null};
    }

    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;

    const singleConcentration='const fieldConcentration=useMemo(()=>fieldConcentrationFor(medication.id),[medication.id]);';
    const multiConcentration='const fieldConcentrations=useMemo(()=>fieldConcentrationsFor(medication.id),[medication.id]),[fieldConcentrationIndex,setFieldConcentrationIndex]=useState(0),fieldConcentration=fieldConcentrations[fieldConcentrationIndex]||null;';
    if(!code.includes(singleConcentration))throw new Error("MedicationEngine concentration state signature changed");
    code=code.replace(singleConcentration,multiConcentration);

    const helperAnchor='export default function MedicationEngine';
    const versedHelpers=`function midazolamReasonKey(path:GenericDosePath){
  const id=path.id.replace(/-half$/,'');
  if(id.includes('seizure'))return 'seizure';
  if(id.includes('cardiovert'))return 'cardioversion';
  if(id.includes('pacing'))return 'pacing';
  if(id.includes('imminent'))return 'imminent';
  if(id.includes('agitation-under8'))return 'agitation-under8';
  if(id.includes('agitation'))return 'agitation';
  return id;
}
function midazolamReasonLabel(path:GenericDosePath){
  switch(midazolamReasonKey(path)){
    case 'seizure': return 'Seizure / status epilepticus';
    case 'cardioversion': return 'Sedation for synchronized cardioversion';
    case 'pacing': return 'Sedation for transcutaneous pacing';
    case 'agitation': return path.patient==='pediatric'?'Agitated / combative — age 8 to 11':'Agitated / combative patient';
    case 'agitation-under8': return 'Agitated / combative — under age 8 • BASE CONTACT';
    case 'imminent': return 'Imminent risk of bodily harm';
    default: return cleanIndicationLabel(path.label);
  }
}
function midazolamReasonOptions(paths:GenericDosePath[],group:'adult'|'pediatric'|'all'){
  const preferred=new Set(['adult-seizure-iv','adult-cardiovert','adult-pacing','adult-agitation','adult-imminent','ped-seizure-iv','ped-cardiovert-iv','ped-pacing-iv','ped-agitation-8-11','ped-agitation-under8']);
  return paths.filter(path=>path.patient===group&&preferred.has(path.id));
}
function midazolamRoutePaths(paths:GenericDosePath[],selected:GenericDosePath){
  const key=midazolamReasonKey(selected);
  return paths.filter(path=>path.patient===selected.patient&&midazolamReasonKey(path)===key&&!path.id.endsWith('-half'));
}

export default function MedicationEngine`;
    if(!code.includes(helperAnchor))throw new Error("MedicationEngine export signature changed");
    code=code.replace(helperAnchor,versedHelpers);

    const oldHelper=`function fieldConcentrationFor(id:string):FieldConcentration|null{
  try{
    const overrides=loadClinicalOverrides() as Record<string,{concentrations?:FieldConcentration[]}>;
    const admin=overrides[id]?.concentrations?.find(item=>Number(item?.concentration)>0);
    if(admin)return admin;
  }catch{}
  return commonEmsConcentrationsFor(id).find(item=>Number(item?.concentration)>0)||null;
}`;
    const newHelper=`function fieldConcentrationsFor(id:string):FieldConcentration[]{
  try{
    const overrides=loadClinicalOverrides() as Record<string,{concentrations?:FieldConcentration[]}>;
    const admin=(overrides[id]?.concentrations||[]).filter(item=>Number(item?.concentration)>0);
    if(admin.length)return admin;
  }catch{}
  return commonEmsConcentrationsFor(id).filter(item=>Number(item?.concentration)>0);
}

function epinephrinePathMatchesConcentration(path:GenericDosePath,stockConcentration:number,medicationId:string){
  if(medicationId!=="epinephrine")return true;
  if(!(stockConcentration>0))return true;
  const oneToOneThousand=new Set(["allergy-adult","allergy-ped-small","allergy-ped-large","allergy-ped-infant","stridor","infusion"]);
  const oneToTenThousand=new Set(["arrest-adult","arrest-ped","brady-ped","push-dose","allergy-ped-refractory-iv","infusion"]);
  if(Math.abs(stockConcentration-1)<0.000001)return oneToOneThousand.has(path.id);
  if(Math.abs(stockConcentration-0.1)<0.000001)return oneToTenThousand.has(path.id);
  return true;
}`;
    if(!code.includes(oldHelper))throw new Error("MedicationEngine concentration helper signature changed");
    code=code.replace(oldHelper,newHelper);

    const indicationSignature='const options=agentPaths.filter(x=>x.patient===group);';
    const indicationReplacement='const options=medication.id==="midazolam"?midazolamReasonOptions(agentPaths,group):agentPaths.filter(x=>x.patient===group&&epinephrinePathMatchesConcentration(x,conc,medication.id));';
    if(!code.includes(indicationSignature))throw new Error("MedicationEngine indication filtering signature changed");
    code=code.replace(indicationSignature,indicationReplacement);

    const reasonButton='<b>{cleanIndicationLabel(x.label)}</b><span>{x.protocol}</span>';
    const clearerReasonButton='<b>{medication.id==="midazolam"?midazolamReasonLabel(x):cleanIndicationLabel(x.label)}</b><span>{medication.id==="midazolam"?"Choose route next":x.protocol}</span>';
    if(!code.includes(reasonButton))throw new Error("MedicationEngine reason button signature changed");
    code=code.replace(reasonButton,clearerReasonButton);

    const routeChoicesSignature='<div className="builder-options route-options">{routeChoices.map(x=><button key={x} className={selectedRoute===x?"selected":""} onClick={()=>{setRoute(x);if(returnToResult&&patientComplete&&safetyComplete){setReturnToResult(false);setStep("result")}else if(needsPatientInfo&&!patientComplete)setStep("patient");else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}}><b>{x}</b><span>Approved route</span></button>)}</div>';
    const routeChoicesReplacement='<div className="builder-options route-options">{(medication.id==="midazolam"?Array.from(new Set(midazolamRoutePaths(agentPaths,path).flatMap(p=>routesFor(p.route)))):routeChoices).map(x=><button key={x} className={selectedRoute===x?"selected":""} onClick={()=>{let activePath=path;if(medication.id==="midazolam"){const matched=midazolamRoutePaths(agentPaths,path).find(p=>routesFor(p.route).includes(x));if(matched){activePath=matched;setPath(matched)}}setRoute(x);const activeNeedsWeight=activePath.formula.kind==="perKg"||!!activePath.requiresWeight;const activeAgeRequired=(activePath.formula.kind==="ageBands"||activePath.minAge!==undefined||activePath.maxAge!==undefined)&&activePath.patient!=="adult";const activeNeedsPatient=activeNeedsWeight||activeAgeRequired;if(returnToResult&&patientComplete&&safetyComplete){setReturnToResult(false);setStep("result")}else if(activeNeedsPatient)setStep("patient");else{setStep("safety")}}}><b>{x}</b><span>{medication.id==="midazolam"?midazolamReasonLabel(activePathForRoute(agentPaths,path,x)):"Approved route"}</span></button>)}</div>';
    const activePathHelper=`function activePathForRoute(paths:GenericDosePath[],selected:GenericDosePath,route:string){
  if(selected.agent!=="Midazolam")return selected;
  return midazolamRoutePaths(paths,selected).find(path=>routesFor(path.route).includes(route))||selected;
}

`;
    if(!code.includes(routeChoicesSignature))throw new Error("MedicationEngine route choice signature changed");
    code=code.replace('function midazolamRoutePaths(paths:GenericDosePath[],selected:GenericDosePath){\n  const key=midazolamReasonKey(selected);\n  return paths.filter(path=>path.patient===selected.patient&&midazolamReasonKey(path)===key&&!path.id.endsWith(\'-half\'));\n}\n\n','function midazolamRoutePaths(paths:GenericDosePath[],selected:GenericDosePath){\n  const key=midazolamReasonKey(selected);\n  return paths.filter(path=>path.patient===selected.patient&&midazolamReasonKey(path)===key&&!path.id.endsWith(\'-half\'));\n}\n'+activePathHelper);
    code=code.replace(routeChoicesSignature,routeChoicesReplacement);

    code=code.replace(
      'className={!customConcentrationMode&&concConfirmed?"selected":""}',
      'className={!customConcentrationMode&&concConfirmed&&fieldConcentrationIndex===0?"selected":""}'
    );
    code=code.replace(
      'onClick={()=>{setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);',
      'onClick={()=>{setFieldConcentrationIndex(0);setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);if(medication.id==="epinephrine"){setPath(null);setRoute("");setStep("indication");return;}'
    );

    const customButton='<button type="button" className={customConcentrationMode?"selected":""} onClick={()=>{setCustomConcentrationMode(true);setCustomConcentration("");setConcConfirmed(false)}}><b>Custom</b><span>Physical label is different</span></button>';
    const extraButtons='{fieldConcentrations.slice(1).map((item,index)=><button type="button" key={`${item.label||item.concentration}-${index}`} className={!customConcentrationMode&&concConfirmed&&fieldConcentrationIndex===index+1?"selected":""} onClick={()=>{setFieldConcentrationIndex(index+1);setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);if(medication.id==="epinephrine"){setPath(null);setRoute("");setStep("indication");return;}if(returnToResult&&path){setReturnToResult(false);setStep("result")}else if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}}><b>{item.label||`${fmt(Number(item.concentration))} ${concentrationUnit}/mL`}</b><span>{fmt(Number(item.concentration))} {concentrationUnit}/mL • Department/Admin</span></button>)}';
    if(!code.includes(customButton))throw new Error("MedicationEngine custom concentration button signature changed");
    code=code.replace(customButton,extraButtons+customButton);

    return {code,map:null};
  },
};

export default defineConfig({ plugins: [clinicalMedicationOverrides,react()] });