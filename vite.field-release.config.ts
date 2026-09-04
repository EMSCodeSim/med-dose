import {defineConfig,type Plugin,type UserConfig} from "vite";
import standardizedConfig from "./vite.standardized-workflow.config";

const temporaryFieldRelease:Plugin={
  name:"temporary-field-release-all-source-meds",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx")){
      // Temporary field release behavior only: expose the source medication list
      // while formal cross-device approval/release remains unfinished. Core UI such
      // as Report, Ketamine metadata, vial art and home layout now live in FieldApp
      // source and must never be injected here.
      const approvalGate='const approvedMeds=useMemo(()=>meds.filter(({status})=>status.state==="approved"),[meds]);';
      const releasedGate='const approvedMeds=useMemo(()=>meds,[meds]);';
      if(!code.includes(approvalGate))throw new Error("FieldApp approval gate signature changed");
      code=code.replace(approvalGate,releasedGate);
      return {code,map:null};
    }

    if(id.endsWith("/src/MedicationEngine.tsx")){
      // Fentanyl uses explicit dose choices wherever the protocol provides a range.
      // Adult IV/IO/IM/IN and pediatric IV/IO/IM use 1 vs 2 mcg/kg choices;
      // pediatric IN remains a fixed 2 mcg/kg pathway.
      const reasonAnchor='if(path.agent==="Midazolam")return midazolamReasonLabel(path);';
      const fentanylReason='if(path.agent==="Midazolam")return midazolamReasonLabel(path);\n  if(path.agent==="Fentanyl"&&path.formula.kind==="perKg")return `Moderate to severe pain — ${path.formula.amount} mcg/kg`;';
      if(!code.includes(reasonAnchor))throw new Error("Standardized reason helper signature changed before fentanyl dose-choice transform");
      code=code.replace(reasonAnchor,fentanylReason);

      const importAnchor='import WeightQuickSelect from "./WeightQuickSelect";';
      const ageImport='import WeightQuickSelect from "./WeightQuickSelect";\nimport ProtocolAgeQuickSelect from "./ProtocolAgeQuickSelect";';
      if(!code.includes(importAnchor))throw new Error("MedicationEngine weight quick-select import signature changed");
      code=code.replace(importAnchor,ageImport);

      // Fentanyl does not have a mandatory elderly half-dose, but age >65 is a
      // protocol-relevant decision because crews should strongly consider the
      // lower end of the allowed 1–2 mcg/kg range. Force an adult age checkpoint.
      const ageChangesOld='ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id))';
      const ageChangesNew='ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id)||(medication.id==="fentanyl"&&path.patient==="adult"))';
      if(code.includes(ageChangesOld))code=code.replace(ageChangesOld,ageChangesNew);
      else if(!code.includes(ageChangesNew))throw new Error("MedicationEngine age-sensitive medication signature changed");

      const activeAgeOld='const activeAgeRequired=activePath.formula.kind==="ageBands"||activePath.minAge!==undefined||activePath.maxAge!==undefined;';
      const activeAgeNew='const activeAgeRequired=activePath.formula.kind==="ageBands"||activePath.minAge!==undefined||activePath.maxAge!==undefined||(medication.id==="fentanyl"&&activePath.patient==="adult");';
      if(code.includes(activeAgeOld))code=code.replace(activeAgeOld,activeAgeNew);
      else if(!code.includes(activeAgeNew))throw new Error("MedicationEngine route age-check signature changed");

      const ageUi='{ageRequired&&<><label className="giant-input"><span>Patient age</span><input autoFocus inputMode="decimal" value={age} onChange={e=>setAge(e.target.value)} placeholder="0"/></label><div className="age-unit-toggle">{(["years","months","days"] as AgeUnit[]).map(x=><button key={x} className={ageUnit===x?"selected":""} onClick={()=>setAgeUnit(x)}>{x}</button>)}</div></>}';
      const ageQuick='{ageRequired&&<ProtocolAgeQuickSelect medicationId={medication.id} path={path} value={age} onSelect={(years,_label,doseMode)=>{setAgeUnit("years");setAge(String(years));if(medication.id==="fentanyl"){setWeight("");setWeightSource("")}if(doseMode==="half"&&medication.id==="midazolam"){const halfPath=agentPaths.find(candidate=>candidate.id===`${path.id}-half`);if(halfPath)setPath(halfPath)}else if(doseMode==="fentanyl-low"&&medication.id==="fentanyl"&&path.formula.kind==="perKg"&&path.formula.amount>1){const lowPath=agentPaths.find(candidate=>candidate.id===`${path.id}-low`);if(lowPath)setPath(lowPath)}setContraChecks([]);setSpecialChecks([])}} onExact={(value)=>{setAgeUnit("years");setAge(value);if(medication.id==="fentanyl"){setWeight("");setWeightSource("")}setContraChecks([]);setSpecialChecks([])}}/>}';
      if(!code.includes(ageUi))throw new Error("MedicationEngine age-entry signature changed");
      code=code.replace(ageUi,ageQuick);
      return {code,map:null};
    }

    return null;
  },
};

const base=standardizedConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),temporaryFieldRelease]});
