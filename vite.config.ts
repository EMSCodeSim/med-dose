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
      const cardInfoReplacement='<span>{def.paths.length?`${def.paths.slice(0,2).map(path=>path.label).join(" • ")}${def.paths.length>2?` • +${def.paths.length-2} more`:""}`:med?.sub||subtitles[id]||`DMP ${def.protocolId}`}</span>';
      if(!code.includes(cardInfoSignature))throw new Error("UnifiedApp medication card information signature changed");
      code=code.replace(cardInfoSignature,cardInfoReplacement);

      const footerSignature='<span>{visibleIds.length} released medications • one renderer • one state machine</span>';
      const footerReplacement='<span>{drugSearch?`${filteredVisibleIds.length} matching medications`:`${visibleIds.length} released medications`} • one renderer • one state machine</span>';
      if(!code.includes(footerSignature))throw new Error("UnifiedApp footer signature changed");
      code=code.replace(footerSignature,footerReplacement);

      return {code,map:null};
    }

    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;

    const singleConcentration='const fieldConcentration=useMemo(()=>fieldConcentrationFor(medication.id),[medication.id]);';
    const multiConcentration='const fieldConcentrations=useMemo(()=>fieldConcentrationsFor(medication.id),[medication.id]),[fieldConcentrationIndex,setFieldConcentrationIndex]=useState(0),fieldConcentration=fieldConcentrations[fieldConcentrationIndex]||null;';
    if(!code.includes(singleConcentration))throw new Error("MedicationEngine concentration state signature changed");
    code=code.replace(singleConcentration,multiConcentration);

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

    const oldAgentPaths='agentPaths=selectedAgentPaths,agentConcentrationPath=';
    const newAgentPaths='agentPaths=selectedAgentPaths.filter(path=>epinephrinePathMatchesConcentration(path,conc,medication.id)),agentConcentrationPath=';
    if(!code.includes(oldAgentPaths))throw new Error("MedicationEngine agent path signature changed");
    code=code.replace(oldAgentPaths,newAgentPaths);

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
