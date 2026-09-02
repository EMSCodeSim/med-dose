import {
  loadMedicationAdminState,
  reviewTiming,
  signatureCount,
  type MedicationAdminState,
  type ReviewHistoryEntry,
} from "./adminMedicationStore";
import {CURRENT_DMP_PROTOCOL_REVISION,DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";

export type MedicationApprovalState =
  | "approved"
  | "due-soon"
  | "overdue"
  | "in-review"
  | "changes-pending"
  | "not-reviewed";

export type MedicationApprovalStatus = {
  medicationId:string;
  state:MedicationApprovalState;
  label:string;
  protocolRevision:string;
  clinicalRevision:number;
  completedAt?:number;
  nextReviewAt?:number;
};

const latestCompleted=(history:ReviewHistoryEntry[]|undefined)=>
  [...(history||[])].filter(item=>item.completedAt>0).sort((a,b)=>b.completedAt-a.completedAt)[0];

export function medicationApprovalStatus(
  medicationId:string,
  state:MedicationAdminState=loadMedicationAdminState(),
  now=Date.now(),
):MedicationApprovalStatus{
  const record=state[medicationId];
  const base={
    medicationId,
    protocolRevision:record?.protocolRevision||CURRENT_DMP_PROTOCOL_REVISION,
    clinicalRevision:record?.clinicalRevision||1,
    completedAt:record?.lastCompletedAt,
    nextReviewAt:record?.nextReviewAt,
  };
  if(record?.draft)return {...base,state:"changes-pending",label:"CHANGES PENDING"};
  if(record?.reviewStartedAt)return {...base,state:"in-review",label:"REVIEW IN PROGRESS"};
  const completed=latestCompleted(record?.history);
  const completedForCurrentRevision=!!completed&&
    completed.protocolRevision===CURRENT_DMP_PROTOCOL_REVISION&&
    completed.clinicalRevision===(record?.clinicalRevision||1)&&
    signatureCount(completed.signatures)===3;
  if(!completedForCurrentRevision)return {...base,state:"not-reviewed",label:"NOT REVIEWED"};
  const timing=reviewTiming(record,now);
  if(timing==="overdue")return {...base,state:"overdue",label:"REVIEW OVERDUE"};
  if(timing==="due-soon")return {...base,state:"due-soon",label:"REVIEW DUE SOON"};
  return {...base,state:"approved",label:"APPROVED"};
}

export function releasedMedicationApprovalStatuses(state:MedicationAdminState=loadMedicationAdminState(),now=Date.now()){
  return DEFAULT_FIELD_MEDICATION_IDS.map(id=>medicationApprovalStatus(id,state,now));
}
