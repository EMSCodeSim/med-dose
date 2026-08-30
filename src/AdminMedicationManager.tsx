import {useEffect,useMemo,useState} from "react";
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
import "./adminMedicationManager.css";

type CatalogMedication={id:string;name:string;brand:string;sub:string;protocol:{id:string;name:string;page:number};calculator?:string};
type Reviews=Record<string,ReviewSignatures>;
type Props={medications:CatalogMedication[];reviews:Reviews;setReviews:(reviews:Reviews)=>void;openLegacyReview:(id:string)=>void;close:()=>void};
type JsonObject=Record<string,unknown>;

const specialDefaults:Record<string,JsonObject>={
  fentanyl:{id:"fentanyl",name:"Fentanyl",protocolId:"9230",page:163,category:"Opioid analgesic",indications:["Moderate to severe pain in a hemodynamically stable patient"],routes:["IV/IO","IM","IN"],concentrations:[{label:"50 mcg/mL",amount:50,amountUnit:"mcg",volume:1,volumeUnit:"mL",concentration:50,concentrationUnit:"mcg/mL"}],doseRules:{adult:"1 mcg/kg typical starting calculation; adult doses may be rounded to nearest 25 mcg",olderFrail:"Start with 1/2 traditional dose",pediatricIVIM:"1 mcg/kg",pediatricIN:"2 mcg/kg",cumulativeIVIM:"3 mcg/kg",cumulativeIN:"4 mcg/kg",repeatIVIMMinutes:5,repeatINMinutes:10},contraindications:["Hemodynamic instability or shock","Respiratory depression","Opioid + benzodiazepine coadministration requires direct physician verbal order"],monitoring:["Continuous pulse oximetry and respiratory reassessment","Naloxone and resuscitation equipment immediately available"],administration:["IN: divide equally between nostrils; app limit 1 mL per nostril","IM: IV is preferred for accurate titration","IV/IO: administer slowly and titrate to tolerable pain"]},
  midazolam:{id:"midazolam",name:"Midazolam (Versed)",protocolId:"9070",page:136,category:"Benzodiazepine",indications:["Status epilepticus","Sedation for cardioversion","Sedation for transcutaneous pacing","Agitated/combative patient — IMC-RASS +3/+4","Imminent risk of bodily harm — IMC-RASS +4"],routes:["IV/IO","IM","IN"],doseRules:{adultSeizureIVIO:"5 mg",adultSeizureIMIN:"10 mg",adultSedationIVIO:"2 mg",adultSedationIMIN:"5 mg",agitationAdult:"5 mg",imminentRiskAdultIM:"10 mg",pediatricIVIO:"0.1 mg/kg",pediatricIMIN:"0.2 mg/kg",repeat:"Routine seizure/sedation pathway may repeat once after 5 minutes; agitation pathway reassess at 5 minutes"},contraindications:["Hypotension for selected treatment pathway","Respiratory depression","Opioid coadministration requires direct physician verbal order"],monitoring:["Continuous ECG and SpO2","Continuous ventilation monitoring / waveform capnography when available","Reassess airway, respiratory rate, blood pressure, perfusion and sedation score"]},
  ketamine:{id:"ketamine",name:"Ketamine",protocolId:"500:62",page:1,category:"Adult analgesia waiver",indications:["Moderate to severe pain in an adult"],routes:["IV/IO"],concentrations:[{label:"200 mg / 20 mL",amount:200,amountUnit:"mg",volume:20,volumeUnit:"mL",concentration:10,concentrationUnit:"mg/mL"}],doseRules:{adult:"0.25 mg/kg",rounding:"Waiver chart uses whole-mg dose",repeat:"One standing-order repeat after reassessment; Base contact for subsequent doses"},contraindications:["Pediatric patient","Penetrating eye trauma"],monitoring:["Continuous cardiac monitoring","Pulse oximetry","Continuous waveform capnography","BVM ventilation and suction immediately available"],administration:["Mix in 50–100 mL NS","Administer over 5–10 minutes when conditions allow","Slow IV push permitted when mixing is not possible but may cause more dysphoria"]},
  adenosine:{id:"adenosine",name:"Adenosine",protocolId:"9010",page:123,category:"Antiarrhythmic",indications:["Regular narrow-complex AV nodal reentrant tachycardia"],routes:["IV"],doseRules:{adultInitial:"12 mg rapid IV",adultRepeat:"One additional 12 mg rapid IV dose",pediatricInitial:"0.1 mg/kg; max 6 mg; direct Base order",pediatricRepeat:"0.2 mg/kg; max 12 mg; direct Base order"},administration:["Rapid IV bolus followed immediately by normal saline flush","Continuous ECG monitoring"]},
  albuterol:{id:"albuterol",name:"Albuterol",protocolId:"9020",page:125,category:"Bronchodilator",indications:["Wheezing associated with allergic reaction","Bronchospasm — single nebulizer dose","Severe bronchospasm — continuous nebulizer dose","Hyperkalemia or crush injury — continuous nebulizer dose"],routes:["Nebulized"],doseRules:{single:"2.5 mg in 3 mL",continuous:"7.5 mg in 9 mL",repeatSingle:"May repeat twice for total of 3 single doses"},administration:["Nebulize at 6–8 L/min"]},
  diphenhydramine:{id:"diphenhydramine",name:"Diphenhydramine",protocolId:"9100",page:144,category:"Antihistamine",indications:["Allergic reaction","Dystonic medication reaction or akathisia"],routes:["IV/IO","IM"],doseRules:{adult:"50 mg",adultOver65:"25 mg",pediatric:"1 mg/kg; max 50 mg"},administration:["Slow IV/IO/IM","For mild reactions consider PO per protocol"]},
  methylprednisolone:{id:"methylprednisolone",name:"Methylprednisolone",protocolId:"9200",page:158,category:"Corticosteroid",indications:["Allergic reaction / anaphylaxis","Severe asthma or COPD","Suspected Addisonian crisis"],routes:["IV/IO"],doseRules:{adult:"125 mg",pediatric:"2 mg/kg; max 125 mg"},administration:["Slow IV/IO bolus over 2 minutes","Reconstitute and use immediately"]},
  magnesium:{id:"magnesium",name:"Magnesium Sulfate",protocolId:"9190",page:157,category:"Electrolyte / antiarrhythmic / bronchodilator",indications:["Torsades — stable/intermittent","Torsades — unstable/peri-arrest","Torsades — cardiac arrest","Refractory severe bronchospasm","Eclampsia"],routes:["IV/IO","IV","IM"],administration:["Route and infusion duration depend on indication","Eclampsia IM pathway splits dose between buttocks when used"]},
  epinephrine:{id:"epinephrine",name:"Epinephrine",protocolId:"9120",page:148,category:"Adrenergic agonist",indications:["Pulseless arrest","Systemic allergic reaction — IM","Wheezing — IM","Hypotension or refractory anaphylaxis — push dose","Hypotension or refractory anaphylaxis — infusion","Pediatric severe anaphylaxis — Base push dose","Bradycardia with poor perfusion","Stridor at rest — alternative to racemic epinephrine","Systemic allergic reaction — auto-injector"],routes:["IV/IO","IM","Nebulized"],concentrations:[{label:"1:10,000",concentration:0.1,concentrationUnit:"mg/mL"},{label:"1:1,000",concentration:1,concentrationUnit:"mg/mL"}],administration:["Calculator enforces indication-specific concentration and route matching"]}
};

const clone=(value:unknown)=>deepClone(value) as JsonObject;
const baseData=(med:CatalogMedication):JsonObject=>{
  const generic=genericMedication(med.id);
  if(generic)return clone(generic) as JsonObject;
  if(specialDefaults[med.id])return clone(specialDefaults[med.id]);
  return {id:med.id,name:med.name,brand:med.brand,category:med.sub,protocolId:med.protocol.id,protocolName:med.protocol.name,page:med.protocol.page,notes:["This medication is listed in the app catalog. Detailed calculator data has not yet been centralized into dmpMedicationData.ts."]};
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
const jsonText=(value:unknown)=>JSON.stringify(value,null,2);
const diffSummary=(before:unknown,after:unknown)=>{
  if(JSON.stringify(before)===JSON.stringify(after))return [];
  const b=(before&&typeof before==="object"&&!Array.isArray(before)?before:{}) as Record<string,unknown>;
  const a=(after&&typeof after==="object"&&!Array.isArray(after)?after:{}) as Record<string,unknown>;
  return Array.from(new Set([...Object.keys(b),...Object.keys(a)])).filter(key=>JSON.stringify(b[key])!==JSON.stringify(a[key])).map(key=>`${key}: changed`);
};

export default function AdminMedicationManager({medications,reviews,setReviews,openLegacyReview,close}:Props){
  const [state,setState]=useState<MedicationAdminState>(()=>loadMedicationAdminState());
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  const [draftText,setDraftText]=useState("");
  const [protocolRevision,setProtocolRevision]=useState("");
  const [search,setSearch]=useState("");
  const [error,setError]=useState("");
  const overrides=useMemo(()=>loadClinicalOverrides(),[state]);
  const selected=selectedId?medications.find(m=>m.id===selectedId)||null:null;
  const record=selectedId?getRecord(state,selectedId):null;
  const publishedData=selected?((overrides[selected.id] as JsonObject|undefined)||baseData(selected)):null;
  const currentData=record?.draft?(record.draft as JsonObject):publishedData;
  const filtered=medications.filter(m=>`${m.name} ${m.brand} ${m.protocol.id}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));

  const persist=(next:MedicationAdminState)=>{setState(next);saveMedicationAdminState(next)};
  const updateRecord=(id:string,fn:(record:MedicationAdminRecord)=>MedicationAdminRecord)=>{const next={...state,[id]:fn(getRecord(state,id))};persist(next)};
  const resetSignatures=(id:string)=>setReviews({...reviews,[id]:{}});
  const beginReview=(id:string)=>{
    const signatures=reviews[id]||{};
    updateRecord(id,r=>({...r,reviewStartedAt:Date.now()}));
    if(signatureCount(signatures)>0)resetSignatures(id);
  };
  const beginEdit=()=>{
    if(!selected||!currentData)return;
    setDraftText(jsonText(currentData));setProtocolRevision(record?.protocolRevision||"July 2026");setError("");setEditing(true);
  };
  const saveDraft=()=>{
    if(!selected)return;
    try{
      const parsed=JSON.parse(draftText);
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Medication data must be a JSON object.");
      const id=(parsed as Record<string,unknown>).id;
      if(id&&id!==selected.id)throw new Error("Medication id cannot be changed.");
      updateRecord(selected.id,r=>({...r,protocolRevision:protocolRevision.trim()||r.protocolRevision,draft:parsed,draftCreatedAt:Date.now(),reviewStartedAt:Date.now()}));
      resetSignatures(selected.id);setEditing(false);setError("");
    }catch(err){setError(err instanceof Error?err.message:"Invalid medication data")}
  };
  const discardDraft=()=>{if(!selected)return;if(!window.confirm(`Discard the pending clinical changes for ${selected.name}?`))return;updateRecord(selected.id,r=>{const next={...r};delete next.draft;delete next.draftCreatedAt;return next});resetSignatures(selected.id);setEditing(false)};

  useEffect(()=>{
    if(!selectedId)return;
    const r=getRecord(state,selectedId),signatures=reviews[selectedId]||{};
    if(!r.reviewStartedAt||signatureCount(signatures)!==3)return;
    const completedAt=Math.max(...Object.values(signatures).map(item=>item?.approvedAt||0),Date.now());
    const changeSummary=r.draft?diffSummary((loadClinicalOverrides()[selectedId] as unknown)||baseData(medications.find(m=>m.id===selectedId)!),r.draft):[];
    if(r.draft){const nextOverrides=loadClinicalOverrides();nextOverrides[selectedId]=deepClone(r.draft);saveClinicalOverrides(nextOverrides)}
    const historyEntry={id:`${selectedId}-${completedAt}`,startedAt:r.reviewStartedAt,completedAt,nextReviewAt:addMonths(completedAt,REVIEW_INTERVAL_MONTHS),protocolRevision:r.protocolRevision,clinicalRevision:r.draft?r.clinicalRevision+1:r.clinicalRevision,result:r.draft?"changes-approved" as const:"no-change" as const,signatures:deepClone(signatures),changeSummary};
    const nextRecord:MedicationAdminRecord={...r,clinicalRevision:historyEntry.clinicalRevision,lastCompletedAt:completedAt,nextReviewAt:historyEntry.nextReviewAt,history:[historyEntry,...r.history]};
    delete nextRecord.reviewStartedAt;delete nextRecord.draft;delete nextRecord.draftCreatedAt;
    const next={...state,[selectedId]:nextRecord};setState(next);saveMedicationAdminState(next);
  },[reviews,selectedId]);

  return <div className="modal-backdrop admin-med-backdrop" onClick={close}>
    <section className="admin-med-modal" role="dialog" aria-modal="true" aria-label="Medication administration" onClick={event=>event.stopPropagation()}>
      <header className="admin-med-header"><div><small>ADMIN • CLINICAL GOVERNANCE</small><h2>{selected?selected.name:"Medication management"}</h2><span>{selected?`DMP ${selected.protocol.id} • ${record?.protocolRevision||"July 2026"}`:"Review, edit and re-approve medication information"}</span></div><button onClick={selected?()=>{setSelectedId(null);setEditing(false)}:close}>{selected?"‹ Medications":"×"}</button></header>
      {!selected&&<>
        <div className="admin-med-summary"><b>{medications.length} medications</b><span>Three sequential signatures retained • six-month review tracking enabled</span></div>
        <label className="admin-med-search"><span>Search medications</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Medication or protocol"/></label>
        <div className="admin-med-list">{filtered.map(m=>{const r=getRecord(state,m.id),s=reviews[m.id]||{},timing=reviewTiming(r);return <button key={m.id} className={`admin-med-row ${timing}`} onClick={()=>{setSelectedId(m.id);setEditing(false)}}><span><strong>{m.name}</strong><small>{m.brand} • DMP {m.protocol.id}</small><em>{statusLabel(r,s)}</em></span><span className="admin-med-review-dates"><b>{signatureCount(s)}/3</b><small>Last: {formatReviewDate(r.lastCompletedAt)}</small><small>Next: {r.nextReviewAt?formatReviewDate(r.nextReviewAt):"Not scheduled"}</small></span><i>›</i></button>})}</div>
      </>}
      {selected&&record&&currentData&&<div className="admin-med-detail">
        <section className="admin-med-status-card"><div><small>CLINICAL REVISION</small><b>Revision {record.clinicalRevision}{record.draft?" • DRAFT":""}</b><span>{statusLabel(record,reviews[selected.id]||{})}</span></div><div><small>LAST REVIEW</small><b>{formatReviewDate(record.lastCompletedAt)}</b><span>Next: {record.nextReviewAt?formatReviewDate(record.nextReviewAt):"Complete the first review"}</span></div><div><small>SIGNATURES</small><b>{signatureCount(reviews[selected.id]||{})}/3</b><span>Owner → Line Safety → Medical Director</span></div></section>
        {!!record.draft&&<div className="admin-med-draft-warning"><b>Clinical changes are pending review.</b><span>The currently approved field data remains active until all three signatures are complete.</span></div>}
        <div className="admin-med-actions"><button onClick={beginEdit}>Edit medication</button><button onClick={()=>beginReview(selected.id)}>{record.reviewStartedAt?"Restart review":"Start 6-month review"}</button><button className="primary" disabled={!record.reviewStartedAt} onClick={()=>openLegacyReview(selected.id)}>Open 3-signature review</button>{!!record.draft&&<button className="danger" onClick={discardDraft}>Discard draft</button>}</div>
        {editing?<section className="admin-med-editor"><div className="admin-med-editor-note"><b>EDIT CLINICAL INFORMATION</b><span>Edit the complete medication record below. Saving creates a draft and clears current-cycle signatures. The field calculator continues using approved information until the 3-signature review is complete.</span></div><label><span>Protocol revision reviewed against</span><input value={protocolRevision} onChange={event=>setProtocolRevision(event.target.value)} placeholder="e.g. January 2027"/></label><label><span>Medication clinical record</span><textarea value={draftText} onChange={event=>setDraftText(event.target.value)} spellCheck={false}/></label>{error&&<div className="admin-med-error">{error}</div>}<div className="admin-med-editor-actions"><button onClick={()=>setEditing(false)}>Cancel</button><button className="primary" onClick={saveDraft}>Save clinical draft</button></div></section>:<ClinicalRecord data={currentData}/>} 
        <section className="admin-med-signatures"><h3>Current review signatures</h3>{(["owner","lineSafety","medicalDirector"] as const).map((stage,index)=>{const approval=reviews[selected.id]?.[stage];const labels=["Owner / Admin","Line Safety","Medical Director"];return <article key={stage} className={approval?"complete":"pending"}><i>{approval?"✓":index+1}</i><span><b>{labels[index]}</b>{approval?<small>{approval.reviewer} • {new Date(approval.approvedAt).toLocaleString()}</small>:<small>Pending</small>}</span></article>})}</section>
        <section className="admin-med-history"><h3>Review history</h3>{record.history.length?record.history.map(item=><details key={item.id}><summary><b>{new Date(item.completedAt).toLocaleDateString()}</b><span>{item.result==="no-change"?"No clinical changes":"Clinical changes approved"} • Revision {item.clinicalRevision}</span></summary><p>Protocol revision: {item.protocolRevision}</p><p>Next review: {new Date(item.nextReviewAt).toLocaleDateString()}</p>{item.changeSummary?.length?<ul>{item.changeSummary.map(change=><li key={change}>{change}</li>)}</ul>:null}</details>):<p>No completed six-month reviews recorded yet.</p>}</section>
      </div>}
      <footer className="admin-med-footer"><span>Review records are stored on this device. Department-wide synchronization still requires a shared backend or managed-device distribution process.</span><button onClick={close}>Done</button></footer>
    </section>
  </div>;
}

function ClinicalRecord({data}:{data:JsonObject}){
  const entries=Object.entries(data).filter(([key])=>!key.startsWith("_"));
  return <section className="admin-clinical-record"><div className="admin-clinical-intro"><small>COMPLETE MEDICATION RECORD</small><b>Review every section against the current protocol.</b><span>Use Edit medication only when the approved protocol changes.</span></div>{entries.map(([key,value])=><article key={key}><h3>{key.replace(/([A-Z])/g," $1").replace(/^./,letter=>letter.toUpperCase())}</h3>{Array.isArray(value)?<div className="admin-value-list">{value.map((item,index)=><div key={index}>{typeof item==="object"&&item!==null?<pre>{JSON.stringify(item,null,2)}</pre>:<span>{String(item)}</span>}</div>)}</div>:typeof value==="object"&&value!==null?<pre>{JSON.stringify(value,null,2)}</pre>:<p>{String(value??"—")}</p>}</article>)}</section>;
}
