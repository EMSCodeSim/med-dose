import {fieldMedicationDefinition as clinicalFieldMedicationDefinition} from "./clinicalFieldMedicationDefinitions";
import {genericMedication,type GenericMedication,type GenericDosePath} from "./dmpMedicationData";
import {DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";

const unique=(items:string[])=>Array.from(new Set(items));

function droperidolDefinition():GenericMedication|null{
  const antipsychotics=genericMedication("antipsychotics");
  const antiemetics=genericMedication("antiemetics");
  const paths:GenericDosePath[]=[
    ...(antipsychotics?.paths.filter(path=>path.agent.toLowerCase()==="droperidol")||[]),
    ...(antiemetics?.paths.filter(path=>path.agent.toLowerCase()==="droperidol")||[]),
  ];
  if(!paths.length)return null;
  return {
    id:"droperidol",
    name:"Droperidol",
    protocolId:"9045",
    page:129,
    contraindications:[
      "Suspected acute myocardial infarction or acute coronary syndrome",
      "Systolic blood pressure under 100 mmHg or no palpable radial pulse",
      "Signs of respiratory depression",
      "Known QTc prolongation",
      "Pregnancy",
    ],
    paths,
  };
}

function ketorolacDefinition():GenericMedication|null{
  const nsaids=genericMedication("nsaids");
  if(!nsaids)return null;
  const paths=nsaids.paths.filter(path=>path.agent.toLowerCase()==="ketorolac");
  if(!paths.length)return null;
  return {
    id:"ketorolac",
    name:"Ketorolac (Toradol)",
    protocolId:"9225",
    page:162,
    contraindications:unique(nsaids.contraindications),
    paths,
  };
}

const displayNames:Record<string,string>={
  albuterol:"Albuterol Sulfate",
  atropine:"Atropine Sulfate",
  ipratropium:"Ipratropium Bromide",
  magnesium:"Magnesium Sulfate",
};

export function fieldMedicationDefinition(id:string):GenericMedication|null{
  if(id==="droperidol")return droperidolDefinition();
  if(id==="ketorolac")return ketorolacDefinition();
  const base=clinicalFieldMedicationDefinition(id);
  if(!base)return null;
  return displayNames[id]?{...base,name:displayNames[id]}:base;
}

export function assertReleasedMedicationDefinitions(){
  const missing=DEFAULT_FIELD_MEDICATION_IDS.filter(id=>!fieldMedicationDefinition(id));
  if(missing.length)throw new Error(`Expanded medication definitions missing: ${missing.join(", ")}`);
  return true;
}

export const releasedFieldMedicationDefinitions=DEFAULT_FIELD_MEDICATION_IDS.map(id=>fieldMedicationDefinition(id)!).filter(Boolean);
