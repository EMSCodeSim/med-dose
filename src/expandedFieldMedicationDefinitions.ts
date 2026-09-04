import {fieldMedicationDefinition as clinicalFieldMedicationDefinition} from "./clinicalFieldMedicationDefinitions";
import {genericMedication,type GenericMedication,type GenericDosePath} from "./dmpMedicationData";
import {DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";

const unique=(items:string[])=>Array.from(new Set(items));

function elderlyHalfDosePath(path:GenericDosePath):GenericDosePath{
  if(path.patient!=="adult"||path.formula.kind!=="fixed")return path;
  const normal=path.formula.amount,half=normal/2;
  return {
    ...path,
    minAge:12,
    maxAge:130,
    formula:{kind:"ageBands",unit:path.formula.unit,bands:[
      {min:12,max:65,amount:normal,label:"Adult under 65"},
      {min:65,max:130,amount:half,label:"Adult 65+ — half dose"},
    ]},
    special:[...(path.special||[]),`DMP 9045: elderly patients receive one-half the typical antipsychotic dose (${half} ${path.formula.unit} for this pathway).`],
  };
}

function droperidolDefinition():GenericMedication|null{
  const antipsychotics=genericMedication("antipsychotics");
  const antiemetics=genericMedication("antiemetics");
  const antipsychoticPaths=(antipsychotics?.paths.filter(path=>path.agent.toLowerCase()==="droperidol")||[]).map(elderlyHalfDosePath);
  const antiemeticPaths=antiemetics?.paths.filter(path=>path.agent.toLowerCase()==="droperidol")||[];
  const paths:GenericDosePath[]=[...antipsychoticPaths,...antiemeticPaths];
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

function txaDefinition():GenericMedication{
  return {
    id:"txa",
    name:"Tranexamic Acid (TXA)",
    protocolId:"500:63",
    page:0,
    contraindications:[
      "Patient under 18 years of age",
      "More than 3 hours since injury",
      "Known hypersensitivity to tranexamic acid or a product ingredient",
      "Pregnancy",
    ],
    paths:[{
      id:"adult-trauma-shock",
      label:"Adult traumatic hemorrhagic shock",
      agent:"Tranexamic Acid (TXA)",
      patient:"adult",
      minAge:18,
      route:"IV infusion",
      formula:{kind:"fixed",amount:2,unit:"g"},
      repeat:"Single prehospital dose; no routine repeat dose listed in department protocol 500:63.",
      administration:"Give 2 g IV over 10 minutes. Use the current department-approved TXA preparation/premix and verify the final concentration before administration. The uploaded 500:63 sheet contained an older 1 g dose; the current department dose is 2 g.",
      protocol:"Department TXA 500:63 — Traumatic Hemorrhagic Shock",
      volumeRequired:true,
      suggestedConcentration:.1,
      concentrationUnit:"g/mL",
      monitoring:[
        "Monitor blood pressure and perfusion during infusion.",
        "Reassess for hypotension or other adverse effects during administration.",
        "Transport to a Level I or II Trauma Center unless unable to oxygenate/ventilate per department trauma triage guidance.",
      ],
      special:[
        "Confirm acute trauma occurred less than 3 hours ago.",
        "Confirm suspected hemorrhagic shock due to trauma.",
        "Confirm signs of poor perfusion are present.",
        "Do not administer TXA as a rapid undiluted IV push.",
      ],
    }],
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
  if(id==="txa")return txaDefinition();
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
