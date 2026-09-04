import {useEffect,useMemo,useState} from "react";
import MedicationEngine from "./MedicationEngine";
import EncounterReport from "./EncounterReport";
import {fieldMedicationDefinition} from "./expandedFieldMedicationDefinitions";
import {DEFAULT_FIELD_MEDICATION_IDS,CURRENT_DMP_PROTOCOL_REVISION} from "./medicationReleaseConfig";
import {medicationApprovalStatus} from "./medicationApprovalStatus";
import type {EncounterPatient} from "./encounterTypes";
import "./fieldApp.css";

const categories:Record<string,string[]>={
  adenosine:["Adult","Peds","Cardiac"], albuterol:["Adult","Peds","Airway"], amiodarone:["Adult","Peds","Arrest","Cardiac"],
  ondansetron:["Adult","Peds"], droperidol:["Adult","Peds","Pain/Sedation"], atropine:["Adult","Peds","Cardiac"],
  midazolam:["Adult","Peds","Pain/Sedation"], calcium:["Adult","Peds","Arrest","Cardiac"], dextrose:["Adult","Peds"],
  diphenhydramine:["Adult","Peds"], epinephrine:["Adult","Peds","Arrest","Airway","Cardiac"], ipratropium:["Adult","Peds","Airway"],
  magnesium:["Adult","Peds","Airway","Cardiac"], methylprednisolone:["Adult","Peds","Airway"], naloxone:["Adult","Peds"],
  nitroglycerin:["Adult","Cardiac"], ketorolac:["Adult","Peds","Pain/Sedation"], fentanyl:["Adult","Peds","Pain/Sedation"], ketamine:["Adult","Pain/Sedation"],
  txa:["Adult","Trauma"], "oral-glucose":["Adult","Peds"], "racemic-epinephrine":["Adult","Peds","Airway"], "sodium-bicarbonate":["Adult","Peds","Arrest","Cardiac"],
};
const aliases:Record<string,string[]>={
  adenosine:["adeno","adenocard","svt","avnrt"], amiodarone:["amio","cordarone","vt","vf"], ondansetron:["zofran","nausea","vomiting"],
  midazolam:["versed","seizure","sedation"], fentanyl:["pain","opioid"], ketamine:["ketamine","ketalar","pain","analgesia"], txa:["txa","tranexamic","tranexamic acid","trauma","hemorrhage","hemorrhagic shock"], epinephrine:["epi","anaphylaxis","allergy","arrest"],
  albuterol:["ventolin","bronchospasm","wheezing"], ipratropium:["atrovent"], ketorolac:["toradol","pain"], naloxone:["narcan","overdose"],
  nitroglycerin:["nitro","chest pain","acs","pulmonary edema"], diphenhydramine:["benadryl","allergy"], methylprednisolone:["solumedrol","solu-medrol"],
};
const brandNames:Record<string,string>={adenosine:"Adenocard",albuterol:"Ventolin",amiodarone:"Cordarone",ondansetron:"Zofran",atropine:"Atropine Sulfate",midazolam:"Versed",ipratropium:"Atrovent",ketorolac:"Toradol",naloxone:"Narcan",diphenhydramine:"Benadryl",methylprednisolone:"Solu-Medrol",txa:"TXA"};
const treatmentFilters=["Arrest","Airway","Cardiac","Pain/Sedation","Trauma"];
type View="meds"|"treatments"|"favorites";
type PatientState={weightKg:string;ageYears:string};
const EMPTY_PATIENT:PatientState={weightKg:"",ageYears:""};
const readPatient=():PatientState=>{try{const parsed=JSON.parse(sessionStorage.getItem("mmd-patient")||"null");return parsed&&typeof parsed==="object"?{weightKg:String(parsed.weightKg||""),ageYears:String(parsed.ageYears||"")}:EMPTY_PATIENT}catch{return EMPTY_PATIENT}};
const readList=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||"[]") as string[]}catch{return[]}};

export default function FieldApp(){
  const [patient,setPatient]=useState<PatientState>(readPatient),[editingPatient,setEditingPatient]=useState(false),[unit,setUnit]=useState<"kg"|"lb">("kg"),
    [query,setQuery]=useState(""),[filter,setFilter]=useState(""),[view,setView]=useState<View>("meds"),[selectedId,setSelectedId]=useState<string|null>(null),[online,setOnline]=useState(navigator.onLine),
    [favorites,setFavorites]=useState<string[]>(()=>readList("mmd-favorites")),[recent,setRecent]=useState<string[]>(()=>readList("mmd-recent")),[reportOpen,setReportOpen]=useState(false),[administrations,setAdministrations]=useState<any[]>([]);
  useEffect(()=>{sessionStorage.setItem("mmd-patient",JSON.stringify(patient))},[patient]);
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);addEventListener("online",on);addEventListener("offline",off);return()=>{removeEventListener("online",on);removeEventListener("offline",off)}},[]);
  useEffect(()=>localStorage.setItem("mmd-favorites",JSON.stringify(favorites)),[favorites]);
  useEffect(()=>localStorage.setItem("mmd-recent",JSON.stringify(recent)),[recent]);

  const hasWeight=patient.weightKg.trim()!==""&&Number(patient.weightKg)>0,hasAge=patient.ageYears.trim()!==""&&Number(patient.ageYears)>=0,
    kg=hasWeight?Number(patient.weightKg):0,age=hasAge?Number(patient.ageYears):0,patientKind:EncounterPatient["patient"]=hasAge&&age<12?"pediatric":"adult";
  const initialPatient:EncounterPatient={patient:patientKind,...(hasAge?{ageYears:age}:{}),...(hasWeight?{weightKg:kg}:{})};

  const meds=useMemo(()=>DEFAULT_FIELD_MEDICATION_IDS.map(id=>{const def=fieldMedicationDefinition(id);if(!def)return null;const status=medicationApprovalStatus(id);return{id,def,status}}).filter(Boolean) as {id:string;def:NonNullable<ReturnType<typeof fieldMedicationDefinition>>;status:ReturnType<typeof medicationApprovalStatus>}[],[]);
  const approvedMeds=useMemo(()=>meds.filter(({status})=>status.state==="approved"),[meds]);
  const approvedIds=useMemo(()=>new Set(approvedMeds.map(x=>x.id)),[approvedMeds]);
  const visible=useMemo(()=>approvedMeds.filter(({id,def})=>{
    if(view==="favorites"&&!favorites.includes(id))return false;
    if(view==="treatments"&&filter&&!categories[id]?.includes(filter))return false;
    const q=query.trim().toLowerCase();if(!q)return true;
    const hay=[id,def.name,brandNames[id],def.protocolId,...(aliases[id]||[]),...def.paths.flatMap(p=>[p.label,p.protocol])].filter(Boolean).join(" ").toLowerCase();return hay.includes(q);
  }).sort((a,b)=>view==="favorites"?favorites.indexOf(a.id)-favorites.indexOf(b.id):a.def.name.localeCompare(b.def.name)),[approvedMeds,query,filter,view,favorites]);

  const openMed=(id:string)=>{if(!approvedIds.has(id))return;setPatient(readPatient());setSelectedId(id);setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,5));scrollTo({top:0,behavior:"auto"})};
  const toggleFav=(id:string)=>setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[id,...f]);
  const selected=selectedId&&approvedIds.has(selectedId)?fieldMedicationDefinition(selectedId):null;
  if(selected)return <div className="field-mode-shell field-engine-shell">
    <div className={`field-offline-banner ${online?"online":"offline"}`}>{online?"✓ OFFLINE READY":"OFFLINE — Using cached protocol data"} <span>{selected.id==="txa"?"Dept 500:63":CURRENT_DMP_PROTOCOL_REVISION}</span></div>
    <div className="field-report-bar"><button type="button" disabled={!administrations.length} onClick={()=>setReportOpen(true)}>Report{administrations.length?` (${administrations.length})`:""}</button></div>
    {reportOpen&&<EncounterReport entries={administrations} close={()=>setReportOpen(false)}/>} 
    <MedicationEngine medication={selected} close={()=>setSelectedId(null)} record={entry=>setAdministrations(items=>[...items,entry])} openProtocol={()=>window.open(selected.id==="txa"?"/protocols/txa-500-63.html":"/protocols/dmp-current.pdf","_blank","noopener,noreferrer")} initialPatient={initialPatient}/>
  </div>;

  const viewTitle=view==="favorites"?"FAVORITES":view==="treatments"?"TREATMENT MEDICATIONS":"FIELD MEDICATIONS";
  const selectView=(next:View)=>{setView(next);setQuery("");if(next!=="treatments")setFilter("");window.scrollTo({top:0,behavior:"auto"})};
  const openCurrentProtocol=()=>window.open("/protocols/dmp-current.pdf","_blank","noopener,noreferrer");
  return <div className="field-mode-shell">
    <header className="field-header"><div className="field-brand"><span className="star">✚</span><strong>Metro Med Dose</strong></div><span className={`connect-pill ${online?"online":"offline"}`}>{online?"Offline ready":"Offline"}</span></header>
    {administrations.length>0&&<button className="field-home-report" onClick={()=>setReportOpen(true)}>Report • {administrations.length} administration{administrations.length===1?"":"s"}</button>}
    {reportOpen&&<EncounterReport entries={administrations} close={()=>setReportOpen(false)}/>} 
    <main className="field-home">
      {!online&&<div className="offline-home-banner"><b>OFFLINE</b> — Using cached protocol data.</div>}

      {view==="meds"&&favorites.filter(id=>approvedIds.has(id)).length>0&&<section className="quick-row"><div className="section-head"><b>FAVORITES</b><button onClick={()=>selectView("favorites")}>View all</button></div><div>{favorites.filter(id=>approvedIds.has(id)).map(id=><button key={id} onClick={()=>openMed(id)}>{fieldMedicationDefinition(id)?.name||id}</button>)}</div></section>}

      <div className="med-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Drug, brand, indication or protocol"/><button onClick={()=>setQuery("")}>{query?"×":""}</button></div>
      {view==="treatments"&&<section className="treatment-sort"><div className="section-head"><b>SORT BY TREATMENT</b></div><div className="filter-row">{treatmentFilters.map(x=><button key={x} className={filter===x?"selected":""} onClick={()=>setFilter(f=>f===x?"":x)}>{x}</button>)}</div></section>}
      <div className="results-head"><b>{query?"SEARCH RESULTS":viewTitle}</b><span>{visible.length} medications</span></div>

      {approvedMeds.length===0?<div className="empty-search release-empty"><b>No medications released to Field Mode.</b><span>Complete the current medication review before operational use.</span></div>:
      <section className="field-med-list">{visible.map(({id,def,status})=>{
        const indications=Array.from(new Set(def.paths.map(p=>p.label.replace(/\s*[—-]\s*(adult|pediatric|peds?).*$/i,"").trim())));
        const verified=status.completedAt?new Date(status.completedAt).toLocaleDateString():CURRENT_DMP_PROTOCOL_REVISION;
        const protocolLabel=id==="txa"?`Department ${def.protocolId}`:`Metro DMP ${def.protocolId}`;
        return <article className="field-med-card" key={id} onClick={()=>openMed(id)}>
          <div className={`vial-art ${id==="adenosine"?"has-photo":""}`} aria-hidden="true">{id==="adenosine"?<img src="/medications/adenosine-vial.webp" alt=""/>:<><span></span><b>{def.name.slice(0,3).toUpperCase()}</b></>}</div>
          <div className="med-card-copy"><div className="med-title"><strong>{def.name.toUpperCase()}</strong><button aria-label={`Favorite ${def.name}`} onClick={e=>{e.stopPropagation();toggleFav(id)}}>{favorites.includes(id)?"♥":"♡"}</button></div><small>{brandNames[id]||"Generic"}</small><p>{indications[0]||def.paths[0]?.protocol}</p>{indications.length>1&&<span className="more-indications">+{indications.length-1} other {indications.length===2?"use":"uses"}</span>}<div className="med-meta"><em className={status.state==="approved"?"reviewed":"in-review"}>{status.state==="approved"?"Reviewed":"In review"}</em><span>{protocolLabel} • {status.state==="approved"?`Verified ${verified}`:"Review pending"}</span></div></div>
        </article>})}</section>}
      {approvedMeds.length>0&&visible.length===0&&<div className="empty-search"><b>No medication found.</b><span>Try the generic name, brand name, indication, or protocol.</span></div>}
      <footer className="field-disclaimer">Clinical decision-support tool. Follow your agency's current protocols and medical direction. Verify medication, concentration, dose and route before administration.</footer>
    </main>
    <nav className="field-bottom-nav four"><button className={view==="meds"?"active":""} onClick={()=>selectView("meds")}>⌂<span>Meds</span></button><button className={view==="treatments"?"active":""} onClick={()=>selectView("treatments")}>☷<span>Treatments</span></button><button className={view==="favorites"?"active":""} onClick={()=>selectView("favorites")}>☆<span>Favorites</span></button><button onClick={openCurrentProtocol}>▤<span>Protocol</span></button></nav>
  </div>;
}
