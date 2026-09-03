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

      const reportImport='import MedicationEngine from "./MedicationEngine";';
      const reportImportNew='import MedicationEngine from "./MedicationEngine";\nimport EncounterReport from "./EncounterReport";';
      if(!code.includes(reportImport))throw new Error("FieldApp MedicationEngine import signature changed");
      code=code.replace(reportImport,reportImportNew);

      const reportState='[favorites,setFavorites]=useState<string[]>(()=>readList("mmd-favorites")),[recent,setRecent]=useState<string[]>(()=>readList("mmd-recent"));';
      const reportStateNew='[favorites,setFavorites]=useState<string[]>(()=>readList("mmd-favorites")),[recent,setRecent]=useState<string[]>(()=>readList("mmd-recent")),[reportOpen,setReportOpen]=useState(false),[administrations,setAdministrations]=useState<any[]>([]);';
      if(!code.includes(reportState))throw new Error("FieldApp report state signature changed");
      code=code.replace(reportState,reportStateNew);

      const badgeOld='<em className="reviewed">Reviewed</em><span>Metro DMP {def.protocolId} • Verified {verified}</span>';
      const badgeNew='<em className={status.state==="approved"?"reviewed":"in-review"}>{status.state==="approved"?"Reviewed":"In review"}</em><span>Metro DMP {def.protocolId} • {status.state==="approved"?`Verified ${verified}`:"Review pending"}</span>';
      if(!code.includes(badgeOld))throw new Error("FieldApp review badge signature changed");
      code=code.replace(badgeOld,badgeNew);

      const ketamineCategory='nitroglycerin:["Adult","Cardiac"], ketorolac:["Adult","Peds","Pain/Sedation"], fentanyl:["Adult","Peds","Pain/Sedation"],';
      const ketamineCategoryNew='nitroglycerin:["Adult","Cardiac"], ketorolac:["Adult","Peds","Pain/Sedation"], fentanyl:["Adult","Peds","Pain/Sedation"], ketamine:["Adult","Pain/Sedation"],';
      if(code.includes(ketamineCategory))code=code.replace(ketamineCategory,ketamineCategoryNew);

      const ketamineAlias='midazolam:["versed","seizure","sedation"], fentanyl:["pain","opioid"], epinephrine:';
      const ketamineAliasNew='midazolam:["versed","seizure","sedation"], fentanyl:["pain","opioid"], ketamine:["ketamine","ketalar","pain","analgesia"], epinephrine:';
      if(code.includes(ketamineAlias))code=code.replace(ketamineAlias,ketamineAliasNew);

      const vialOld='<div className="vial-art" aria-hidden="true"><span></span><b>{def.name.slice(0,3).toUpperCase()}</b></div>';
      const vialNew='<div className={`vial-art ${id==="adenosine"?"has-photo":""}`} aria-hidden="true">{id==="adenosine"?<img src="/medications/adenosine-vial.webp" alt=""/>:<><span></span><b>{def.name.slice(0,3).toUpperCase()}</b></>}</div>';
      if(!code.includes(vialOld))throw new Error("FieldApp vial art signature changed");
      code=code.replace(vialOld,vialNew);

      const recordOld='<MedicationEngine medication={selected} close={()=>setSelectedId(null)} record={()=>undefined} openProtocol={()=>window.open("/protocols/dmp-current.pdf","_blank","noopener,noreferrer")} initialPatient={initialPatient}/>';
      const recordNew='<div className="field-report-bar"><button disabled={!administrations.length} onClick={()=>setReportOpen(true)}>Report{administrations.length?` (${administrations.length})`:""}</button></div>{reportOpen&&<EncounterReport entries={administrations} close={()=>setReportOpen(false)}/>}<MedicationEngine medication={selected} close={()=>setSelectedId(null)} record={entry=>setAdministrations(items=>[...items,entry])} openProtocol={()=>window.open("/protocols/dmp-current.pdf","_blank","noopener,noreferrer")} initialPatient={initialPatient}/>';
      if(!code.includes(recordOld))throw new Error("FieldApp medication record callback signature changed");
      code=code.replace(recordOld,recordNew);

      const homeHeader='<header className="field-header"><div className="field-brand"><span className="star">✚</span><strong>Metro Med Dose</strong></div><span className={`connect-pill ${online?"online":"offline"}`}>{online?"Offline ready":"Offline"}</span></header>';
      const homeHeaderNew=homeHeader+'{administrations.length>0&&<button className="field-home-report" onClick={()=>setReportOpen(true)}>Report • {administrations.length} administration{administrations.length===1?"":"s"}</button>}{reportOpen&&<EncounterReport entries={administrations} close={()=>setReportOpen(false)}/>}';
      if(!code.includes(homeHeader))throw new Error("FieldApp home header signature changed for report access");
      code=code.replace(homeHeader,homeHeaderNew);

      // Field home is medication-first. Age and weight belong inside a selected
      // protocol pathway only when that pathway actually requires them.
      const patientStart='      <section className={`patient-card';
      const afterPatient='      {!online&&';
      const patientIndex=code.indexOf(patientStart),afterPatientIndex=code.indexOf(afterPatient,patientIndex);
      if(patientIndex<0||afterPatientIndex<0)throw new Error("FieldApp home patient controls signature changed");
      code=code.slice(0,patientIndex)+code.slice(afterPatientIndex);

      const stripStart='    <button className="engine-patient-strip"';
      const stripEnd='    </button>\n';
      const stripIndex=code.indexOf(stripStart),stripEndIndex=code.indexOf(stripEnd,stripIndex);
      if(stripIndex>=0&&stripEndIndex>=0)code=code.slice(0,stripIndex)+code.slice(stripEndIndex+stripEnd.length);

      return {code,map:null};
    }

    if(id.endsWith("/src/MedicationEngine.tsx")){
      // Fentanyl has an intentional 1–2 mcg/kg protocol range for most adult
      // and pediatric IV/IO/IM pathways. Keep those as separate user choices
      // while still grouping route-specific copies of the same dose.
      const reasonAnchor='if(path.agent==="Midazolam")return midazolamReasonLabel(path);';
      const fentanylReason='if(path.agent==="Midazolam")return midazolamReasonLabel(path);\n  if(path.agent==="Fentanyl"&&path.formula.kind==="perKg")return `Moderate to severe pain — ${path.formula.amount} mcg/kg`;';
      if(!code.includes(reasonAnchor))throw new Error("Standardized reason helper signature changed before fentanyl dose-choice transform");
      code=code.replace(reasonAnchor,fentanylReason);

      const importAnchor='import WeightQuickSelect from "./WeightQuickSelect";';
      const ageImport='import WeightQuickSelect from "./WeightQuickSelect";\nimport ProtocolAgeQuickSelect from "./ProtocolAgeQuickSelect";';
      if(!code.includes(importAnchor))throw new Error("MedicationEngine weight quick-select import signature changed");
      code=code.replace(importAnchor,ageImport);

      const ageUi='{ageRequired&&<><label className="giant-input"><span>Patient age</span><input autoFocus inputMode="decimal" value={age} onChange={e=>setAge(e.target.value)} placeholder="0"/></label><div className="age-unit-toggle">{(["years","months","days"] as AgeUnit[]).map(x=><button key={x} className={ageUnit===x?"selected":""} onClick={()=>setAgeUnit(x)}>{x}</button>)}</div></>}';
      const ageQuick='{ageRequired&&<ProtocolAgeQuickSelect medicationId={medication.id} path={path} value={age} onSelect={(years)=>{setAgeUnit("years");setAge(String(years));setContraChecks([]);setSpecialChecks([])}} onExact={(value)=>{setAgeUnit("years");setAge(value);setContraChecks([]);setSpecialChecks([])}}/>}';
      if(!code.includes(ageUi))throw new Error("MedicationEngine age-entry signature changed");
      code=code.replace(ageUi,ageQuick);
      return {code,map:null};
    }

    return null;
  },
};

const base=standardizedConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),temporaryFieldRelease]});
