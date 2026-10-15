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

function readStoredObject(key:string):Record<string,unknown>|null{
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||"null");
    return objectRecord(parsed)?parsed as Record<string,unknown>:null;
  }catch{return null}
}

export function medicationReleaseNeedsRepair(meta:ReleaseMeta,row:MedicationReleaseRow){
  if(meta.version!==Number(row.release_version))return true;
  if(meta.medicationCount!==Number(row.medication_count)||meta.medicationIds.length!==row.payload.medicationIds.length)return true;
  const medicationState=readStoredObject(ADMIN_MEDICATION_STATE_KEY);
  const reviews=readStoredObject(REVIEW_KEY);
  const catalog=readStoredObject(MEDICATION_CATALOG_KEY);
  const clinicalOverrides=readStoredObject(CLINICAL_OVERRIDE_KEY);
  if(!medicationState||!reviews||!catalog||!clinicalOverrides)return true;
  if(row.payload.medicationIds.some(id=>!objectRecord(medicationState[id])||!objectRecord(reviews[id])))return true;
  // Detect stale images and other published data even when the release version matches.
  return JSON.stringify(clinicalOverrides)!==JSON.stringify(row.payload.clinicalOverrides)
    ||JSON.stringify(catalog)!==JSON.stringify(row.payload.catalog)
    ||JSON.stringify(medicationState)!==JSON.stringify(row.payload.medicationState)
    ||JSON.stringify(reviews)!==JSON.stringify(row.payload.reviews);
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
  if(!validateReleasePayload(row.payload)){
    const payload=row.payload as unknown as Record<string,unknown>|null;
    const required=["medicationState","reviews","catalog","clinicalOverrides"];
    const missing=required.filter(key=>!payload?.[key]||typeof payload[key]!=="object"||Array.isArray(payload[key]));
    const reason=payload?.schemaVersion!==1?"unsupported schema version":!Array.isArray(payload?.medicationIds)||!(payload.medicationIds as unknown[]).length?"missing medication IDs":missing.length?`missing or invalid fields: ${missing.join(", ")}`:"invalid clinical override paths";
    throw new Error(`Medication release validation failed (${reason}). No new release was installed.`);
  }
  if(row.payload.medicationIds.length!==Number(row.medication_count))throw new Error("The downloaded medication count failed validation.");
  // Snapshot the previous verified data so an interrupted storage write cannot leave a mixed release.
  const updates:[string,string][]=[
    [ADMIN_MEDICATION_STATE_KEY,JSON.stringify(row.payload.medicationState)],
    [REVIEW_KEY,JSON.stringify(row.payload.reviews)],
    [MEDICATION_CATALOG_KEY,JSON.stringify(row.payload.catalog)],
    [CLINICAL_OVERRIDE_KEY,JSON.stringify(row.payload.clinicalOverrides)]
  ];
  const meta:ReleaseMeta={version:Number(row.release_version),publishedAt:row.published_at,protocolRevision:row.protocol_revision,medicationCount:Number(row.medication_count),medicationIds:row.payload.medicationIds,hiddenMedicationIds:hiddenMedicationIds(visibility)};
  updates.push([RELEASE_META_KEY,JSON.stringify(meta)]);
  const previous=updates.map(([key])=>[key,localStorage.getItem(key)] as const);
  try{
    for(const [key,value] of updates)localStorage.setItem(key,value);
  }catch(error){
    for(const [key,value] of previous){
      try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{/* Storage may be unavailable; do not claim verification. */}
    }
    throw new Error("Could not safely store the medication release. Previous data restoration was attempted.",{cause:error});
  }
  return meta;
}

export async function downloadLatestMedicationRelease(){
  const visibility=await downloadFieldVisibility();
  const {data,error}=await neonPublicClient.from("medication_releases").select("release_version,protocol_revision,payload,medication_count,published_at").order("release_version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(!data){const current=readReleaseMeta();return {updated:visibility.updated,meta:current?saveReleaseVisibility(current,visibility.state):null}}
  const row=data as MedicationReleaseRow,current=readReleaseMeta();
  if(current&&current.version>Number(row.release_version))return {updated:visibility.updated,meta:saveReleaseVisibility(current,visibility.state)};
  if(current&&current.version===Number(row.release_version)&&!medicationReleaseNeedsRepair(current,row))return {updated:visibility.updated,meta:saveReleaseVisibility(current,visibility.state)};
  return {updated:true,meta:installMedicationRelease(row,visibility.state)};
}
