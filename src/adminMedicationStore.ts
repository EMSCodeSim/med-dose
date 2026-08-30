export const ADMIN_MEDICATION_STATE_KEY = "metro-med-dose-admin-medication-state-v1";
export const CLINICAL_OVERRIDE_KEY = "metro-med-dose-clinical-overrides-v1";
export const PROTOCOL_REVISION_DEFAULT = "July 2026";
export const REVIEW_INTERVAL_MONTHS = 6;

export type ReviewSignature = { reviewer:string; approvedAt:number; revision?:string };
export type ReviewSignatures = Partial<Record<"owner"|"lineSafety"|"medicalDirector",ReviewSignature>>;
export type ReviewHistoryEntry = {
  id:string;
  startedAt:number;
  completedAt:number;
  nextReviewAt:number;
  protocolRevision:string;
  clinicalRevision:number;
  result:"no-change"|"changes-approved";
  signatures:ReviewSignatures;
  changeSummary?:string[];
};
export type MedicationAdminRecord = {
  medicationId:string;
  clinicalRevision:number;
  protocolRevision:string;
  lastCompletedAt?:number;
  nextReviewAt?:number;
  reviewStartedAt?:number;
  draft?:unknown;
  draftCreatedAt?:number;
  history:ReviewHistoryEntry[];
};
export type MedicationAdminState = Record<string,MedicationAdminRecord>;
export type ClinicalOverrideState = Record<string,unknown>;

const canUseStorage=()=>typeof window!=="undefined"&&!!window.localStorage;
const safeParse=<T,>(key:string,fallback:T):T=>{
  if(!canUseStorage())return fallback;
  try{
    const parsed=JSON.parse(window.localStorage.getItem(key)||"");
    return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as T:fallback;
  }catch{return fallback}
};
export const loadMedicationAdminState=()=>safeParse<MedicationAdminState>(ADMIN_MEDICATION_STATE_KEY,{});
export const saveMedicationAdminState=(state:MedicationAdminState)=>{if(canUseStorage())window.localStorage.setItem(ADMIN_MEDICATION_STATE_KEY,JSON.stringify(state))};
export const loadClinicalOverrides=()=>safeParse<ClinicalOverrideState>(CLINICAL_OVERRIDE_KEY,{});
export const saveClinicalOverrides=(state:ClinicalOverrideState)=>{if(canUseStorage())window.localStorage.setItem(CLINICAL_OVERRIDE_KEY,JSON.stringify(state))};
export const deepClone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
export const addMonths=(timestamp:number,months:number)=>{
  const source=new Date(timestamp);
  const day=source.getDate();
  const target=new Date(source);
  target.setDate(1);
  target.setMonth(target.getMonth()+months);
  const lastDay=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
  target.setDate(Math.min(day,lastDay));
  return target.getTime();
};
export const initialAdminRecord=(medicationId:string):MedicationAdminRecord=>({medicationId,clinicalRevision:1,protocolRevision:PROTOCOL_REVISION_DEFAULT,history:[]});
export const signatureCount=(signatures:ReviewSignatures|undefined)=>["owner","lineSafety","medicalDirector"].filter(stage=>!!signatures?.[stage as keyof ReviewSignatures]?.approvedAt).length;
export const reviewTiming=(record:MedicationAdminRecord|undefined,now=Date.now())=>{
  if(record?.reviewStartedAt)return "in-progress" as const;
  if(!record?.nextReviewAt)return "not-scheduled" as const;
  if(now>record.nextReviewAt)return "overdue" as const;
  if(now>record.nextReviewAt-30*24*60*60*1000)return "due-soon" as const;
  return "current" as const;
};
export const formatReviewDate=(timestamp?:number)=>timestamp?new Date(timestamp).toLocaleDateString():"Not completed";
