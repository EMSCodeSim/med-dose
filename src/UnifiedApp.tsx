"use client";
import {useEffect,useMemo,useState} from "react";
import MedicationEngine,{type GenericTreatmentContext} from "./MedicationEngine";
import {assertReleasedMedicationDefinitions,fieldMedicationDefinition,releasedFieldMedicationDefinitions} from "./fieldMedicationDefinitions";
import {DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";
import {mergeMedicationCatalog,medicationCatalogRetired,medicationCatalogVisible,type CatalogMedication} from "./medicationCatalogStore";
import AdminMedicationManager from "./AdminMedicationManager";
import ProtocolViewer,{type ProtocolTarget} from "./ProtocolViewer";
import FieldToolbar from "./FieldToolbar";
import EncounterReport from "./EncounterReport";
import type {ReviewSignatures} from "./adminMedicationStore";
import "./pilotHome.css";

export type EncounterAdministration={drug:string;reason:string;route:string;dose:number;unit:string;volume:number;volumeUnit?:string;time:number;concentration:string;patient?:string;baseAuthorization?:{physician:string;time:number;reason:string}};
type Reviews=Record<string,ReviewSignatures>;
const REVIEW_KEY="metro-med-dose-medication-reviews-v1";
const brands:Record<string,string>={adenosine:"Adenocard",amiodarone:"Cordarone",ondansetron:"Zofran",haloperidol:"Haldol",atropine:"Atropine",midazolam:"Versed",fentanyl:"Fentanyl",calcium:"Calcium chloride / gluconate",dextrose:"Dextrose",diphenhydramine:"Benadryl",epinephrine:"Adrenalin",magnesium:"Magnesium Sulfate",methylprednisolone:"Solu-Medrol",naloxone:"Narcan","sodium-bicarbonate":"Sodium Bicarbonate",ketamine:"Ketamine"};
const subtitles:Record<string,string>={adenosine:"Antiarrhythmic",amiodarone:"Antiarrhythmic",ondansetron:"Antiemetic",haloperidol:"Antipsychotic / agitation",atropine:"Anticholinergic",midazolam:"Benzodiazepine • seizure / sedation",fentanyl:"Opioid analgesic",calcium:"Electrolyte / membrane stabilization",dextrose:"Hypoglycemia",diphenhydramine:"Antihistamine",epinephrine:"Arrest • anaphylaxis • shock • airway",magnesium:"Antiarrhythmic • bronchodilator • eclampsia",methylprednisolone:"Corticosteroid",naloxone:"Opioid antagonist","sodium-bicarbonate":"Buffer / sodium-channel toxicity",ketamine:"Adult analgesia waiver"};

function baseCatalog():CatalogMedication[]{
  return releasedFieldMedicationDefinitions.map(def=>({id:def.id,name:def.name,brand:brands[def.id]||def.name,sub:subtitles[def.id]||"DMP medication",protocol:{id:def.protocolId,name:def.name,page:def.page},visible:true}));
}
function readReviews():Reviews{try{return JSON.parse(localStorage.getItem(REVIEW_KEY)||"{}") as Reviews}catch{return {}}}

export default function UnifiedApp(){
  assertReleasedMedicationDefinitions();
  const [activeId,setActiveId]=useState<string|null>(null),[adminOpen,setAdminOpen]=useState(false),[protocol,setProtocol]=useState<ProtocolTarget|null>(null),[reportOpen,setReportOpen]=useState(false),[online,setOnline]=useState(typeof navigator==="undefined"?true:navigator.onLine),[reviews,setReviewsState]=useState<Reviews>(()=>typeof window==="undefined"?{}:readReviews()),[administrations,setAdministrations]=useState<EncounterAdministration[]>([]),[treatment,setTreatment]=useState<GenericTreatmentContext|null>(null),[catalogRevision,setCatalogRevision]=useState(0);
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)}},[]);
  const catalog=useMemo(()=>mergeMedicationCatalog(baseCatalog()),[catalogRevision]);
  const visibleIds=useMemo(()=>DEFAULT_FIELD_MEDICATION_IDS.filter(id=>!medicationCatalogRetired(id)&&medicationCatalogVisible(id,true)&&!!fieldMedicationDefinition(id)),[catalogRevision]);
  const active=activeId?fieldMedicationDefinition(activeId):null;
  const setReviews=(next:Reviews)=>{setReviewsState(next);try{localStorage.setItem(REVIEW_KEY,JSON.stringify(next))}catch{}};
  const openMedication=(id:string)=>{if(!visibleIds.includes(id)||!fieldMedicationDefinition(id))return;setTreatment(null);setActiveId(id)};
  return <main className="wizard-app unified-runtime" data-medication-engine="one">
    <header><div className="brand"><b>M</b><span><strong>Metro Med Dose</strong><small>One medication engine • DMP cross-check</small></span></div><div className="header-actions"><span className={`connection ${online?"online":"offline"}`}>{online?"Online":"Offline ready"}</span><button onClick={()=>setAdminOpen(true)}>Admin</button></div></header>

    {!active&&<section className="wizard-shell pilot-home-shell"><section className="pilot-home" aria-labelledby="pilot-home-title"><div className="pilot-home-heading"><span>ONE STANDARDIZED MEDICATION ENGINE</span><h1 id="pilot-home-title">Select med</h1><p>Selecting a medication here completes the medication-selection step. Every released drug then enters the same calculation engine.</p></div><div className="pilot-medication-grid">{visibleIds.map(id=>{const med=catalog.find(item=>item.id===id),def=fieldMedicationDefinition(id);if(!def)return null;return <button key={id} className={`pilot-medication-card ${id}`} onClick={()=>openMedication(id)}><span className="pilot-vial" aria-hidden="true"><i/><b>{id==="midazolam"?"VERSED":def.name.toUpperCase()}</b><small>REFERENCE</small></span><span className="pilot-medication-copy"><small>FIELD MEDICATION</small><strong>{def.name}</strong><b>{med?.brand||brands[id]||def.name}</b><span>{med?.sub||subtitles[id]||`DMP ${def.protocolId}`}</span></span><i className="pilot-card-arrow" aria-hidden="true">›</i></button>})}</div><div className="pilot-home-footer"><span>{visibleIds.length} released medications • one renderer • one state machine</span><button onClick={()=>setAdminOpen(true)}><i aria-hidden="true">⚙</i> Admin</button></div></section></section>}

    {active&&<section className="wizard-shell generic-calculator-host single-engine-host"><MedicationEngine medication={active} close={()=>{setTreatment(null);setActiveId(null)}} openProtocol={()=>setProtocol({id:active.protocolId,name:active.name,page:active.page})} record={entry=>setAdministrations(items=>[...items,entry])} onContextChange={setTreatment}/></section>}

    {active&&<FieldToolbar ageYears={null} ageLabel="Current patient" weightKg={null} currentDrug={active.name} currentIndication={treatment?.indication} currentRoute={treatment?.route} currentDose={treatment?.dose} currentVolume={treatment?.volume} genericTreatment={treatment} approvedMedicationIds={visibleIds} onSelectMedication={openMedication} onSelectSuggestedMedication={openMedication} reportReady={administrations.length>0} onOpenReport={()=>setReportOpen(true)}/>} 
    {reportOpen&&<EncounterReport entries={administrations} close={()=>setReportOpen(false)}/>} 
    {protocol&&<ProtocolViewer target={protocol} close={()=>setProtocol(null)}/>} 
    {adminOpen&&<AdminMedicationManager medications={catalog} reviews={reviews} setReviews={setReviews} openLegacyReview={(id)=>{setAdminOpen(false);openMedication(id)}} close={()=>{setAdminOpen(false);setCatalogRevision(v=>v+1)}}/>}
  </main>;
}
