import {fieldMedicationDefinition as baseFieldMedicationDefinition} from "./fieldMedicationDefinitions";
import {DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";
import type {GenericMedication,GenericDosePath,GenericDoseUnit} from "./dmpMedicationData";

const fixed=(amount:number,unit:GenericDoseUnit)=>({kind:"fixed" as const,amount,unit});
const kg=(amount:number,unit:GenericDoseUnit,min?:number,max?:number)=>({kind:"perKg" as const,amount,unit,min,max});
const instruction=(text:string,unit:GenericDoseUnit="treatment")=>({kind:"instruction" as const,text,unit});
const withSpecial=(path:GenericDosePath,note:string):GenericDosePath=>({...path,special:[...(path.special||[]),note]});

function patchDiphenhydramine(base:GenericMedication):GenericMedication{
  const adultFormula={kind:"ageBands" as const,unit:"mg" as const,bands:[
    {min:12,max:65.000001,amount:50,label:"Adult through age 65"},
    {min:65.000001,max:130,amount:25,label:"Adult over age 65"},
  ]};
  return {...base,contraindications:[...base.contraindications,"Patients over 65 years receive the DMP half-dose of 25 mg"],paths:base.paths.map(path=>{
    if(path.patient!=="adult")return path;
    return {...path,patient:"all" as const,minAge:12,maxAge:130,formula:adultFormula,label:`${path.label} — age required`,special:[...(path.special||[]),"DMP 9100: patients over 65 years receive 25 mg rather than 50 mg."]};
  })};
}

function patchFentanyl(base:GenericMedication):GenericMedication{
  const paths:GenericDosePath[]=[];
  for(const raw of base.paths){
    let path={...raw};
    if(path.patient==="pediatric")path={...path,minAge:1,maxAge:12};
    if(path.id==="adult-ivio")path=withSpecial({...path,label:"Moderate to severe pain — adult IV/IO — 2 mcg/kg upper-end option"},"DMP 9230 allows 1–2 mcg/kg. Initial adult dose is typically about 100 mcg; strongly consider the lower-dose option in elderly/frail patients.");
    if(path.id==="adult-im")path=withSpecial({...path,label:"Moderate to severe pain — adult IM — 2 mcg/kg upper-end option"},"DMP 9230 allows 1–2 mcg/kg. Strongly consider the lower-dose option in elderly/frail patients.");
    if(path.id==="adult-in")path=withSpecial({...path,label:"Moderate to severe pain — adult IN — 2 mcg/kg upper-end option"},"DMP 9230 allows 1–2 mcg/kg. Strongly consider the lower-dose option in elderly/frail patients.");
    paths.push(path);
  }
  const byId=(id:string)=>paths.find(path=>path.id===id)!;
  paths.push(
    {...byId("adult-ivio"),id:"adult-ivio-low",label:"Moderate to severe pain — adult IV/IO — 1 mcg/kg lower-dose option",formula:kg(1,"mcg")},
    {...byId("adult-im"),id:"adult-im-low",label:"Moderate to severe pain — adult IM — 1 mcg/kg lower-dose option",formula:kg(1,"mcg")},
    {...byId("adult-in"),id:"adult-in-low",label:"Moderate to severe pain — adult IN — 1 mcg/kg lower-dose option",formula:kg(1,"mcg")},
    {...byId("ped-ivio"),id:"ped-ivio-high",label:"Moderate to severe pain — pediatric 1–12 years IV/IO — 2 mcg/kg option",formula:kg(2,"mcg"),minAge:1,maxAge:12},
    {...byId("ped-im"),id:"ped-im-high",label:"Moderate to severe pain — pediatric 1–12 years IM — 2 mcg/kg option",formula:kg(2,"mcg"),minAge:1,maxAge:12},
    {id:"ped-under1-base",label:"Pediatric under 1 year — BASE CONTACT",agent:"Fentanyl",patient:"pediatric",maxAge:1,route:"IV/IO/IM/IN",formula:instruction("BASE CONTACT REQUIRED — obtain a direct physician order before fentanyl administration."),repeat:"Further dosing per direct physician order.",administration:"Do not calculate or administer a standing fentanyl dose for a patient under 1 year without Base contact.",protocol:"Pain Management",baseContact:"Pediatric patient under 1 year requires Base contact before fentanyl dosing.",special:["DMP 9230: Pediatric <1 year — BASE CONTACT."]},
  );
  return {...base,contraindications:[...base.contraindications,"Pediatric patient under 1 year requires Base contact"],paths};
}

function patchMidazolam(base:GenericMedication):GenericMedication{
  const paths=base.paths.map(path=>withSpecial(path,"DMP 9070: in adults over 65 years or small adults under 50 kg, consider one-half dosing."));
  const existing=(id:string)=>paths.find(path=>path.id===id)!;
  const halfDose=(id:string,label:string):GenericDosePath=>{
    const source=existing(id);
    if(source.formula.kind!=="fixed")return source;
    return {...source,id:`${id}-half`,label,formula:fixed(source.formula.amount/2,source.formula.unit),special:[...(source.special||[]),"Selected DMP one-half dose option for age >65 years or adult weight <50 kg."]};
  };
  paths.push(
    halfDose("adult-seizure-iv","Status epilepticus — adult IV/IO — ½ dose option (>65 years or <50 kg)"),
    halfDose("adult-seizure-inim","Status epilepticus — adult IM/IN — ½ dose option (>65 years or <50 kg)"),
    halfDose("adult-cardiovert","Cardioversion sedation — adult IV/IO — ½ dose option (>65 years or <50 kg)"),
    halfDose("adult-pacing","TCP sedation — adult IV/IO — ½ dose option (>65 years or <50 kg)"),
    halfDose("adult-agitation","Agitated/combative — adult — ½ dose option (>65 years or <50 kg)"),
    halfDose("adult-imminent","Imminent bodily harm — adult IM — ½ dose option (>65 years or <50 kg)"),
    {id:"adult-cardiovert-inim",label:"Sedation for cardioversion — adult IN/IM",agent:"Midazolam",patient:"adult",route:"IN/IM",formula:fixed(5,"mg"),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"IN/IM sedation with continuous ECG, SpO₂ and ventilation monitoring.",protocol:"Synchronized Cardioversion",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2,special:["For age >65 years or adult weight <50 kg, consider 2.5 mg (one-half dose)."]},
    {id:"adult-cardiovert-inim-half",label:"Sedation for cardioversion — adult IN/IM — ½ dose option (>65 years or <50 kg)",agent:"Midazolam",patient:"adult",route:"IN/IM",formula:fixed(2.5,"mg"),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"IN/IM sedation with continuous ECG, SpO₂ and ventilation monitoring.",protocol:"Synchronized Cardioversion",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2},
    {id:"adult-pacing-inim",label:"Sedation for transcutaneous pacing — adult IN/IM",agent:"Midazolam",patient:"adult",route:"IN/IM",formula:fixed(5,"mg"),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"IN/IM sedation with continuous ECG, SpO₂ and ventilation monitoring.",protocol:"Transcutaneous Cardiac Pacing",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2,special:["For age >65 years or adult weight <50 kg, consider 2.5 mg (one-half dose)."]},
    {id:"adult-pacing-inim-half",label:"Sedation for transcutaneous pacing — adult IN/IM — ½ dose option (>65 years or <50 kg)",agent:"Midazolam",patient:"adult",route:"IN/IM",formula:fixed(2.5,"mg"),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"IN/IM sedation with continuous ECG, SpO₂ and ventilation monitoring.",protocol:"Transcutaneous Cardiac Pacing",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2},
    {id:"ped-cardiovert-inim",label:"Sedation for cardioversion — pediatric IN/IM",agent:"Midazolam",patient:"pediatric",route:"IN/IM",formula:kg(.2,"mg",undefined,5),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"Maximum single dose 5 mg IN/IM.",protocol:"Synchronized Cardioversion",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2},
    {id:"ped-cardiovert-iv",label:"Sedation for cardioversion — pediatric IV/IO",agent:"Midazolam",patient:"pediatric",route:"IV/IO",formula:kg(.1,"mg",undefined,2),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"Maximum single dose 2 mg IV/IO.",protocol:"Synchronized Cardioversion",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2},
    {id:"ped-pacing-inim",label:"Sedation for transcutaneous pacing — pediatric IN/IM",agent:"Midazolam",patient:"pediatric",route:"IN/IM",formula:kg(.2,"mg",undefined,5),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"Maximum single dose 5 mg IN/IM.",protocol:"Transcutaneous Cardiac Pacing",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2},
    {id:"ped-pacing-iv",label:"Sedation for transcutaneous pacing — pediatric IV/IO",agent:"Midazolam",patient:"pediatric",route:"IV/IO",formula:kg(.1,"mg",undefined,2),repeat:"May repeat once after 5 minutes; Base contact for more than 2 doses.",administration:"Maximum single dose 2 mg IV/IO.",protocol:"Transcutaneous Cardiac Pacing",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:2},
    {id:"ped-agitation-8-11",label:"Agitated/combative — pediatric 8–11 years",agent:"Midazolam",patient:"pediatric",minAge:8,maxAge:12,route:"IV/IO/IM",formula:{kind:"ageBands",unit:"mg",bands:[{min:8,max:11,amount:2.5,label:"8–10 years"},{min:11,max:12,amount:5,label:"11 years"}]},repeat:"If still IMC-RASS +3/+4 after 5 minutes, switch to an antipsychotic; additional sedation requires Base.",administration:"Use DMP age/LBT table. Continuous cardiac and pulse-oximetry monitoring; waveform capnography recommended.",protocol:"Agitated/Combative Patient",volumeRequired:true},
    {id:"ped-agitation-under8",label:"Agitated/combative — pediatric under 8 years — BASE CONTACT",agent:"Midazolam",patient:"pediatric",maxAge:8,route:"IV/IO/IM",formula:instruction("BASE CONTACT REQUIRED for pediatric agitation under 8 years or LBT below orange."),repeat:"Per direct physician order.",administration:"Do not calculate a standing sedation dose before Base contact.",protocol:"Agitated/Combative Patient",baseContact:"Contact Base for pediatric agitation under age 8 or LBT below orange."},
  );
  return {...base,contraindications:[...base.contraindications,"Adults >65 years or <50 kg: consider one-half dosing"],paths};
}

function patchEpinephrine(base:GenericMedication):GenericMedication{
  const paths=base.paths.map(raw=>{
    if(raw.id==="allergy-ped-small")return {...raw,minAge:4/12,maxAge:12,label:"Moderate/severe allergic reaction — pediatric 4 months to 12 years under 25 kg IM"};
    if(raw.id==="allergy-ped-large")return {...raw,minAge:4/12,maxAge:12,label:"Moderate/severe allergic reaction — pediatric 4 months to 12 years 25 kg or greater IM"};
    if(raw.id==="infusion")return {...raw,formula:instruction("Prepare epinephrine 1 mcg/mL and titrate the IV/IO infusion to hemodynamic effect."),repeat:"Continuous titration to SBP >90 mmHg, improved respiratory status, and improved perfusion/mentation.",administration:"Mix 1 mg epinephrine in 1000 mL Normal Saline to make 1 mcg/mL. Use a macro drip set. Begin IV/IO infusion wide open to gravity in small aliquots; typical total volume is less than 100 mL. Label the bag EPINEPHRINE 1 mcg/mL.",volumeRequired:false,openEndedRepeats:true};
    return raw;
  });
  paths.push(
    {id:"allergy-ped-infant",label:"Moderate/severe allergic reaction — term newborn to under 4 months IM",agent:"Epinephrine",patient:"pediatric",maxAge:4/12,route:"IM",formula:fixed(.1,"mg"),repeat:"May repeat dose twice every 5 minutes.",administration:"IM in the lateral thigh. Use 1 mg/mL formulation; give 0.1 mL.",protocol:"Allergy and Anaphylaxis",volumeRequired:true,repeatAfterMinutes:5,maxAdministrations:3,suggestedConcentration:1,special:["DMP 9120: term to <4 months receives 0.1 mg IM."]},
    {id:"allergy-ped-refractory-iv",label:"Pediatric refractory anaphylaxis after 3 IM doses + 60 mL/kg NS — BASE CONTACT",agent:"Epinephrine",patient:"pediatric",route:"Slow IV",formula:kg(.001,"mg"),repeat:"Repeat 1 mcg/kg aliquots as needed under direct Base direction to maintain minimum systolic BP for age.",administration:"After Base contact: prepare 10 mcg/mL (0.01 mg/mL) by drawing 1 mL of 0.1 mg/mL epinephrine plus 9 mL NS. Give 1 mcg/kg (0.1 mL/kg) slow IV aliquots as directed.",protocol:"Allergy and Anaphylaxis",baseContact:"Requires severe anaphylaxis refractory to 3 total IM epinephrine doses AND 60 mL/kg NS, plus direct Base contact.",volumeRequired:true,suggestedConcentration:.01,concentrationUnit:"mg/mL",requiresWeight:true,special:["Confirm 3 total IM epinephrine doses and 60 mL/kg NS have already been given before this pathway."]},
  );
  return {...base,paths};
}

export function fieldMedicationDefinition(id:string):GenericMedication|null{
  if(id==="haloperidol")return null;
  const base=baseFieldMedicationDefinition(id);
  if(!base)return null;
  if(id==="diphenhydramine")return patchDiphenhydramine(base);
  if(id==="fentanyl")return patchFentanyl(base);
  if(id==="midazolam")return patchMidazolam(base);
  if(id==="epinephrine")return patchEpinephrine(base);
  return base;
}

export function assertReleasedMedicationDefinitions(){
  const missing=DEFAULT_FIELD_MEDICATION_IDS.filter(id=>!fieldMedicationDefinition(id));
  if(missing.length)throw new Error(`Clinical medication definitions missing: ${missing.join(", ")}`);
  return true;
}

export const releasedFieldMedicationDefinitions=DEFAULT_FIELD_MEDICATION_IDS.map(id=>fieldMedicationDefinition(id)!).filter(Boolean);
