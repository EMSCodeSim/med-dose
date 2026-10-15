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
export type ReleaseFailureKind="network"|"schema"|"validation"|"storage";
export class MedicationReleaseError extends Error{
  constructor(public readonly kind:ReleaseFailureKind,message:string){super(message);this.name="MedicationReleaseError"}
}

const objectRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const nonEmptyString=(value:unknown):value is string=>typeof value==="string"&&value.trim().length>0;
const positiveNumber=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>0;
const currentPathShape=(path:unknown)=>objectRecord(path)&&nonEmptyString(path.id)&&nonEmptyString(path.label)&&nonEmptyString(path.route)&&
  ["adult","pediatric","all"].includes(String(path.patient))&&objectRecord(path.formula)&&nonEmptyString(path.formula.kind)&&nonEmptyString(path.formula.unit);
const validConcentrations=(value:unknown)=>Array.isArray(value)&&value.length>0&&value.every(item=>objectRecord(item)&&nonEmptyString(item.label)&&positiveNumber(item.amount)&&positiveNumber(item.volume)&&nonEmptyString(item.amountUnit)&&nonEmptyString(item.volumeUnit)&&positiveNumber(item.concentration)&&nonEmptyString(item.concentrationUnit));

// These two v1 records were published by the original admin editor. Their strings are
// display-only legacy dose descriptions; the field engine continues to use its reviewed,
// typed GenericDosePath definitions. Concentrations/photos remain live release metadata.
const legacyDoseRuleFields:Record<string,string[]>={
  adenosine:["adultInitial","adultRepeat","pediatricInitial","pediatricRepeat"],
  albuterol:["single","continuous","repeatSingle"],
};
function validClinicalOverride(id:string,value:unknown):boolean{
  if(!objectRecord(value))return false;
  if(value.id!==undefined&&value.id!==id)return false;
  const pathsValid=Array.isArray(value.paths)&&value.paths.length>0&&value.paths.every(currentPathShape);
  const requiredLegacyFields=legacyDoseRuleFields[id];
  const rules=objectRecord(value.doseRules)?value.doseRules:null;
  const legacyValid=!!requiredLegacyFields&&!!rules&&requiredLegacyFields.every(key=>nonEmptyString(rules[key]));
  if(!pathsValid&&!legacyValid)return false;
  if(value.concentrations!==undefined&&!validConcentrations(value.concentrations))return false;
  if(value.photoDataUrl!==undefined&&(!nonEmptyString(value.photoDataUrl)||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value.photoDataUrl)))return false;
  if(value.indications!==undefined&&(!Array.isArray(value.indications)||!value.indications.every(nonEmptyString)))return false;
  return true;
}

export function releasePayloadValidationError(value:unknown):string|null{
  if(!objectRecord(value))return "Release payload must be a JSON object.";
  const item=value as Partial<ReleasePayload>;
  if(item.schemaVersion!==1)return `Unsupported medication release schema version: ${String(item.schemaVersion)}.`;
  if(!nonEmptyString(item.protocolRevision))return "Release protocol revision is missing.";
  if(!Array.isArray(item.medicationIds)||item.medicationIds.length===0)return "Release medication list is empty or malformed.";
  if(item.medicationIds.some(id=>typeof id!=="string"||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))return "Release medication list contains an invalid medication ID.";
  if(new Set(item.medicationIds).size!==item.medicationIds.length)return "Release medication list contains duplicate IDs.";
  for(const [key,label] of [["medicationState","review state"],["reviews","review approvals"],["catalog","medication catalog"],["clinicalOverrides","clinical medication data"]] as const){
    if(!objectRecord((item as unknown as Record<string,unknown>)[key]))return `Release ${label} must be a JSON object.`;
  }
  for(const id of item.medicationIds){
    if(!objectRecord(item.medicationState?.[id]))return `Release is missing medication review state for “${id}”.`;
    if(!objectRecord(item.reviews?.[id]))return `Release is missing approval signatures for “${id}”.`;
    if(!objectRecord(item.catalog?.[id]))return `Release is missing catalog details for “${id}”.`;
    if(!validClinicalOverride(id,item.clinicalOverrides?.[id]))return `Clinical data for “${id}” does not match a supported medication schema.`;
  }
  return null;
}

export function validateReleasePayload(value:unknown):value is ReleasePayload{return releasePayloadValidationError(value)===null}

export function readReleaseMeta():ReleaseMeta|null{
  try{const parsed=JSON.parse(localStorage.getItem(RELEASE_META_KEY)||"null");return objectRecord(parsed)?parsed as unknown as ReleaseMeta:null}catch{return null}
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
    return objectRecord(parsed)?parsed:null;
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

async function downloadFieldVisibility():Promise<FieldVisibilityState>{
  const {data,error}=await neonPublicClient.from("field_medication_visibility").select("medication_id,hidden").order("medication_id",{ascending:true});
  if(error)throw new MedicationReleaseError("network",`Could not download medication visibility settings: ${error.message||"database request failed"}`);
  return Object.fromEntries((data||[]).map(row=>[String((row as {medication_id:string}).medication_id),Boolean((row as {hidden:boolean}).hidden)]));
}

const hiddenMedicationIds=(visibility:FieldVisibilityState)=>Object.entries(visibility).filter(([,hidden])=>hidden===true).map(([id])=>id).sort();
function saveReleaseVisibility(meta:ReleaseMeta,visibility:FieldVisibilityState){
  const hiddenIds=hiddenMedicationIds(visibility),before=JSON.stringify(meta.hiddenMedicationIds||[]),after=JSON.stringify(hiddenIds);
  if(before===after)return meta;
  const next={...meta,hiddenMedicationIds:hiddenIds};
  localStorage.setItem(FIELD_VISIBILITY_KEY,JSON.stringify(visibility));
  localStorage.setItem(RELEASE_META_KEY,JSON.stringify(next));
  return next;
}

const transactionKeys=[ADMIN_MEDICATION_STATE_KEY,REVIEW_KEY,MEDICATION_CATALOG_KEY,CLINICAL_OVERRIDE_KEY,FIELD_VISIBILITY_KEY,RELEASE_META_KEY];
export function installMedicationRelease(row:MedicationReleaseRow,visibility:FieldVisibilityState=readFieldVisibility()){
  const payloadError=releasePayloadValidationError(row.payload);
  if(payloadError)throw new MedicationReleaseError("schema",`The downloaded medication release failed schema validation: ${payloadError}`);
  if(!Number.isSafeInteger(Number(row.release_version))||Number(row.release_version)<1||row.payload.medicationIds.length!==Number(row.medication_count))
    throw new MedicationReleaseError("validation","The downloaded medication release failed validation: release metadata and medication count do not match.");
  if(!nonEmptyString(row.protocol_revision)||!nonEmptyString(row.published_at))
    throw new MedicationReleaseError("validation","The downloaded medication release failed validation: release revision or publication date is missing.");

  const previous=new Map(transactionKeys.map(key=>[key,localStorage.getItem(key)]));
  try{
    // Metadata is the commit marker and is written last. Synchronous storage failures
    // restore the previous complete set, so readers never trust a partial release.
    localStorage.setItem(ADMIN_MEDICATION_STATE_KEY,JSON.stringify(row.payload.medicationState));
    localStorage.setItem(REVIEW_KEY,JSON.stringify(row.payload.reviews));
    localStorage.setItem(MEDICATION_CATALOG_KEY,JSON.stringify(row.payload.catalog));
    localStorage.setItem(CLINICAL_OVERRIDE_KEY,JSON.stringify(row.payload.clinicalOverrides));
    localStorage.setItem(FIELD_VISIBILITY_KEY,JSON.stringify(visibility));
    const meta:ReleaseMeta={version:Number(row.release_version),publishedAt:row.published_at,protocolRevision:row.protocol_revision,medicationCount:Number(row.medication_count),medicationIds:row.payload.medicationIds,hiddenMedicationIds:hiddenMedicationIds(visibility)};
    localStorage.setItem(RELEASE_META_KEY,JSON.stringify(meta));
    return meta;
  }catch(error){
    for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}
    throw new MedicationReleaseError("storage",`The medication release could not be saved on this device${error instanceof Error&&error.name==="QuotaExceededError"?" because device storage is full":" because local storage is unavailable"}. Your previous verified library was kept.`);
  }
}

export async function downloadLatestMedicationRelease(){
  const visibility=await downloadFieldVisibility();
  const {data,error}=await neonPublicClient.from("medication_releases").select("release_version,protocol_revision,payload,medication_count,published_at").order("release_version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw new MedicationReleaseError("network",`Could not check for a medication release: ${error.message||"database request failed"}`);
  if(!data){
    const current=readReleaseMeta();
    if(current){
      try{localStorage.setItem(FIELD_VISIBILITY_KEY,JSON.stringify(visibility));return {updated:false,meta:{...current,hiddenMedicationIds:hiddenMedicationIds(visibility)}}}
      catch{throw new MedicationReleaseError("storage","Medication visibility settings could not be saved on this device. Your verified medication library remains available.")}
    }
    return {updated:false,meta:null};
  }
  const row=data as MedicationReleaseRow,current=readReleaseMeta();
  const payloadError=releasePayloadValidationError(row.payload);
  if(payloadError)throw new MedicationReleaseError("schema",`Release ${row.release_version} failed schema validation: ${payloadError}`);
  if(row.payload.medicationIds.length!==Number(row.medication_count))throw new MedicationReleaseError("validation",`Release ${row.release_version} failed validation: its medication count does not match its payload.`);
  if(current&&current.version>Number(row.release_version))return {updated:false,meta:current};
  if(current&&current.version===Number(row.release_version)&&!medicationReleaseNeedsRepair(current,row))return {updated:false,meta:saveReleaseVisibility(current,visibility)};
  return {updated:true,meta:installMedicationRelease(row,visibility)};
}
