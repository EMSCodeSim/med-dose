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

function midazolamAgeChecked(base:GenericMedication):GenericMedication{
  const paths=base.paths.map(path=>{
    // DMEMSMD 0015: adult is >=12 and pediatric is <12 unless a medication pathway says otherwise.
    if(path.patient==="adult")return {...path,minAge:12};
    if(path.patient!=="pediatric")return path;

    // DMEMSMD 9070: pediatric agitation has its own narrower age bands.
    if(path.id==="ped-agitation-8-11")return {...path,minAge:8,maxAge:12};
    if(path.id==="ped-agitation-under8")return {...path,maxAge:8};

    // Seizure and cardioversion/TCP sedation are listed for pediatric patients generally.
    return {...path,maxAge:12};
  });
  return {...base,paths};
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
  const ageChecked=id==="midazolam"?midazolamAgeChecked(base):base;
  return displayNames[id]?{...ageChecked,name:displayNames[id]}:ageChecked;
}

export function assertReleasedMedicationDefinitions(){
  const missing=DEFAULT_FIELD_MEDICATION_IDS.filter(id=>!fieldMedicationDefinition(id));
  if(missing.length)throw new Error(`Expanded medication definitions missing: ${missing.join(", ")}`);
  return true;
}

export const releasedFieldMedicationDefinitions=DEFAULT_FIELD_MEDICATION_IDS.map(id=>fieldMedicationDefinition(id)!).filter(Boolean);
