import {createClient} from "@neondatabase/neon-js";
import {BetterAuthReactAdapter} from "@neondatabase/neon-js/auth/react/adapters";
import type {ClinicalOverrideState,MedicationAdminState,ReviewSignatures} from "./adminMedicationStore";
import type {MedicationCatalogState} from "./medicationCatalogStore";

const AUTH_URL=import.meta.env.VITE_NEON_AUTH_URL||"https://ep-falling-sound-ar6yoxcb.neonauth.c-4.us-west-2.aws.neon.tech/mymeddose/auth";
const DATA_API_URL=import.meta.env.VITE_NEON_DATA_API_URL||"https://ep-falling-sound-ar6yoxcb.apirest.c-4.us-west-2.aws.neon.tech/mymeddose/rest/v1";

export const neonAdminClient=createClient({auth:{url:AUTH_URL,adapter:BetterAuthReactAdapter()},dataApi:{url:DATA_API_URL}});

export type AdminReviews=Record<string,ReviewSignatures>;
export type AdminWorkspacePayload={medicationState:MedicationAdminState;reviews:AdminReviews;catalog:MedicationCatalogState;clinicalOverrides:ClinicalOverrideState};
export type AdminWorkspaceRow={id:string;medication_state:MedicationAdminState;reviews:AdminReviews;catalog:MedicationCatalogState;clinical_overrides:ClinicalOverrideState;version:number;updated_at:string;updated_by:string|null};
export const workspaceToPayload=(row:AdminWorkspaceRow):AdminWorkspacePayload=>({medicationState:row.medication_state||{},reviews:row.reviews||{},catalog:row.catalog||{},clinicalOverrides:row.clinical_overrides||{}});
export const errorMessage=(value:unknown,fallback="Unable to complete that request")=>{
  if(value instanceof Error)return value.message;
  if(value&&typeof value==="object"&&"message" in value)return String((value as {message:unknown}).message);
  return fallback;
};
