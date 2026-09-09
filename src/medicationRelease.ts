import {createClient} from "@neondatabase/neon-js";
import {ADMIN_MEDICATION_STATE_KEY,CLINICAL_OVERRIDE_KEY,type ClinicalOverrideState,type MedicationAdminState,type ReviewSignatures} from "./adminMedicationStore";
import {MEDICATION_CATALOG_KEY,type MedicationCatalogState} from "./medicationCatalogStore";

const AUTH_URL=import.meta.env.VITE_NEON_AUTH_URL||"https://ep-falling-sound-ar6yoxcb.neonauth.c-4.us-west-2.aws.neon.tech/mymeddose/auth";
const DATA_API_URL=import.meta.env.VITE_NEON_DATA_API_URL||"https://ep-falling-sound-ar6yoxcb.apirest.c-4.us-west-2.aws.neon.tech/mymeddose/rest/v1";
const REVIEW_KEY="metro-med-dose-medication-reviews-v1";
export const RELEASE_META_KEY="metro-med-dose-live-release-v1";
export const FIELD_VISIBILITY_KEY="metro-med-dose-field-visibility-v1";

export const neonPublicClient=createClient({auth:{url:AUTH_URL,allowAnonymous:true},dataApi:{url:DATA_API_URL}});

export type ReleasePayload={
  schemaVersion:1;
  protocolRevision:string;
  medicationIds:string[];
  medicationState:MedicationAdminState;
  reviews:Record<string,ReviewSignatures>;
  catalog:MedicationCatalogState;
  clinicalOverrides:ClinicalOverrideState;
};
export type ReleaseMeta={version:number;publishedAt:string;protocolRevision:string;medicationCount:number;medicationIds:string[];hiddenMedicationIds?:string[]};
export type MedicationReleaseRow={release_version:number;protocol_revision:string;payload:ReleasePayload;medication_count:number;published_at:string};
export type FieldVisibilityState=Record<string,boolean>;

const objectRecord=(value:unknown)=>!!value&&typeof value==="object"&&!Array.isArray(value);
export function validateReleasePayload(value:unknown):value is ReleasePayload{
  if(!objectRecord(value))return false;
  const item=value as Partial<ReleasePayload>;
  if(item.schemaVersion!==1||typeof item.protocolRevision!=="string")return false;
  if(!Array.isArray(item.medicationIds)||!item.medicationIds.length||item.medicationIds.some(id=>typeof id!=="string"||!id))return false;
  if(!objectRecord(item.medicationState)||!objectRecord(item.reviews)||!objectRecord(item.catalog)||!objectRecord(item.clinicalOverrides))return false;
  return Object.values(item.clinicalOverrides||{}).every(override=>!override||(objectRecord(override)&&Array.isArray((override as {paths?:unknown}).paths)));
}

export function readReleaseMeta():ReleaseMeta|null{
  try{const parsed=JSON.parse(localStorage.getItem(RELEASE_META_KEY)||"null");return objectRecord(parsed)?parsed as ReleaseMeta:null}catch{return null}
}

export function readFieldVisibility():FieldVisibilityState{
  try{
    const parsed=JSON.parse(localStorage.getItem(FIELD_VISIBILITY_KEY)||"{}");
    return objectRecord(parsed)?parsed as FieldVisibilityState:{};
  }catch{return {}}
}

async function downloadFieldVisibility(){
  const {data,error}=await neonPublicClient.from("field_medication_visibility").select("medication_id,hidden").order("medication_id",{ascending:true});
  if(error)throw error;
  const next=Object.fromEntries((data||[]).map(row=>[String((row as {medication_id:string}).medication_id),Boolean((row as {hidden:boolean}).hidden)]));
  const before=JSON.stringify(readFieldVisibility()),after=JSON.stringify(next);
  if(before!==after)localStorage.setItem(FIELD_VISIBILITY_KEY,after);
  return {updated:before!==after,state:next};
}

const hiddenMedicationIds=(visibility:FieldVisibilityState)=>Object.entries(visibility).filter(([,hidden])=>hidden===true).map(([id])=>id).sort();
function saveReleaseVisibility(meta:ReleaseMeta,visibility:FieldVisibilityState){
  const hiddenIds=hiddenMedicationIds(visibility),before=JSON.stringify(meta.hiddenMedicationIds||[]),after=JSON.stringify(hiddenIds);
  if(before===after)return meta;
  const next={...meta,hiddenMedicationIds:hiddenIds};
  localStorage.setItem(RELEASE_META_KEY,JSON.stringify(next));
  return next;
}

export function installMedicationRelease(row:MedicationReleaseRow,visibility:FieldVisibilityState=readFieldVisibility()){
  if(!validateReleasePayload(row.payload))throw new Error("The downloaded medication release failed validation.");
  if(row.payload.medicationIds.length!==Number(row.medication_count))throw new Error("The downloaded medication count failed validation.");
  localStorage.setItem(ADMIN_MEDICATION_STATE_KEY,JSON.stringify(row.payload.medicationState));
  localStorage.setItem(REVIEW_KEY,JSON.stringify(row.payload.reviews));
  localStorage.setItem(MEDICATION_CATALOG_KEY,JSON.stringify(row.payload.catalog));
  localStorage.setItem(CLINICAL_OVERRIDE_KEY,JSON.stringify(row.payload.clinicalOverrides));
  const meta:ReleaseMeta={version:Number(row.release_version),publishedAt:row.published_at,protocolRevision:row.protocol_revision,medicationCount:Number(row.medication_count),medicationIds:row.payload.medicationIds,hiddenMedicationIds:hiddenMedicationIds(visibility)};
  localStorage.setItem(RELEASE_META_KEY,JSON.stringify(meta));
  return meta;
}

export async function downloadLatestMedicationRelease(){
  const visibility=await downloadFieldVisibility();
  const {data,error}=await neonPublicClient.from("medication_releases").select("release_version,protocol_revision,payload,medication_count,published_at").order("release_version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(!data){const current=readReleaseMeta();return {updated:visibility.updated,meta:current?saveReleaseVisibility(current,visibility.state):null}}
  const row=data as MedicationReleaseRow,current=readReleaseMeta();
  if(current&&current.version>=Number(row.release_version))return {updated:visibility.updated,meta:saveReleaseVisibility(current,visibility.state)};
  return {updated:true,meta:installMedicationRelease(row,visibility.state)};
}
