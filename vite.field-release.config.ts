import {defineConfig,type Plugin,type UserConfig} from "vite";
import standardizedConfig from "./vite.standardized-workflow.config";

const temporaryFieldRelease:Plugin={
  name:"temporary-field-release-all-source-meds",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx")){
      const approvalGate='const approvedMeds=useMemo(()=>meds.filter(({status})=>status.state==="approved"),[meds]);';
      const releasedGate='const approvedMeds=useMemo(()=>meds,[meds]);';
      if(!code.includes(approvalGate))throw new Error("FieldApp approval gate signature changed");
      code=code.replace(approvalGate,releasedGate);
      const searchOld='const q=query.trim().toLowerCase();if(!q)return true;\n    const hay=[id,def.name,brandNames[id],def.protocolId,...(aliases[id]||[]),...def.paths.flatMap(p=>[p.label,p.protocol])].filter(Boolean).join(" ").toLowerCase();return hay.includes(q);';
      const searchNew='const terms=query.trim().toLocaleLowerCase().split(/\\s+/).filter(Boolean);if(!terms.length)return true;\n    const hay=[id,def.name,brandNames[id],def.protocolId,`dmp ${def.protocolId}`,`protocol ${def.protocolId}`,...(aliases[id]||[]),...def.paths.flatMap(p=>[p.label,p.protocol])].filter(Boolean).join(" ").toLocaleLowerCase();return terms.every(term=>hay.includes(term));';
      if(!code.includes(searchOld))throw new Error("FieldApp search filter signature changed");
      code=code.replace(searchOld,searchNew);
      return {code,map:null};
    }

    if(id.endsWith("/src/MedicationEngine.tsx")){
      const reasonAnchor='if(path.agent==="Midazolam")return midazolamReasonLabel(path);';
      const fentanylReason='if(path.agent==="Midazolam")return midazolamReasonLabel(path);\n  if(path.agent==="Fentanyl"&&path.formula.kind==="perKg")return `Moderate to severe pain — ${path.formula.amount} mcg/kg`;';
      if(!code.includes(reasonAnchor))throw new Error("Standardized reason helper signature changed before fentanyl dose-choice transform");
      code=code.replace(reasonAnchor,fentanylReason);
      const importAnchor='import WeightQuickSelect from "./WeightQuickSelect";';
      const ageImport='import WeightQuickSelect from "./WeightQuickSelect";\nimport ProtocolAgeQuickSelect from "./ProtocolAgeQuickSelect";';
      if(!code.includes(importAnchor))throw new Error("MedicationEngine weight quick-select import signature changed");
      code=code.replace(importAnchor,ageImport);
      const ageChangesOld='ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id))';
      const ageChangesNew='ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id)||(medication.id==="fentanyl"&&path.patient==="adult"))';
      if(code.includes(ageChangesOld))code=code.replace(ageChangesOld,ageChangesNew);else if(!code.includes(ageChangesNew))throw new Error("MedicationEngine age-sensitive medication signature changed");
      const editState='[dopamineRate,setDopamineRate]=useState(5),[dropFactor,setDropFactor]=useState(60),[returnToResult,setReturnToResult]=useState(false),[editingFinalDose,setEditingFinalDose]=useState(false);';
      const editStateWithAge='[dopamineRate,setDopamineRate]=useState(5),[dropFactor,setDropFactor]=useState(60),[returnToResult,setReturnToResult]=useState(false),[editingFinalDose,setEditingFinalDose]=useState(false),[selectedAgeLabel,setSelectedAgeLabel]=useState("");';
      if(!code.includes(editState))throw new Error("MedicationEngine age-label state anchor changed");code=code.replace(editState,editStateWithAge);
      const patientTextOld='patientText=ageChangesDose&&age!==""?`${age} ${ageUnit}${needsWeight&&kg>0?` • ${fmt(kg)} kg${weightSource?` • ${weightSource}`:""}`:""}`:needsWeight&&kg>0?`${fmt(kg)} kg${weightSource?` • ${weightSource}`:""}`:path?path.patient==="adult"?"Adult pathway":path.patient==="pediatric"?"Pediatric pathway":"All ages":"",';
      const patientTextNew='patientText=ageChangesDose&&age!==""?`${selectedAgeLabel||`${age} ${ageUnit}`}${needsWeight&&kg>0?` • ${fmt(kg)} kg${weightSource?` • ${weightSource}`:""}`:""}`:needsWeight&&kg>0?`${fmt(kg)} kg${weightSource?` • ${weightSource}`:""}`:path?path.patient==="adult"?"Adult pathway":path.patient==="pediatric"?"Pediatric pathway":"All ages":"",';
      if(!code.includes(patientTextOld))throw new Error("MedicationEngine patient summary signature changed");code=code.replace(patientTextOld,patientTextNew);
      const ageUi='{ageRequired&&<><label className="giant-input"><span>Patient age</span><input autoFocus inputMode="decimal" value={age} onChange={e=>setAge(e.target.value)} placeholder="0"/></label><div className="age-unit-toggle">{(["years","months","days"] as AgeUnit[]).map(x=><button key={x} className={ageUnit===x?"selected":""} onClick={()=>setAgeUnit(x)}>{x}</button>)}</div></>}';
      const ageQuick='{ageRequired&&<ProtocolAgeQuickSelect medicationId={medication.id} path={path} value={age} onSelect={(years,label,doseMode)=>{setAgeUnit("years");setAge(String(years));setSelectedAgeLabel(label);if(medication.id==="fentanyl"){setWeight("");setWeightSource("")}if(doseMode==="half"&&medication.id==="midazolam"){const halfPath=agentPaths.find(candidate=>candidate.id===`${path.id}-half`);if(halfPath)setPath(halfPath)}else if(doseMode==="fentanyl-low"&&medication.id==="fentanyl"&&path.formula.kind==="perKg"&&path.formula.amount>1){const lowPath=agentPaths.find(candidate=>candidate.id===`${path.id}-low`);if(lowPath)setPath(lowPath)}setContraChecks([]);setSpecialChecks([])}} onExact={(value)=>{setAgeUnit("years");setAge(value);setSelectedAgeLabel(value?`${value} years`:"");if(medication.id==="fentanyl"){setWeight("");setWeightSource("")}setContraChecks([]);setSpecialChecks([])}}/>}';
      if(!code.includes(ageUi))throw new Error("MedicationEngine age-entry signature changed");code=code.replace(ageUi,ageQuick);
      const weightUi='}{needsWeight&&<WeightQuickSelect';const orderedWeightUi='}{needsWeight&&(!ageRequired||age!=="")&&<WeightQuickSelect';if(!code.includes(weightUi))throw new Error("MedicationEngine weight display signature changed");code=code.replace(weightUi,orderedWeightUi);
      return {code,map:null};
    }
    return null;
  },
};
const base=standardizedConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),temporaryFieldRelease]});
