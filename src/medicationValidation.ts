import {
  MEDICATION_VALIDATION_KEYS,
  type MedicationAdminRecord,
  type MedicationValidationKey,
  type MedicationValidationState,
} from "./adminMedicationStore";

type ClinicalData={paths?:Array<{patient?:string}>;concentrations?:unknown[]};

export const MEDICATION_VALIDATION_LABELS:Record<MedicationValidationKey,{label:string;description:string}>={
  protocol:{label:"Protocol reviewed",description:"Compared with the current department-approved source."},
  formula:{label:"Formula validated",description:"Dose rules, units, limits and rounding were independently checked."},
  concentration:{label:"Concentration / supplied strength validated",description:"The field concentration, package strength, preparation and any volume conversion were checked."},
  adult:{label:"Adult cases passed",description:"Adult minimum, typical, maximum and input-change cases passed."},
  pediatric:{label:"Pediatric cases passed",description:"Pediatric weights, ages, limits and input-change cases passed."},
  edgeCases:{label:"Edge cases passed",description:"Route changes, caps, resets, invalid input and repeat-dose behavior passed."},
};

export function validationTarget(record:MedicationAdminRecord){
  return {protocolRevision:record.protocolRevision,clinicalRevision:record.clinicalRevision+(record.draft?1:0)};
}

export function requiredValidationKeys(data:ClinicalData):MedicationValidationKey[]{
  const paths=Array.isArray(data.paths)?data.paths:[];
  const groups=new Set(paths.map(path=>path.patient));
  const hasAdult=groups.has("adult")||groups.has("all");
  const hasPediatric=groups.has("pediatric")||groups.has("all");
  return MEDICATION_VALIDATION_KEYS.filter(key=>
    (key!=="adult"||hasAdult)&&
    (key!=="pediatric"||hasPediatric),
  );
}

export function validationIsCurrent(record:MedicationAdminRecord,validation=record.validation){
  if(!validation)return false;
  const target=validationTarget(record);
  return validation.protocolRevision===target.protocolRevision&&validation.clinicalRevision===target.clinicalRevision;
}

export function medicationValidationProgress(record:MedicationAdminRecord,data:ClinicalData){
  const required=requiredValidationKeys(data);
  const current=validationIsCurrent(record);
  const completed=current?required.filter(key=>!!record.validation?.checks[key]):[];
  return {required,completed,total:required.length,complete:required.length>0&&completed.length===required.length,current};
}

export function validationReviewers(validation:MedicationValidationState|undefined){
  return Array.from(new Set(Object.values(validation?.checks||{}).map(check=>check?.validatedBy).filter(Boolean) as string[]));
}
