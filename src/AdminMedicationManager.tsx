import {useEffect,useMemo,useState,type ReactNode} from "react";
import {genericMedication} from "./dmpMedicationData";
import {
  addMonths,
  deepClone,
  formatReviewDate,
  initialAdminRecord,
  loadClinicalOverrides,
  loadMedicationAdminState,
  REVIEW_INTERVAL_MONTHS,
  reviewTiming,
  saveClinicalOverrides,
  saveMedicationAdminState,
  signatureCount,
  type MedicationAdminRecord,
  type MedicationAdminState,
  type ReviewSignatures,
} from "./adminMedicationStore";
import {
  loadMedicationCatalogState,
  medicationCatalogVisible,
  saveCatalogMedication,
  type CatalogMedication,
} from "./medicationCatalogStore";
import {CURRENT_DMP_PROTOCOL_REVISION,DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";
import "./adminMedicationManager.css";

type Reviews=Record<string,ReviewSignatures>;
type Props={medications:CatalogMedication[];reviews:Reviews;setReviews:(reviews:Reviews)=>void;openLegacyReview:(id:string)=>void;close:()=>void};
type JsonObject=Record<string,any>;
type Concentration={label?:string;amount?:number;amountUnit?:string;volume?:number;volumeUnit?:string;concentration?:number;concentrationUnit?:string};
type DoseFormula={kind:string;amount?:number;min?:number;max?:number;unit?:string;text?:string;bands?:Array<{min:number;max:number;amount:number;label:string}>};
type DosePath=JsonObject&{id:string;label:string;agent:string;patient:string;route:string;formula:DoseFormula;repeat:string;administration:string;protocol:string};

const DEFAULT_VISIBLE_IDS=[...DEFAULT_FIELD_MEDICATION_IDS];
const doseUnits=["mg","mcg","g","mEq","mL","drops","sprays","device","treatment"];
const patientGroups=["adult","pediatric","all"];
const formulaKinds=["fixed","range","perKg","ageBands","instruction"];

const specialDefaults:Record<string,JsonObject>={
  fentanyl:{id:"fentanyl",name:"Fentanyl",protocolId:"9230",page:163,category:"Opioid analgesic",indications:["Moderate to severe pain in a hemodynamically stable patient"],routes:["IV/IO","IM","IN"],concentrations:[{label:"50 mcg/mL",amount:50,amountUnit:"mcg",volume:1,volumeUnit:"mL",concentration:50,concentrationUnit:"mcg/mL"}],doseRules:{adult:"1–2 mcg/kg; typical adult initial dose 100 mcg and doses may be rounded to nearest 25 mcg",olderFrail:"Start with 1/2 traditional dose",pediatricIVIM:"1 mcg/kg",pediatricIN:"2 mcg/kg",cumulativeIVIM:"3 mcg/kg",cumulativeIN:"4 mcg/kg",repeatIVIMMinutes:5,repeatINMinutes:10},contraindications:["Hemodynamic instability or shock","Respiratory depression","Opioid + benzodiazepine coadministration requires direct physician verbal order"],monitoring:["Continuous pulse oximetry and respiratory reassessment","Naloxone and resuscitation equipment immediately available"],administration:["IN: divide equally between nostrils; app limit 1 mL per nostril","IM: IV is preferred for accurate titration","IV/IO: administer slowly and titrate to tolerable pain"]},
  midazolam:{id:"midazolam",name:"Midazolam (Versed)",protocolId:"9070",page:136,category:"Benzodiazepine",indications:["Status epilepticus","Sedation for cardioversion","Sedation for transcutaneous pacing","Agitated/combative patient — IMC-RASS +3/+4","Imminent risk of bodily harm — IMC-RASS +4"],routes:["IV/IO","IM","IN"],doseRules:{adultSeizureIVIO:"5 mg",adultSeizureIMIN:"10 mg",adultSedationIVIO:"2 mg",adultSedationIMIN:"5 mg",agitationAdult:"5 mg",imminentRiskAdultIM:"10 mg",pediatricIVIO:"0.1 mg/kg",pediatricIMIN:"0.2 mg/kg",repeat:"Routine seizure/sedation pathway may repeat once after 5 minutes; agitation pathway reassess at 5 minutes"},contraindications:["Hypotension for selected treatment pathway","Respiratory depression","Opioid coadministration requires direct physician verbal order"],monitoring:["Continuous ECG and SpO2","Continuous ventilation monitoring / waveform capnography when available","Reassess airway, respiratory rate, blood pressure, perfusion and sedation score"]},
  ketamine:{id:"ketamine",name:"Ketamine",protocolId:"500:62",page:1,category:"Adult analgesia waiver",indications:["Moderate to severe pain in an adult"],routes:["IV/IO"],concentrations:[{label:"200 mg / 20 mL",amount:200,amountUnit:"mg",volume:20,volumeUnit:"mL",concentration:10,concentrationUnit:"mg/mL"}],doseRules:{adult:"0.25 mg/kg",rounding:"Waiver chart uses whole-mg dose",repeat:"One standing-order repeat after reassessment; Base contact for subsequent doses"},contraindications:["Pediatric patient","Penetrating eye trauma"],monitoring:["Continuous cardiac monitoring","Pulse oximetry","Continuous waveform capnography","BVM ventilation and suction immediately available"],administration:["Mix in 50–100 mL NS","Administer over 5–10 minutes when conditions allow","Slow IV push permitted when mixing is not possible but may cause more dysphoria"]},
  adenosine:{id:"adenosine",name:"Adenosine",protocolId:"9010",page:123,category:"Antiarrhythmic",indications:["Regular narrow-complex AV nodal reentrant tachycardia"],routes:["IV"],doseRules:{adultInitial:"12 mg rapid IV",adultRepeat:"One additional 12 mg rapid IV dose",pediatricInitial:"0.1 mg/kg; max 6 mg; direct Base order",pediatricRepeat:"0.2 mg/kg; max 12 mg; direct Base order"},contraindications:["Irregular tachycardia","Heart transplant history"],monitoring:["Continuous ECG monitoring","Warn patient about brief unpleasant chest discomfort","Asthma/bronchospasm precaution reviewed"],administration:["Rapid IV bolus followed immediately by normal saline flush"]},
  albuterol:{id:"albuterol",name:"Albuterol",protocolId:"9020",page:125,category:"Bronchodilator",indications:["Wheezing associated with allergic reaction","Bronchospasm — single nebulizer dose","Severe bronchospasm — continuous nebulizer dose","Hyperkalemia or crush injury — continuous nebulizer dose"],routes:["Nebulized"],doseRules:{single:"2.5 mg in 3 mL",continuous:"7.5 mg in 9 mL",repeatSingle:"May repeat twice for total of 3 single doses"},administration:["Nebulize at 6–8 L/min"]},
  diphenhydramine:{id:"diphenhydramine",name:"Diphenhydramine",protocolId:"9100",page:144,category:"Antihistamine",indications:["Allergic reaction","Dystonic medication reaction or akathisia"],routes:["IV/IO","IM"],doseRules:{adult:"50 mg",adultOver65:"25 mg",pediatric:"1 mg/kg; max 50 mg"},contraindications:["Use caution in asthma/COPD because secretions may thicken","Narrow-angle glaucoma precaution","Patients over 65 receive the reduced 25 mg dose"],monitoring:["Monitor mental status, airway and respiratory status","Watch for drowsiness and additive CNS-depressant effects"],administration:["Slow IV/IO/IM","For mild reactions consider PO per protocol"]},
  methylprednisolone:{id:"methylprednisolone",name:"Methylprednisolone",protocolId:"9200",page:158,category:"Corticosteroid",indications:["Allergic reaction / anaphylaxis","Severe asthma or COPD","Suspected Addisonian crisis"],routes:["IV/IO"],doseRules:{adult:"125 mg",pediatric:"2 mg/kg; max 125 mg"},contraindications:["Active gastrointestinal bleeding precaution"],monitoring:["Delayed onset: do not delay transport or primary airway/ventilation treatment"],administration:["Slow IV/IO bolus over 2 minutes","Reconstitute and use immediately"]},
  magnesium:{id:"magnesium",name:"Magnesium Sulfate",protocolId:"9190",page:157,category:"Electrolyte / antiarrhythmic / bronchodilator",indications:["Torsades — stable/intermittent","Torsades — unstable/peri-arrest","Torsades — cardiac arrest","Refractory severe bronchospasm","Eclampsia"],routes:["IV/IO","IV","IM"],administration:["Route and infusion duration depend on indication","Eclampsia IM pathway splits dose between buttocks when used"]},
  epinephrine:{id:"epinephrine",name:"Epinephrine",protocolId:"9120",page:148,category:"Adrenergic agonist",indications:["Pulseless arrest","Systemic allergic reaction — IM","Wheezing — IM","Hypotension or refractory anaphylaxis — push dose","Hypotension or refractory anaphylaxis — infusion","Pediatric severe anaphylaxis — Base push dose","Bradycardia with poor perfusion","Stridor at rest — alternative to racemic epinephrine","Systemic allergic reaction — auto-injector"],routes:["IV/IO","IM","Nebulized"],concentrations:[{label:"1:10,000",concentration:0.1,concentrationUnit:"mg/mL"},{label:"1:1,000",concentration:1,concentrationUnit:"mg/mL"}],administration:["Calculator enforces indication-specific concentration and route matching"],notes:["Adult push-dose Epinephrine preparation is agency-specific in DMP 9120. Confirm the department-approved mixing guidance before review approval."]}
};

const clone=(value:any)=>deepClone(value) as JsonObject;
const arrays=(value:any):string[]=>Array.isArray(value)?value.map(String):[];
const num=(value:string)=>value.trim()===""?undefined:Number(value);
const baseData=(med:CatalogMedication):JsonObject=>{
  const overrides=loadClinicalOverrides();
  if(overrides[med.id]&&typeof overrides[med.id]==="object")return clone(overrides[med.id]);
  const generic=genericMedication(med.id);
  if(generic)return clone(generic);
  if(specialDefaults[med.id])return clone(specialDefaults[med.id]);
  return {id:med.id,name:med.name,protocolId:med.protocol.id,page:med.protocol.page,contraindications:[],concentrations:[],paths:[]};
};
const getRecord=(state:MedicationAdminState,id:string)=>state[id]||initialAdminRecord(id);
const statusLabel=(record:MedicationAdminRecord,signatures:ReviewSignatures)=>{
  const count=signatureCount(signatures),timing=reviewTiming(record);
  if(record.draft)return count?`CHANGES PENDING • ${count}/3`:"CHANGES PENDING";
  if(record.reviewStartedAt)return `REVIEW IN PROGRESS • ${count}/3`;
  if(timing==="overdue")return "REVIEW OVERDUE";
  if(timing==="due-soon")return "REVIEW DUE SOON";
  if(record.lastCompletedAt)return "CURRENT";
  return count===3?"REVIEW COMPLETE":"NOT REVIEWED";
};
const diffSummary=(before:any,after:any)=>{
  if(JSON.stringify(before)===JSON.stringify(after))return [];
  const b=before&&typeof before==="object"&&!Array.isArray(before)?before:{};
  const a=after&&typeof after==="object"&&!Array.isArray(after)?after:{};
  return Array.from(new Set([...Object.keys(b),...Object.keys(a)])).filter(key=>JSON.stringify(b[key])!==JSON.stringify(a[key])).map(key=>`${key}: changed`);
};
const slugify=(text:string)=>text.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export default function AdminMedicationManager({medications,reviews,setReviews,openLegacyReview,close}:Props){
  const [state,setState]=useState<MedicationAdminState>(()=>loadMedicationAdminState());
  const [catalog,setCatalog]=useState<CatalogMedication[]>(()=>medications);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  const [editorData,setEditorData]=useState<JsonObject|null>(null);
  const [editorCatalog,setEditorCatalog]=useState<CatalogMedication|null>(null);
  const [protocolRevision,setProtocolRevision]=useState("");
  const [search,setSearch]=useState("");
  const [error,setError]=useState("");
  const [savedMessage,setSavedMessage]=useState("");
  const [adding,setAdding]=useState(false);
  const [newMed,setNewMed]=useState({name:"",brand:"",category:"",protocolId:"",protocolName:"",page:""});
  const [catalogDirty,setCatalogDirty]=useState(false);
  const overrides=useMemo(()=>loadClinicalOverrides(),[state]);
  const selected=selectedId?catalog.find(m=>m.id===selectedId)||null:null;
  const record=selectedId?getRecord(state,selectedId):null;
  const publishedData=selected?((overrides[selected.id] as JsonObject|undefined)||baseData(selected)):null;
  const currentData=record?.draft?(record.draft as JsonObject):publishedData;
  const filtered=catalog.filter(m=>`${m.name} ${m.brand} ${m.protocol.id}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(Boolean(a.retired))-Number(Boolean(b.retired))||a.name.localeCompare(b.name));

  const closeAdmin=()=>{if(catalogDirty){window.location.reload();return}close()};
  const persist=(next:MedicationAdminState)=>{setState(next);saveMedicationAdminState(next)};
  const updateRecord=(id:string,fn:(record:MedicationAdminRecord)=>MedicationAdminRecord)=>{const next={...state,[id]:fn(getRecord(state,id))};persist(next)};
  const resetSignatures=(id:string)=>setReviews({...reviews,[id]:{}});
  const saveCatalogLocal=(item:CatalogMedication)=>{saveCatalogMedication(item);setCatalog(items=>items.some(x=>x.id===item.id)?items.map(x=>x.id===item.id?item:x):[...items,item]);setCatalogDirty(true)};
  const beginReview=(id:string)=>{const signatures=reviews[id]||{};updateRecord(id,r=>({...r,reviewStartedAt:Date.now()}));if(signatureCount(signatures)>0)resetSignatures(id)};
  const beginEdit=()=>{if(!selected||!currentData)return;setEditorData(clone(currentData));setEditorCatalog({...selected,protocol:{...selected.protocol}});setProtocolRevision(record?.protocolRevision||CURRENT_DMP_PROTOCOL_REVISION);setError("");setSavedMessage("");setEditing(true)};

  const normalizeClinical=(data:JsonObject)=>{
    const next=deepClone(data) as JsonObject;
    const trimList=(value:any)=>Array.isArray(value)?value.map(item=>typeof item==="string"?item.trim():item).filter(item=>typeof item!=="string"||item.length>0):value;
    for(const key of ["indications","routes","contraindications","monitoring","administration","notes"])if(key in next)next[key]=trimList(next[key]);
    if(Array.isArray(next.concentrations))next.concentrations=next.concentrations.map((raw:Concentration)=>{
      const item={...raw,label:String(raw.label||"").trim(),amountUnit:String(raw.amountUnit||"").trim(),volumeUnit:String(raw.volumeUnit||"mL").trim(),concentrationUnit:String(raw.concentrationUnit||"").trim()};
      if(Number.isFinite(item.amount)&&Number(item.amount)>0&&Number.isFinite(item.volume)&&Number(item.volume)>0)item.concentration=Number(item.amount)/Number(item.volume);
      return item;
    });
    if(Array.isArray(next.paths))next.paths=next.paths.map((raw:DosePath)=>({...raw,id:String(raw.id||"").trim(),label:String(raw.label||"").trim(),agent:String(raw.agent||"").trim(),route:String(raw.route||"").trim(),protocol:String(raw.protocol||"").trim(),repeat:String(raw.repeat||"").trim(),administration:String(raw.administration||"").trim(),baseContact:typeof raw.baseContact==="string"?raw.baseContact.trim():raw.baseContact,monitoring:trimList(raw.monitoring),special:trimList(raw.special)}));
    return next;
  };
  const validateClinical=(data:JsonObject)=>{
    if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Medication clinical data must be a valid record.");
    if(!String(data.name||"").trim())throw new Error("Medication name is required.");
    if(!String(data.protocolId||"").trim())throw new Error("Protocol / medication ID is required.");
    if(Array.isArray(data.concentrations)){
      for(const [index,raw] of (data.concentrations as Concentration[]).entries()){
        const label=raw.label?.trim()||`Concentration ${index+1}`;
        const hasAmount=raw.amount!==undefined,hasVolume=raw.volume!==undefined,hasConcentration=raw.concentration!==undefined;
        if(hasAmount!==hasVolume)throw new Error(`${label}: enter both medication amount and vial volume, or leave both blank.`);
        if(hasAmount&&(!(Number(raw.amount)>0)||!(Number(raw.volume)>0)))throw new Error(`${label}: medication amount and vial volume must be greater than zero.`);
        if(hasConcentration&&(!(Number(raw.concentration)>0)||!Number.isFinite(Number(raw.concentration))))throw new Error(`${label}: concentration must be greater than zero.`);
        if(hasAmount&&hasVolume){
          if(!raw.amountUnit?.trim())throw new Error(`${label}: amount unit is required.`);
          if(!raw.concentrationUnit?.trim())throw new Error(`${label}: concentration unit is required.`);
          const calculated=Number(raw.amount)/Number(raw.volume);
          if(hasConcentration&&Math.abs(Number(raw.concentration)-calculated)>Math.max(.0001,calculated*.001))throw new Error(`${label}: concentration does not match amount ÷ volume.`);
        }else if(!hasConcentration)throw new Error(`${label}: enter amount + volume or a direct concentration.`);
      }
    }
    if(Array.isArray(data.paths)){
      const ids=new Set<string>();
      for(const raw of data.paths as DosePath[]){
        const label=raw.label?.trim()||raw.id||"Treatment path";
        if(!raw.id?.trim())throw new Error("Every treatment path needs an ID.");
        if(ids.has(raw.id))throw new Error(`Duplicate treatment path ID: ${raw.id}`);ids.add(raw.id);
        if(!raw.label?.trim())throw new Error(`${raw.id}: indication / label is required.`);
        if(!raw.agent?.trim())throw new Error(`${label}: medication / agent is required.`);
        if(!patientGroups.includes(raw.patient))throw new Error(`${label}: select a valid patient group.`);
        if(!raw.route?.trim())throw new Error(`Route is required for ${label}.`);
        if(raw.minAge!==undefined&&(!Number.isFinite(raw.minAge)||raw.minAge<0))throw new Error(`${label}: minimum age must be zero or greater.`);
        if(raw.maxAge!==undefined&&(!Number.isFinite(raw.maxAge)||raw.maxAge<=0))throw new Error(`${label}: maximum age must be greater than zero.`);
        if(raw.minAge!==undefined&&raw.maxAge!==undefined&&raw.minAge>=raw.maxAge)throw new Error(`${label}: minimum age must be below maximum age.`);
        for(const [key,value] of [["Repeat interval",raw.repeatAfterMinutes],["Maximum administrations",raw.maxAdministrations],["Maximum cumulative dose",raw.maxCumulative],["Maximum cumulative per kg",raw.maxCumulativePerKg],["Absolute cumulative maximum",raw.absoluteCumulativeMax]] as const)if(value!==undefined&&(!Number.isFinite(value)||Number(value)<=0))throw new Error(`${label}: ${key} must be greater than zero.`);
        if(raw.maxAdministrations!==undefined&&!Number.isInteger(raw.maxAdministrations))throw new Error(`${label}: maximum administrations must be a whole number.`);
        if(raw.suggestedConcentration!==undefined&&(!Number.isFinite(raw.suggestedConcentration)||raw.suggestedConcentration<=0))throw new Error(`${label}: suggested concentration must be greater than zero.`);
        const f=raw.formula||{};
        if(!formulaKinds.includes(f.kind))throw new Error(`${label}: select a valid dose formula type.`);
        if(!f.unit?.trim())throw new Error(`${label}: dose unit is required.`);
        if((f.kind==="fixed"||f.kind==="perKg")&&(!(Number(f.amount)>0)||!Number.isFinite(Number(f.amount))))throw new Error(`${label}: dose amount must be greater than zero.`);
        if(f.kind==="range"&&(!(Number(f.min)>0)||!(Number(f.max)>0)||!Number.isFinite(Number(f.min))||!Number.isFinite(Number(f.max))))throw new Error(`${label}: range minimum and maximum must be greater than zero.`);
        if(f.kind==="range"&&Number(f.min)>Number(f.max))throw new Error(`${label}: minimum dose cannot exceed maximum dose.`);
        if(f.kind==="instruction"&&!String(f.text||"").trim())throw new Error(`${label}: dose instruction is required.`);
        if(f.kind==="ageBands"){
          if(!Array.isArray(f.bands)||f.bands.length===0)throw new Error(`${label}: add at least one age band.`);
          const bands=[...f.bands].sort((a,b)=>a.min-b.min);
          bands.forEach((band,index)=>{if(!Number.isFinite(band.min)||!Number.isFinite(band.max)||band.min<0||band.min>=band.max||!Number.isFinite(band.amount)||band.amount<=0)throw new Error(`${label}: every age band needs a valid age range and dose greater than zero.`);if(index>0&&band.min<bands[index-1].max)throw new Error(`${label}: age bands cannot overlap.`)});
        }
      }
    }
  };
  const saveDraft=(keepEditing=false)=>{
    if(!selected||!editorData||!editorCatalog)return;
    try{
      const nextData=normalizeClinical({...editorData,id:selected.id,name:editorCatalog.name.trim(),protocolId:editorCatalog.protocol.id.trim(),page:editorCatalog.protocol.page});
      validateClinical(nextData);
      saveCatalogLocal({...editorCatalog,id:selected.id});
      updateRecord(selected.id,r=>({...r,protocolRevision:protocolRevision.trim()||r.protocolRevision,draft:deepClone(nextData),draftCreatedAt:Date.now(),reviewStartedAt:Date.now()}));
      resetSignatures(selected.id);setEditorData(nextData);setSavedMessage("Draft saved. Three signatures are required before clinical changes become active.");setError("");if(!keepEditing)setEditing(false);
    }catch(err){setError(err instanceof Error?err.message:"Unable to save medication draft")}
  };
  const discardDraft=()=>{if(!selected||!window.confirm(`Discard pending clinical changes for ${selected.name}?`))return;updateRecord(selected.id,r=>{const next={...r};delete next.draft;delete next.draftCreatedAt;return next});resetSignatures(selected.id);setEditing(false);setEditorData(null)};
  const toggleVisibility=()=>{if(!selected)return;const effective=typeof selected.visible==="boolean"?selected.visible:DEFAULT_VISIBLE_IDS.includes(selected.id);saveCatalogLocal({...selected,visible:!effective})};
  const retireMedication=()=>{if(!selected||!window.confirm(`Remove ${selected.name} from field use? Its clinical record and review history will be preserved in Admin.`))return;const updated={...selected,visible:false,retired:true};saveCatalogLocal(updated);setSelectedId(updated.id)};
  const reactivateMedication=()=>{if(!selected)return;saveCatalogLocal({...selected,retired:false})};
  const createMedication=()=>{
    const name=newMed.name.trim(),id=slugify(name),page=Number(newMed.page||0);
    if(!name||!id){setError("Medication name is required.");return}
    if(catalog.some(m=>m.id===id)){setError("A medication with this name/ID already exists.");return}
    const item:CatalogMedication={id,name,brand:newMed.brand.trim()||name,sub:newMed.category.trim()||"Medication",protocol:{id:newMed.protocolId.trim()||"NEW",name:newMed.protocolName.trim()||name,page:Number.isFinite(page)?page:0},custom:true,pending:true,visible:false,retired:false};
    const clinical:JsonObject={id,name,protocolId:item.protocol.id,page:item.protocol.page,contraindications:[],concentrations:[],paths:[]};
    saveCatalogLocal(item);
    const next={...state,[id]:{...initialAdminRecord(id),clinicalRevision:0,reviewStartedAt:Date.now(),draft:clinical,draftCreatedAt:Date.now()}};persist(next);setReviews({...reviews,[id]:{}});setAdding(false);setNewMed({name:"",brand:"",category:"",protocolId:"",protocolName:"",page:""});setSelectedId(id);setEditorCatalog(item);setEditorData(clinical);setProtocolRevision(CURRENT_DMP_PROTOCOL_REVISION);setEditing(true);setError("");
  };

  useEffect(()=>{
    if(!selectedId)return;
    const r=getRecord(state,selectedId),signatures=reviews[selectedId]||{};
    if(!r.reviewStartedAt||signatureCount(signatures)!==3)return;
    const med=catalog.find(m=>m.id===selectedId);if(!med)return;
    const completedAt=Math.max(...Object.values(signatures).map(item=>item?.approvedAt||0),Date.now());
    const before=(loadClinicalOverrides()[selectedId] as JsonObject|undefined)||baseData(med);
    const changeSummary=r.draft?diffSummary(before,r.draft):[];
    if(r.draft){const nextOverrides=loadClinicalOverrides();nextOverrides[selectedId]=deepClone(r.draft);saveClinicalOverrides(nextOverrides)}
    if(med.pending){saveCatalogLocal({...med,pending:false})}
    const historyEntry={id:`${selectedId}-${completedAt}`,startedAt:r.reviewStartedAt,completedAt,nextReviewAt:addMonths(completedAt,REVIEW_INTERVAL_MONTHS),protocolRevision:r.protocolRevision,clinicalRevision:r.draft?r.clinicalRevision+1:r.clinicalRevision,result:r.draft?"changes-approved" as const:"no-change" as const,signatures:deepClone(signatures),changeSummary};
    const nextRecord:MedicationAdminRecord={...r,clinicalRevision:historyEntry.clinicalRevision,lastCompletedAt:completedAt,nextReviewAt:historyEntry.nextReviewAt,history:[historyEntry,...r.history]};
    delete nextRecord.reviewStartedAt;delete nextRecord.draft;delete nextRecord.draftCreatedAt;
    const next={...state,[selectedId]:nextRecord};setState(next);saveMedicationAdminState(next);setSavedMessage("Review complete. Approved medication data is now published.");
  },[reviews,selectedId]);

  const desiredVisible=selected?(typeof selected.visible==="boolean"?selected.visible:DEFAULT_VISIBLE_IDS.includes(selected.id)):false;
  return <div className="modal-backdrop admin-med-backdrop" onClick={closeAdmin}>
    <section className="admin-med-modal" role="dialog" aria-modal="true" aria-label="Medication administration" onClick={event=>event.stopPropagation()}>
      <header className="admin-med-header"><div><small>ADMIN • CLINICAL GOVERNANCE</small><h2>{selected?selected.name:"Medication management"}</h2><span>{selected?`DMP ${selected.protocol.id} • ${record?.protocolRevision||CURRENT_DMP_PROTOCOL_REVISION}`:"Edit individual fields, add medications, retire medications and run six-month reviews"}</span></div><button onClick={selected?()=>{setSelectedId(null);setEditing(false);setError("")}:closeAdmin}>{selected?"‹ Medications":"×"}</button></header>
      {!selected&&<>
        <div className="admin-med-summary"><div><b>{catalog.filter(m=>!m.retired).length} active medications</b><span>{catalog.filter(m=>m.retired).length} retired • three sequential signatures retained</span></div><button className="admin-add-med" onClick={()=>setAdding(true)}>+ Add medication</button></div>
        {adding&&<section className="admin-new-med"><h3>Add DMP medication</h3><p>Create the medication record here, then enter its indications, routes, concentrations and dose paths. New medications remain unavailable to field users until the review is completed.</p><div className="admin-form-grid"><Field label="Medication name"><input value={newMed.name} onChange={e=>setNewMed(v=>({...v,name:e.target.value}))}/></Field><Field label="Brand / common name"><input value={newMed.brand} onChange={e=>setNewMed(v=>({...v,brand:e.target.value}))}/></Field><Field label="Category"><input value={newMed.category} onChange={e=>setNewMed(v=>({...v,category:e.target.value}))}/></Field><Field label="DMP medication ID"><input value={newMed.protocolId} onChange={e=>setNewMed(v=>({...v,protocolId:e.target.value}))}/></Field><Field label="Protocol name"><input value={newMed.protocolName} onChange={e=>setNewMed(v=>({...v,protocolName:e.target.value}))}/></Field><Field label="Protocol page"><input type="number" value={newMed.page} onChange={e=>setNewMed(v=>({...v,page:e.target.value}))}/></Field></div>{error&&<div className="admin-med-error">{error}</div>}<div className="admin-inline-actions"><button onClick={()=>{setAdding(false);setError("")}}>Cancel</button><button className="primary" onClick={createMedication}>Create medication draft</button></div></section>}
        <label className="admin-med-search"><span>Search medications</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Medication or protocol"/></label>
        <div className="admin-med-list">{filtered.map(m=>{const r=getRecord(state,m.id),s=reviews[m.id]||{},timing=reviewTiming(r),visible=typeof m.visible==="boolean"?m.visible:DEFAULT_VISIBLE_IDS.includes(m.id);return <article key={m.id} className={`admin-med-row ${timing} ${m.retired?"retired":""}`}><button className="admin-med-open" onClick={()=>{setSelectedId(m.id);setEditing(false);setError("")}}><span><strong>{m.name}</strong><small>{m.brand} • DMP {m.protocol.id}</small><em>{m.retired?"RETIRED":m.pending?"NEW • AWAITING REVIEW":statusLabel(r,s)}</em></span><span className="admin-med-review-dates"><b>{signatureCount(s)}/3</b><small>{visible&&!m.retired&&!m.pending?"Field visible":"Field hidden"}</small><small>Next: {r.nextReviewAt?formatReviewDate(r.nextReviewAt):"Not scheduled"}</small></span><i>›</i></button></article>})}</div>
      </>}
      {selected&&record&&currentData&&<div className="admin-med-detail">
        <section className="admin-med-status-card"><div><small>CLINICAL REVISION</small><b>Revision {record.clinicalRevision}{record.draft?" • DRAFT":""}</b><span>{selected.pending?"New medication awaiting first approval":statusLabel(record,reviews[selected.id]||{})}</span></div><div><small>LAST REVIEW</small><b>{formatReviewDate(record.lastCompletedAt)}</b><span>Next: {record.nextReviewAt?formatReviewDate(record.nextReviewAt):"Complete the first review"}</span></div><div><small>SIGNATURES</small><b>{signatureCount(reviews[selected.id]||{})}/3</b><span>Owner → Line Safety → Medical Director</span></div></section>
        <section className="admin-field-control"><div><small>FIELD AVAILABILITY</small><b>{selected.retired?"RETIRED":selected.pending?"WAITING FOR INITIAL REVIEW":desiredVisible?"VISIBLE TO USERS":"HIDDEN FROM USERS"}</b><span>Visibility does not delete the medication or its history.</span></div><button disabled={selected.retired||selected.pending} onClick={toggleVisibility}>{desiredVisible?"Hide from users":"Show to users"}</button>{selected.retired?<button onClick={reactivateMedication}>Reactivate medication</button>:<button className="danger" onClick={retireMedication}>Retire / remove from field use</button>}</section>
        {!!record.draft&&<div className="admin-med-draft-warning"><b>Clinical changes are pending review.</b><span>Published field data stays active until all three signatures are complete. A newly added medication stays hidden until its first approval.</span></div>}
        {savedMessage&&<div className="admin-med-success">{savedMessage}</div>}
        <div className="admin-med-actions">{!editing&&<button onClick={beginEdit}>Edit medication fields</button>}<button onClick={()=>beginReview(selected.id)}>{record.reviewStartedAt?"Restart review":"Start 6-month review"}</button><button className="primary" disabled={!record.reviewStartedAt} onClick={()=>openLegacyReview(selected.id)}>Open 3-signature review</button>{!!record.draft&&!editing&&<button className="danger" onClick={discardDraft}>Discard draft</button>}</div>
        {editing&&editorData&&editorCatalog?<StructuredMedicationEditor data={editorData} setData={setEditorData} catalog={editorCatalog} setCatalog={setEditorCatalog} protocolRevision={protocolRevision} setProtocolRevision={setProtocolRevision} saveSection={()=>saveDraft(true)} error={error} cancel={()=>{setEditing(false);setError("")}} save={()=>saveDraft(false)}/>:<ClinicalRecord data={currentData}/>} 
        <section className="admin-med-signatures"><h3>Current review signatures</h3>{(["owner","lineSafety","medicalDirector"] as const).map((stage,index)=>{const approval=reviews[selected.id]?.[stage];const labels=["Owner / Admin","Line Safety","Medical Director"];return <article key={stage} className={approval?"complete":"pending"}><i>{approval?"✓":index+1}</i><span><b>{labels[index]}</b>{approval?<small>{approval.reviewer} • {new Date(approval.approvedAt).toLocaleString()}</small>:<small>Pending</small>}</span></article>})}</section>
        <section className="admin-med-history"><h3>Review history</h3>{record.history.length?record.history.map(item=><details key={item.id}><summary><b>{new Date(item.completedAt).toLocaleDateString()}</b><span>{item.result==="no-change"?"No clinical changes":"Clinical changes approved"} • Revision {item.clinicalRevision}</span></summary><p>Protocol revision: {item.protocolRevision}</p><p>Next review: {new Date(item.nextReviewAt).toLocaleDateString()}</p>{item.changeSummary?.length?<ul>{item.changeSummary.map(change=><li key={change}>{change}</li>)}</ul>:null}</details>):<p>No completed six-month reviews recorded yet.</p>}</section>
      </div>}
      <footer className="admin-med-footer"><span>Changes and review records are stored on this device. Close Admin after catalog changes to refresh the field medication list.</span><button onClick={closeAdmin}>Done</button></footer>
    </section>
  </div>;
}

function StructuredMedicationEditor({data,setData,catalog,setCatalog,protocolRevision,setProtocolRevision,saveSection,error,cancel,save}:{data:JsonObject;setData:(v:JsonObject)=>void;catalog:CatalogMedication;setCatalog:(v:CatalogMedication)=>void;protocolRevision:string;setProtocolRevision:(v:string)=>void;saveSection:()=>void;error:string;cancel:()=>void;save:()=>void}){
  const set=(key:string,value:any)=>setData({...data,[key]:value});
  const isGeneric=Array.isArray(data.paths);
  return <section className="admin-structured-editor">
    <div className="admin-editor-banner"><div><small>STRUCTURED CLINICAL EDITOR</small><b>Edit the field you need — no JSON or code.</b><span>Add or remove routes, concentrations, indications and safety information below. Save creates/updates a draft.</span></div><div><button onClick={cancel}>Cancel</button><button className="primary" onClick={save}>Save draft</button></div></div>
    <EditorSection title="Medication & protocol" note="Department-facing identification and protocol reference." onSave={saveSection}><div className="admin-form-grid"><Field label="Medication name"><input value={catalog.name} onChange={e=>setCatalog({...catalog,name:e.target.value})}/></Field><Field label="Brand / common name"><input value={catalog.brand} onChange={e=>setCatalog({...catalog,brand:e.target.value})}/></Field><Field label="Category"><input value={catalog.sub} onChange={e=>setCatalog({...catalog,sub:e.target.value})}/></Field><Field label="DMP medication ID"><input value={catalog.protocol.id} onChange={e=>setCatalog({...catalog,protocol:{...catalog.protocol,id:e.target.value}})}/></Field><Field label="Protocol name"><input value={catalog.protocol.name} onChange={e=>setCatalog({...catalog,protocol:{...catalog.protocol,name:e.target.value}})}/></Field><Field label="Protocol page"><input type="number" value={catalog.protocol.page} onChange={e=>setCatalog({...catalog,protocol:{...catalog.protocol,page:Number(e.target.value)}})}/></Field><Field label="Protocol revision"><input value={protocolRevision} onChange={e=>setProtocolRevision(e.target.value)}/></Field></div></EditorSection>
    <EditorSection title="Concentrations" note="Department stock/vial concentrations. Add a new concentration or remove one no longer stocked." onSave={saveSection}><ConcentrationEditor values={Array.isArray(data.concentrations)?data.concentrations:[]} onChange={values=>set("concentrations",values)}/></EditorSection>
    {isGeneric?<>
      <EditorSection title="Contraindications" note="Add, edit, reorder by removing/re-adding, or remove a contraindication." onSave={saveSection}><StringListEditor values={arrays(data.contraindications)} onChange={v=>set("contraindications",v)} addLabel="Add contraindication"/></EditorSection>
      <EditorSection title="Indications, routes & doses" note="Each treatment path contains the patient group, route, dose formula, repeat instructions and administration details. Add a path when DMP adds a new route or indication." onSave={saveSection}><PathsEditor medicationName={catalog.name} values={data.paths as DosePath[]} onChange={v=>set("paths",v)}/></EditorSection>
      <EditorSection title="Additional notes" note="Department or protocol notes that should travel with this medication record." onSave={saveSection}><StringListEditor values={arrays(data.notes)} onChange={v=>set("notes",v)} addLabel="Add note"/></EditorSection>
    </>:<>
      <EditorSection title="Indications" note="Conditions for which this medication may be used." onSave={saveSection}><StringListEditor values={arrays(data.indications)} onChange={v=>set("indications",v)} addLabel="Add indication"/></EditorSection>
      <EditorSection title="Approved routes" note="Add a newly approved DMP route or remove a route no longer allowed." onSave={saveSection}><StringListEditor values={arrays(data.routes)} onChange={v=>set("routes",v)} addLabel="Add route"/></EditorSection>
      <EditorSection title="Dose rules" note="Edit each named dose rule individually. These remain under draft/review control." onSave={saveSection}><KeyValueEditor values={(data.doseRules&&typeof data.doseRules==="object")?data.doseRules:{}} onChange={v=>set("doseRules",v)}/></EditorSection>
      <EditorSection title="Contraindications" onSave={saveSection}><StringListEditor values={arrays(data.contraindications)} onChange={v=>set("contraindications",v)} addLabel="Add contraindication"/></EditorSection>
      <EditorSection title="Monitoring" onSave={saveSection}><StringListEditor values={arrays(data.monitoring)} onChange={v=>set("monitoring",v)} addLabel="Add monitoring item"/></EditorSection>
      <EditorSection title="Administration instructions" onSave={saveSection}><StringListEditor values={arrays(data.administration)} onChange={v=>set("administration",v)} addLabel="Add instruction"/></EditorSection>
      <EditorSection title="Additional notes" onSave={saveSection}><StringListEditor values={arrays(data.notes)} onChange={v=>set("notes",v)} addLabel="Add note"/></EditorSection>
    </>}
    {error&&<div className="admin-med-error">{error}</div>}
    <div className="admin-editor-bottom"><button onClick={cancel}>Cancel</button><button className="primary" onClick={save}>Save clinical draft</button></div>
  </section>;
}

function EditorSection({title,note,children,onSave}:{title:string;note?:string;children:ReactNode;onSave:()=>void}){return <section className="admin-editor-section"><header><div><h3>{title}</h3>{note&&<p>{note}</p>}</div><button onClick={onSave}>Save section</button></header>{children}</section>}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="admin-field"><span>{label}</span>{children}</label>}

function StringListEditor({values,onChange,addLabel}:{values:string[];onChange:(v:string[])=>void;addLabel:string}){
  const update=(index:number,value:string)=>onChange(values.map((item,i)=>i===index?value:item));
  const remove=(index:number)=>onChange(values.filter((_,i)=>i!==index));
  return <div className="admin-list-editor">{values.map((value,index)=><div className="admin-list-row" key={index}><input value={value} onChange={e=>update(index,e.target.value)}/><button className="danger" onClick={()=>remove(index)} aria-label={`Remove ${value||"item"}`}>Remove</button></div>)}<button className="admin-add-row" onClick={()=>onChange([...values,""])}>+ {addLabel}</button></div>;
}

function ConcentrationEditor({values,onChange}:{values:Concentration[];onChange:(v:Concentration[])=>void}){
  const update=(index:number,key:string,value:any)=>onChange(values.map((item,i)=>{if(i!==index)return item;const next={...item,[key]:value};if((key==="amount"||key==="volume")&&Number(next.amount)>0&&Number(next.volume)>0)next.concentration=Number(next.amount)/Number(next.volume);return next}));
  return <div className="admin-stack-editor">{values.map((item,index)=>{const calculated=Number(item.amount)>0&&Number(item.volume)>0?Number(item.amount)/Number(item.volume):null;return <article className="admin-concentration-card" key={index}><div className="admin-form-grid compact"><Field label="Display label"><input value={item.label||""} onChange={e=>update(index,"label",e.target.value)}/></Field><Field label="Medication amount"><input type="number" min="0" step="any" value={item.amount??""} onChange={e=>update(index,"amount",num(e.target.value))}/></Field><Field label="Amount unit"><input value={item.amountUnit||""} onChange={e=>update(index,"amountUnit",e.target.value)}/></Field><Field label="Vial volume (mL)"><input type="number" min="0" step="any" value={item.volume??""} onChange={e=>update(index,"volume",num(e.target.value))}/></Field>{calculated!==null?<Field label="Calculated concentration"><output>{Number(calculated.toFixed(6))} {item.concentrationUnit||"per mL"}</output></Field>:<Field label="Direct concentration"><input type="number" min="0" step="any" value={item.concentration??""} onChange={e=>update(index,"concentration",num(e.target.value))}/></Field>}<Field label="Concentration unit"><input value={item.concentrationUnit||""} onChange={e=>update(index,"concentrationUnit",e.target.value)}/></Field></div><small>When amount and volume are entered, concentration is calculated automatically and cannot drift from the vial math.</small><button className="danger text-button" onClick={()=>onChange(values.filter((_,i)=>i!==index))}>Remove concentration</button></article>})}<button className="admin-add-row" onClick={()=>onChange([...values,{label:"",amount:undefined,amountUnit:"mg",volume:undefined,volumeUnit:"mL",concentration:undefined,concentrationUnit:"mg/mL"}])}>+ Add concentration</button></div>;
}

function KeyValueEditor({values,onChange}:{values:Record<string,any>;onChange:(v:Record<string,any>)=>void}){
  const entries=Object.entries(values);
  const updateKey=(oldKey:string,newKey:string)=>{const next:Record<string,any>={};for(const [key,value] of entries)next[key===oldKey?newKey:key]=value;onChange(next)};
  const updateValue=(key:string,value:string)=>onChange({...values,[key]:value});
  const remove=(key:string)=>{const next={...values};delete next[key];onChange(next)};
  return <div className="admin-list-editor">{entries.map(([key,value])=><div className="admin-key-value" key={key}><input className="key" value={key} onChange={e=>updateKey(key,e.target.value)} aria-label="Dose rule name"/><input value={String(value??"")} onChange={e=>updateValue(key,e.target.value)} aria-label={`${key} value`}/><button className="danger" onClick={()=>remove(key)}>Remove</button></div>)}<button className="admin-add-row" onClick={()=>onChange({...values,[`newRule${entries.length+1}`]:""})}>+ Add dose rule</button></div>;
}

function PathsEditor({medicationName,values,onChange}:{medicationName:string;values:DosePath[];onChange:(v:DosePath[])=>void}){
  const update=(index:number,path:DosePath)=>onChange(values.map((item,i)=>i===index?path:item));
  const add=()=>onChange([...values,{id:`path-${Date.now()}`,label:"New indication / route",agent:medicationName,patient:"all",route:"",formula:{kind:"fixed",amount:0,unit:"mg"},repeat:"",administration:"",protocol:""}]);
  return <div className="admin-path-list">{values.map((path,index)=><PathEditor key={path.id||index} path={path} update={v=>update(index,v)} remove={()=>onChange(values.filter((_,i)=>i!==index))} duplicate={()=>onChange([...values,{...deepClone(path),id:`${path.id||"path"}-${Date.now()}`,label:`${path.label} — new route`}])}/>) }<button className="admin-add-row" onClick={add}>+ Add indication / dose path</button></div>;
}

function PathEditor({path,update,remove,duplicate}:{path:DosePath;update:(v:DosePath)=>void;remove:()=>void;duplicate:()=>void}){
  const set=(key:string,value:any)=>update({...path,[key]:value});
  return <article className="admin-path-card"><header><div><small>TREATMENT PATH</small><b>{path.label||"Untitled path"}</b></div><div><button onClick={duplicate}>Duplicate for new route</button><button className="danger" onClick={remove}>Remove path</button></div></header><div className="admin-form-grid"><Field label="Path ID"><input value={path.id||""} onChange={e=>set("id",e.target.value)}/></Field><Field label="Indication / label"><input value={path.label||""} onChange={e=>set("label",e.target.value)}/></Field><Field label="Medication / agent"><input value={path.agent||""} onChange={e=>set("agent",e.target.value)}/></Field><Field label="Patient group"><select value={path.patient||"all"} onChange={e=>set("patient",e.target.value)}>{patientGroups.map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Minimum age (years)"><input type="number" step="any" value={path.minAge??""} onChange={e=>set("minAge",num(e.target.value))}/></Field><Field label="Maximum age (years)"><input type="number" step="any" value={path.maxAge??""} onChange={e=>set("maxAge",num(e.target.value))}/></Field><Field label="Approved route"><input value={path.route||""} onChange={e=>set("route",e.target.value)} placeholder="IV/IO, IM, IN, PO..."/></Field><Field label="Protocol / indication source"><input value={path.protocol||""} onChange={e=>set("protocol",e.target.value)}/></Field></div><FormulaEditor value={path.formula||{kind:"fixed",amount:0,unit:"mg"}} onChange={v=>set("formula",v)}/><div className="admin-form-grid"><Field label="Repeat instructions"><textarea value={path.repeat||""} onChange={e=>set("repeat",e.target.value)}/></Field><Field label="Administration instructions"><textarea value={path.administration||""} onChange={e=>set("administration",e.target.value)}/></Field><Field label="Base contact requirement"><textarea value={path.baseContact||""} onChange={e=>set("baseContact",e.target.value)}/></Field><Field label="Suggested concentration"><input type="number" step="any" value={path.suggestedConcentration??""} onChange={e=>set("suggestedConcentration",num(e.target.value))}/></Field><Field label="Concentration unit"><input value={path.concentrationUnit||""} onChange={e=>set("concentrationUnit",e.target.value)}/></Field><Field label="Repeat after minutes"><input type="number" step="any" value={path.repeatAfterMinutes??""} onChange={e=>set("repeatAfterMinutes",num(e.target.value))}/></Field><Field label="Maximum administrations"><input type="number" step="1" value={path.maxAdministrations??""} onChange={e=>set("maxAdministrations",num(e.target.value))}/></Field><Field label="Maximum cumulative dose"><input type="number" step="any" value={path.maxCumulative??""} onChange={e=>set("maxCumulative",num(e.target.value))}/></Field></div><label className="admin-checkbox"><input type="checkbox" checked={Boolean(path.volumeRequired)} onChange={e=>set("volumeRequired",e.target.checked)}/><span>Concentration/volume is required for this path</span></label><h4>Monitoring</h4><StringListEditor values={arrays(path.monitoring)} onChange={v=>set("monitoring",v)} addLabel="Add monitoring item"/><h4>Special considerations</h4><StringListEditor values={arrays(path.special)} onChange={v=>set("special",v)} addLabel="Add special consideration"/></article>;
}

function FormulaEditor({value,onChange}:{value:DoseFormula;onChange:(v:DoseFormula)=>void}){
  const kind=value.kind||"fixed",set=(key:string,val:any)=>onChange({...value,[key]:val});
  const switchKind=(next:string)=>{const base:DoseFormula={kind:next,unit:value.unit||"mg"};if(next==="fixed"||next==="perKg")base.amount=value.amount??0;if(next==="range"){base.min=value.min??0;base.max=value.max??0}if(next==="instruction")base.text=value.text||"";if(next==="ageBands")base.bands=Array.isArray(value.bands)?value.bands:[];onChange(base)};
  return <section className="admin-formula"><h4>Dose formula</h4><div className="admin-form-grid"><Field label="Formula type"><select value={kind} onChange={e=>switchKind(e.target.value)}>{formulaKinds.map(v=><option key={v} value={v}>{v}</option>)}</select></Field><Field label="Dose unit"><select value={value.unit||"mg"} onChange={e=>set("unit",e.target.value)}>{doseUnits.map(v=><option key={v} value={v}>{v}</option>)}</select></Field>{(kind==="fixed"||kind==="perKg")&&<Field label={kind==="perKg"?"Amount per kg":"Fixed amount"}><input type="number" step="any" value={value.amount??""} onChange={e=>set("amount",num(e.target.value))}/></Field>}{kind==="range"&&<><Field label="Minimum"><input type="number" step="any" value={value.min??""} onChange={e=>set("min",num(e.target.value))}/></Field><Field label="Maximum"><input type="number" step="any" value={value.max??""} onChange={e=>set("max",num(e.target.value))}/></Field></>}{kind==="perKg"&&<><Field label="Minimum dose"><input type="number" step="any" value={value.min??""} onChange={e=>set("min",num(e.target.value))}/></Field><Field label="Maximum dose"><input type="number" step="any" value={value.max??""} onChange={e=>set("max",num(e.target.value))}/></Field></>}</div>{kind==="instruction"&&<Field label="Dose instruction"><textarea value={value.text||""} onChange={e=>set("text",e.target.value)}/></Field>}{kind==="ageBands"&&<AgeBandsEditor values={Array.isArray(value.bands)?value.bands:[]} onChange={bands=>set("bands",bands)}/>}</section>;
}
function AgeBandsEditor({values,onChange}:{values:Array<{min:number;max:number;amount:number;label:string}>;onChange:(v:Array<{min:number;max:number;amount:number;label:string}>)=>void}){const update=(i:number,key:string,value:any)=>onChange(values.map((item,index)=>index===i?{...item,[key]:value}:item));return <div className="admin-age-bands">{values.map((band,index)=><div className="admin-age-band" key={index}><input placeholder="Label" value={band.label||""} onChange={e=>update(index,"label",e.target.value)}/><input type="number" step="any" placeholder="Min age" value={band.min??""} onChange={e=>update(index,"min",Number(e.target.value))}/><input type="number" step="any" placeholder="Max age" value={band.max??""} onChange={e=>update(index,"max",Number(e.target.value))}/><input type="number" step="any" placeholder="Dose" value={band.amount??""} onChange={e=>update(index,"amount",Number(e.target.value))}/><button className="danger" onClick={()=>onChange(values.filter((_,i)=>i!==index))}>Remove</button></div>)}<button className="admin-add-row" onClick={()=>onChange([...values,{min:0,max:0,amount:0,label:""}])}>+ Add age band</button></div>}

function formulaSummary(formula:DoseFormula|undefined){if(!formula)return"Not configured";if(formula.kind==="fixed")return`${formula.amount??"—"} ${formula.unit||""}`;if(formula.kind==="perKg")return`${formula.amount??"—"} ${formula.unit||""}/kg${formula.min!==undefined?` • min ${formula.min}`:""}${formula.max!==undefined?` • max ${formula.max}`:""}`;if(formula.kind==="range")return`${formula.min??"—"}–${formula.max??"—"} ${formula.unit||""}`;if(formula.kind==="instruction")return formula.text||"Instruction not entered";if(formula.kind==="ageBands")return`${formula.bands?.length||0} age band${formula.bands?.length===1?"":"s"}`;return formula.kind}
function ClinicalRecord({data}:{data:JsonObject}){
  const hidden=new Set(["id"]),entries=Object.entries(data).filter(([key])=>!key.startsWith("_")&&!hidden.has(key));
  return <section className="admin-clinical-record"><div className="admin-clinical-intro"><small>COMPLETE MEDICATION RECORD</small><b>Review every section against the current protocol.</b><span>Select “Edit medication fields” to make changes. The review screen intentionally avoids raw JSON/code.</span></div>{entries.map(([key,value])=>{const title=key.replace(/([A-Z])/g," $1").replace(/^./,letter=>letter.toUpperCase());if(key==="paths"&&Array.isArray(value))return <article key={key}><h3>Indications, routes & doses</h3><div className="admin-path-list">{(value as DosePath[]).map((path,index)=><section className="admin-path-card" key={path.id||index}><header><div><small>{path.patient?.toUpperCase()||"ALL"} • {path.route||"Route not set"}</small><b>{path.label||"Untitled pathway"}</b></div></header><div className="admin-form-grid compact"><p><small>Medication / agent</small><b>{path.agent||"—"}</b></p><p><small>Dose</small><b>{formulaSummary(path.formula)}</b></p><p><small>Age range</small><b>{path.minAge!==undefined||path.maxAge!==undefined?`${path.minAge??0} to ${path.maxAge??"no maximum"} years`:"No age boundary"}</b></p><p><small>Repeat</small><b>{path.repeat||"No repeat instruction"}</b></p><p><small>Administration</small><b>{path.administration||"—"}</b></p><p><small>Protocol source</small><b>{path.protocol||"—"}</b></p>{path.baseContact&&<p><small>Base contact</small><b>{path.baseContact}</b></p>}{path.suggestedConcentration&&<p><small>Suggested concentration</small><b>{path.suggestedConcentration} {path.concentrationUnit||""}</b></p>}</div>{Array.isArray(path.monitoring)&&path.monitoring.length>0&&<><h4>Monitoring</h4><ul>{path.monitoring.map((item:string)=><li key={item}>{item}</li>)}</ul></>}{Array.isArray(path.special)&&path.special.length>0&&<><h4>Special considerations</h4><ul>{path.special.map((item:string)=><li key={item}>{item}</li>)}</ul></>}</section>)}</div></article>;if(key==="concentrations"&&Array.isArray(value))return <article key={key}><h3>Concentrations</h3><div className="admin-value-list">{(value as Concentration[]).map((item,index)=><div key={index}><b>{item.label||`Concentration ${index+1}`}</b><span>{item.amount&&item.volume?`${item.amount} ${item.amountUnit||""} / ${item.volume} ${item.volumeUnit||"mL"} = ${item.concentration??Number(item.amount)/Number(item.volume)} ${item.concentrationUnit||""}`:`${item.concentration??"—"} ${item.concentrationUnit||""}`}</span></div>)}</div></article>;if(Array.isArray(value))return <article key={key}><h3>{title}</h3><div className="admin-value-list">{value.length?value.map((item,index)=><div key={index}><span>{String(item)}</span></div>):<p>None listed</p>}</div></article>;if(value&&typeof value==="object")return <article key={key}><h3>{title}</h3><div className="admin-value-list">{Object.entries(value).map(([child,childValue])=><div key={child}><b>{child.replace(/([A-Z])/g," $1")}</b><span>{String(childValue??"—")}</span></div>)}</div></article>;return <article key={key}><h3>{title}</h3><p>{String(value??"—")}</p></article>})}</section>;
}
