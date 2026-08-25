"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import DoseTracker from "./DoseTracker";
import MedicationReport from "./MedicationReport";
import FieldToolbar from "./FieldToolbar";
import ProtocolViewer, { type ProtocolTarget } from "./ProtocolViewer";
import DmpMedicationCalculator from "./DmpMedicationCalculator";
import {genericMedication} from "./dmpMedicationData";
import EncounterReport from "./EncounterReport";
import ReviewLock from "./ReviewLock";
type Drug = "fentanyl" | "midazolam" | "adenosine" | "magnesium" | "epinephrine" | "diphenhydramine" | "methylprednisolone" | "albuterol";
type DoseUnit = "mcg" | "mg" | "g";
type StockVial = {drug:Drug;amount:string;volume:string;unit:DoseUnit;label:string;barcode:string;photo?:string};
type EncounterAdministration = {drug:string;reason:string;route:string;dose:number;unit:string;volume:number;time:number;concentration:string;patient?:string;baseAuthorization?:{physician:string;time:number;reason:string}};
type Route = "IV" | "IV/IO" | "IM" | "IN" | "Nebulized";
type AgeUnit = "years" | "months" | "days";
type AgeClass = "adult" | "pediatric";
type Step =
  "drug" | "scanConfirm" | "reason" | "age" | "route" | "weight" | "safety" | "vial" | "review";
const URL =
  "https://dmemsmd.org/wp-content/uploads/sites/51/2026/07/DMEMSMD-Protocols-July-2026-FINAL-2026-07-20.pdf";
const protocolPages: Record<Drug, number> = { adenosine: 123, albuterol:125, epinephrine: 148, diphenhydramine:144, midazolam: 136, magnesium: 157, methylprednisolone:158, fentanyl: 163 };
const protocolUrl = (drug: Drug) => `${URL}#page=${protocolPages[drug]}`;
const indicationProtocol = (drug: Drug, indication: string) => {
  if (drug === "diphenhydramine") return indication.includes("Dystonic") ? {id:"9100",name:"Diphenhydramine",page:144}:{ id:"4090",name:"Allergy and Anaphylaxis",page:85 };
  if (drug === "methylprednisolone") return indication.includes("Addisonian")?{id:"4120",name:"Adrenal Insufficiency",page:88}:indication.includes("asthma")||indication.includes("COPD")?{id:"2030/2040",name:"Adult/Pediatric Wheezing",page:61}:{ id:"4090",name:"Allergy and Anaphylaxis",page:85 };
  if (drug === "albuterol") return indication.includes("allergic") ? {id:"4090",name:"Allergy and Anaphylaxis",page:85}:indication.includes("Hyperkalemia")||indication.includes("Crush")?{id:"4150",name:"Hyperkalemia",page:91}:{id:"2030/2040",name:"Adult/Pediatric Wheezing",page:61};
  if (drug === "epinephrine") {
    if (indication.includes("Pulseless")) return { id: "3000", name: "Medical Pulseless Arrest", page: 66 };
    if (indication.includes("Bradycardia")) return { id: "3050", name: "Bradyarrhythmia with Poor Perfusion", page: 71 };
    if (indication.includes("Hypotension")) return { id: "4000", name: "Medical Shock", page: 76 };
    if (indication.includes("Stridor")) return { id: "2050", name: "Pediatric Stridor/Croup", page: 63 };
    if (indication.includes("Wheezing")) return { id: "2030/2040", name: "Adult/Pediatric Wheezing", page: 61 };
    return { id: "4090", name: "Allergy and Anaphylaxis", page: 85 };
  }
  if (drug === "magnesium") {
    if (indication === "Refractory severe bronchospasm")
      return { id: "2030/2040", name: "Adult/Pediatric Wheezing", page: 61 };
    if (indication === "Eclampsia")
      return { id: "7010", name: "Obstetrical Complications", page: 106 };
    if (indication === "Torsades — cardiac arrest")
      return { id: "3000", name: "Medical Pulseless Arrest", page: 66 };
    return { id: "3040", name: "Tachyarrhythmia with Poor Perfusion", page: 70 };
  }
  if (drug === "midazolam" && indication === "Status epilepticus")
    return { id: "4040", name: "Seizure", page: 80 };
  if (indication.toLowerCase().includes("cardioversion"))
    return { id: "1090", name: "Synchronized Cardioversion", page: 48 };
  if (indication.toLowerCase().includes("pacing"))
    return { id: "1100", name: "Transcutaneous Cardiac Pacing", page: 49 };
  if (drug === "fentanyl")
    return { id: "1160", name: "Pain Management", page: 56 };
  return { id: "3040", name: "Tachyarrhythmia with Poor Perfusion", page: 70 };
};
const indicationProtocolUrl = (drug: Drug, indication: string) =>
  `${URL}#page=${indicationProtocol(drug, indication).page}`;
const medicationPhoto = (drug: Drug) =>
  drug === "adenosine" ? "/medications/adenosine-vial.webp" : undefined;
type MedicationCatalogItem={id:string;name:string;brand:string;sub:string;protocol:ProtocolTarget;calculator?:Drug};
const meds:MedicationCatalogItem[] = [
  {id:"acetaminophen",name:"Acetaminophen",brand:"Tylenol",sub:"Analgesic / antipyretic",protocol:{id:"9005",name:"Acetaminophen",page:122}},
  {id:"adenosine",name:"Adenosine",brand:"Adenocard",sub:"Antiarrhythmic",protocol:{id:"9010",name:"Adenosine",page:123},calculator:"adenosine"},
  {id:"albuterol",name:"Albuterol",brand:"Proventil / Ventolin",sub:"Bronchodilator",protocol:{id:"9020",name:"Albuterol",page:125},calculator:"albuterol"},
  {id:"amiodarone",name:"Amiodarone",brand:"Cordarone",sub:"Antiarrhythmic",protocol:{id:"9030",name:"Amiodarone",page:127}},
  {id:"antiemetics",name:"Antiemetics",brand:"Ondansetron • Droperidol",sub:"Nausea and vomiting",protocol:{id:"9040",name:"Antiemetics",page:128}},
  {id:"antipsychotics",name:"Antipsychotics",brand:"Droperidol • Haloperidol • Olanzapine",sub:"Agitation / behavioral emergency",protocol:{id:"9045",name:"Antipsychotics",page:129}},
  {id:"aspirin",name:"Aspirin",brand:"ASA",sub:"Antiplatelet",protocol:{id:"9050",name:"Aspirin",page:134}},
  {id:"atropine",name:"Atropine",brand:"Atropine",sub:"Anticholinergic",protocol:{id:"9060",name:"Atropine",page:135}},
  {id:"midazolam",name:"Midazolam",brand:"Versed",sub:"Benzodiazepine • seizure / sedation",protocol:{id:"9070",name:"Benzodiazepines / Midazolam",page:136},calculator:"midazolam"},
  {id:"diazepam",name:"Diazepam",brand:"Valium",sub:"Benzodiazepine • seizure / sedation",protocol:{id:"9070",name:"Benzodiazepines / Diazepam",page:136}},
  {id:"lorazepam",name:"Lorazepam",brand:"Ativan",sub:"Benzodiazepine • seizure / sedation",protocol:{id:"9070",name:"Benzodiazepines / Lorazepam",page:136}},
  {id:"calcium",name:"Calcium",brand:"Calcium chloride / gluconate",sub:"Electrolyte / membrane stabilization",protocol:{id:"9080",name:"Calcium",page:140}},
  {id:"dextrose",name:"Dextrose",brand:"D10 / D25 / D50",sub:"Hypoglycemia",protocol:{id:"9090",name:"Dextrose",page:142}},
  {id:"diltiazem",name:"Diltiazem",brand:"Cardizem",sub:"Calcium-channel blocker",protocol:{id:"9095",name:"Diltiazem",page:143}},
  {id:"diphenhydramine",name:"Diphenhydramine",brand:"Benadryl",sub:"Antihistamine",protocol:{id:"9100",name:"Diphenhydramine",page:144},calculator:"diphenhydramine"},
  {id:"dopamine",name:"Dopamine",brand:"Intropin",sub:"Vasopressor infusion",protocol:{id:"9110",name:"Dopamine",page:145}},
  {id:"duodote",name:"DuoDote",brand:"Atropine / pralidoxime",sub:"Nerve-agent antidote",protocol:{id:"9115",name:"DuoDote",page:146}},
  {id:"epinephrine",name:"Epinephrine",brand:"Adrenalin",sub:"Arrest • anaphylaxis • shock • wheezing",protocol:{id:"9120",name:"Epinephrine",page:148},calculator:"epinephrine"},
  {id:"glucagon",name:"Glucagon",brand:"GlucaGen",sub:"Hypoglycemia / beta-blocker toxicity",protocol:{id:"9130",name:"Glucagon",page:151}},
  {id:"hemostatic-agents",name:"Hemostatic Agents",brand:"Agency-approved product",sub:"Hemorrhage control",protocol:{id:"9150",name:"Hemostatic Agents",page:152}},
  {id:"hydroxocobalamin",name:"Hydroxocobalamin",brand:"Cyanokit",sub:"Cyanide antidote",protocol:{id:"9160",name:"Hydroxocobalamin",page:153}},
  {id:"ipratropium",name:"Ipratropium",brand:"Atrovent",sub:"Bronchodilator",protocol:{id:"9170",name:"Ipratropium",page:155}},
  {id:"lidocaine",name:"Lidocaine 2%",brand:"Xylocaine",sub:"Local anesthetic",protocol:{id:"9180",name:"Lidocaine 2%",page:156}},
  {id:"magnesium",name:"Magnesium Sulfate",brand:"Magnesium Sulfate",sub:"Antiarrhythmic • bronchodilator • eclampsia",protocol:{id:"9190",name:"Magnesium Sulfate",page:157},calculator:"magnesium"},
  {id:"methylprednisolone",name:"Methylprednisolone",brand:"Solu-Medrol",sub:"Corticosteroid",protocol:{id:"9200",name:"Methylprednisolone",page:158},calculator:"methylprednisolone"},
  {id:"naloxone",name:"Naloxone",brand:"Narcan",sub:"Opioid antagonist",protocol:{id:"9210",name:"Naloxone",page:159}},
  {id:"nitroglycerin",name:"Nitroglycerin",brand:"Nitrostat",sub:"Vasodilator",protocol:{id:"9220",name:"Nitroglycerin",page:161}},
  {id:"nsaids",name:"NSAIDs",brand:"Ketorolac / Ibuprofen",sub:"Non-opioid analgesics",protocol:{id:"9225",name:"NSAIDs",page:162}},
  {id:"fentanyl",name:"Fentanyl",brand:"Fentanyl",sub:"Opioid analgesic",protocol:{id:"9230",name:"Opioids / Fentanyl",page:163},calculator:"fentanyl"},
  {id:"morphine",name:"Morphine",brand:"Morphine sulfate",sub:"Opioid analgesic",protocol:{id:"9230",name:"Opioids / Morphine",page:163}},
  {id:"hydromorphone",name:"Hydromorphone",brand:"Dilaudid",sub:"Opioid analgesic",protocol:{id:"9230",name:"Opioids / Hydromorphone",page:163}},
  {id:"oral-glucose",name:"Oral Glucose",brand:"Glucose gel",sub:"Hypoglycemia",protocol:{id:"9240",name:"Oral Glucose",page:165}},
  {id:"oxygen",name:"Oxygen",brand:"Medical oxygen",sub:"Respiratory support",protocol:{id:"9250",name:"Oxygen",page:166}},
  {id:"phenylephrine",name:"Phenylephrine",brand:"Neo-Synephrine",sub:"Vasopressor",protocol:{id:"9260",name:"Phenylephrine",page:167}},
  {id:"racemic-epinephrine",name:"Racemic Epinephrine",brand:"Vaponefrin",sub:"Nebulized upper-airway therapy",protocol:{id:"9270",name:"Racemic Epinephrine",page:168}},
  {id:"sodium-bicarbonate",name:"Sodium Bicarbonate",brand:"Sodium bicarbonate",sub:"Alkalinizing agent",protocol:{id:"9280",name:"Sodium Bicarbonate",page:169}},
  {id:"ophthalmic-anesthetics",name:"Topical Ophthalmic Anesthetics",brand:"Tetracaine / Proparacaine",sub:"Eye pain / irrigation",protocol:{id:"9290",name:"Topical Ophthalmic Anesthetics",page:170}},
];
const VISIBLE_MEDICATIONS_KEY = "metro-med-dose-visible-medications";
function savedVisibleMedications() {
  try {
    const saved = JSON.parse(localStorage.getItem(VISIBLE_MEDICATIONS_KEY) || "null");
    if (Array.isArray(saved)) {
      const valid = saved.filter((id): id is string => typeof id === "string" && meds.some((med) => med.id === id));
      if (valid.length || saved.length === 0) return valid;
    }
  } catch {}
  return meds.map((med) => med.id);
}
const medicationAliases: Record<string, string[]> = {
  adenosine: ["adenocard", "svt", "antiarrhythmic"],
  fentanyl: ["sublimaze", "pain", "opioid"],
  midazolam: ["versed", "seizure", "sedation", "benzodiazepine"],
  diazepam:["valium","seizure","sedation","benzodiazepine"],
  lorazepam:["ativan","seizure","sedation","benzodiazepine"],
  magnesium: ["mag", "mag sulfate", "torsades", "bronchospasm", "asthma", "eclampsia"],
  epinephrine: ["epi", "adrenalin", "anaphylaxis", "allergy", "arrest", "shock", "wheezing", "stridor"],
  albuterol:["proventil","ventolin","neb","wheezing","bronchospasm"],
  diphenhydramine:["benadryl","allergy","antihistamine"],
  methylprednisolone:["solu medrol","solumedrol","steroid","allergy","asthma"],
  antiemetics:["ondansetron","zofran","promethazine","phenergan","metoclopramide","reglan","droperidol","nausea","vomiting"],
  antipsychotics:["droperidol","inapsine","haloperidol","haldol","olanzapine","zyprexa","agitation"],
  calcium:["calcium chloride","calcium gluconate","hyperkalemia","overdose"],
  nsaids:["ibuprofen","motrin","advil","ketorolac","toradol","pain","fever"],
  morphine:["opioid","pain","analgesic"],
  hydromorphone:["dilaudid","opioid","pain","analgesic"],
};
function fuzzyMedicationMatch(med: (typeof meds)[number], query: string) {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!q) return true;
  const words = [med.name, med.brand, med.sub, ...(medicationAliases[med.id] || [])]
    .map(x => x.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return words.some(word => word.includes(q) || q.includes(word) || subsequence(q, word));
}
function subsequence(query: string, value: string) {
  let i = 0;
  for (const char of value) if (char === query[i]) i += 1;
  return i === query.length;
}
const reasons: Record<Drug, string[]> = {
  adenosine: ["Regular narrow-complex AV nodal reentrant tachycardia"],
  fentanyl: ["Moderate to severe pain in a hemodynamically stable patient"],
  midazolam: [
    "Status epilepticus",
    "Sedation for cardioversion",
    "Sedation for transcutaneous pacing",
  ],
  magnesium: [
    "Torsades — stable/intermittent",
    "Torsades — unstable/peri-arrest",
    "Torsades — cardiac arrest",
    "Refractory severe bronchospasm",
    "Eclampsia",
  ],
  epinephrine: [
    "Pulseless arrest",
    "Systemic allergic reaction — IM",
    "Wheezing — IM",
    "Hypotension or refractory anaphylaxis — push dose",
    "Hypotension or refractory anaphylaxis — infusion",
    "Pediatric severe anaphylaxis — Base push dose",
    "Bradycardia with poor perfusion",
    "Stridor at rest — alternative to racemic epinephrine",
    "Systemic allergic reaction — auto-injector",
  ],
  albuterol:["Wheezing associated with allergic reaction","Bronchospasm — single nebulizer dose","Severe bronchospasm — continuous nebulizer dose","Hyperkalemia or crush injury — continuous nebulizer dose"],
  diphenhydramine:["Allergic reaction","Dystonic medication reaction or akathisia"],
  methylprednisolone:["Allergic reaction / anaphylaxis","Severe asthma or COPD","Suspected Addisonian crisis"],
};
function epinephrineReasonsForConcentration(concentrationMgMl: number) {
  const isPointOneMgMl = Math.abs(concentrationMgMl - 0.1) < 0.0001;
  const isOneMgMl = Math.abs(concentrationMgMl - 1) < 0.0001;
  if (isPointOneMgMl) return [
    "Pulseless arrest",
    "Hypotension or refractory anaphylaxis — push dose",
    "Hypotension or refractory anaphylaxis — infusion",
    "Pediatric severe anaphylaxis — Base push dose",
    "Bradycardia with poor perfusion",
  ];
  if (isOneMgMl) return [
    "Systemic allergic reaction — IM",
    "Wheezing — IM",
    "Hypotension or refractory anaphylaxis — infusion",
    "Stridor at rest — alternative to racemic epinephrine",
    "Systemic allergic reaction — auto-injector",
  ];
  return [];
}
const routes: Record<Drug, Route[]> = {
  adenosine: ["IV"],
  fentanyl: ["IV/IO", "IM", "IN"],
  midazolam: ["IV/IO", "IM", "IN"],
  magnesium: ["IV/IO", "IV", "IM"],
  epinephrine: ["IV/IO", "IM", "Nebulized"],
  albuterol:["Nebulized"],
  diphenhydramine:["IV/IO","IM"],
  methylprednisolone:["IV/IO"],
};
function epinephrineAdultOnly(reason: string) {
  return reason.includes("Hypotension") || reason.includes("infusion");
}
function epinephrinePediatricOnly(reason: string) {
  return reason === "Bradycardia with poor perfusion" || reason === "Pediatric severe anaphylaxis — Base push dose";
}
function magnesiumAdultOnly(reason: string) {
  return reason === "Torsades — stable/intermittent" || reason === "Torsades — unstable/peri-arrest";
}
function routesFor(drug: Drug, reason: string) {
  if (drug === "albuterol" || drug === "diphenhydramine" || drug === "methylprednisolone") return routes[drug];
  if (drug === "epinephrine") {
    if (reason.endsWith("— IM") || reason.includes("auto-injector")) return ["IM"] as Route[];
    if (reason.includes("Stridor")) return ["Nebulized"] as Route[];
    return ["IV/IO"] as Route[];
  }
  if (drug !== "magnesium") return routes[drug];
  if (reason === "Eclampsia") return ["IV/IO", "IM"] as Route[];
  if (reason === "Torsades — unstable/peri-arrest" || reason === "Refractory severe bronchospasm") return ["IV"] as Route[];
  return ["IV/IO"] as Route[];
}
function normalizedVialAmount(amount: string, unit: DoseUnit, drug?: Drug) {
  if (amount === "") return "";
  if (drug === "epinephrine") return unit === "mcg" ? String(Number(amount) / 1000) : amount;
  return unit === "g" ? String(Number(amount) * 1000) : amount;
}
const tapeBands = [
  { name: "Grey", kg: 4, color: "#7b8790", text: "#fff" },
  { name: "Pink", kg: 6.5, color: "#f49bbb", text: "#4c1830" },
  { name: "Red", kg: 8.5, color: "#d84040", text: "#fff" },
  { name: "Purple", kg: 10.5, color: "#8b5bb5", text: "#fff" },
  { name: "Yellow", kg: 13, color: "#f2d34f", text: "#3e3500" },
  { name: "White", kg: 16.5, color: "#fff", text: "#263946" },
  { name: "Blue", kg: 21, color: "#3f86d9", text: "#fff" },
  { name: "Orange", kg: 26.5, color: "#ef9338", text: "#3f2500" },
  { name: "Green", kg: 33, color: "#3a9a62", text: "#fff" },
];
function rules(drug: Drug, reason: string, age: number, route: Route | null) {
  const adult = age >= 12;
  if(drug==="albuterol") {
    const continuous=reason.includes("continuous");
    return {weight:false,rates:[continuous?7.5:2.5],unit:"mg",perKg:false,maxSingle:null,repeat:continuous?0:5,repeatText:continuous?"Continuous nebulizer dose uses three 2.5 mg/3 mL containers.":"May repeat twice for a total of 3 single doses.",maxCumulative:null,maxDoses:continuous?1:3,note:continuous?"NEBULIZED: 7.5 mg in 9 mL at 6–8 L/min.":"NEBULIZED: 2.5 mg in 3 mL at 6–8 L/min over 5–15 minutes."};
  }
  if(drug==="diphenhydramine") return adult
    ? {weight:false,rates:[age>65?25:50],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"No routine repeat dose is listed in DMP 9100.",maxCumulative:null,maxDoses:1,note:age>65?"DMP half-dose applied because the patient is over 65.":"Administer IV/IO/IM. For mild reactions, consider PO administration per protocol."}
    : {weight:true,rates:[1],unit:"mg",perKg:true,maxSingle:50,repeat:0,repeatText:"No routine repeat dose is listed in DMP 9100.",maxCumulative:null,maxDoses:1,note:"Administer slow IV/IO/IM; maximum 50 mg."};
  if(drug==="methylprednisolone") return adult
    ? {weight:false,rates:[125],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"No routine repeat dose is listed in DMP 9200.",maxCumulative:null,maxDoses:1,note:"Slow IV/IO bolus over 2 minutes. Reconstitute and use immediately."}
    : {weight:true,rates:[2],unit:"mg",perKg:true,maxSingle:125,repeat:0,repeatText:"No routine repeat dose is listed in DMP 9200.",maxCumulative:null,maxDoses:1,note:"Slow IV/IO bolus over 2 minutes; maximum 125 mg. Do not delay transport."};
  if(drug==="adenosine")return{weight:false,rates:[12],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"One additional 12 mg rapid IV dose; contact medical control for further considerations.",maxCumulative:null,maxDoses:2,note:"Administer rapid IV bolus followed immediately by a normal saline flush. Continuous ECG monitoring required."};
  if (drug === "epinephrine") {
    if (reason === "Pulseless arrest") return adult
      ? {weight:false,rates:[1],unit:"mg",perKg:false,maxSingle:null,repeat:3,repeatText:"Repeat every 3–5 minutes; maximum 3 doses. Additional dose only for recurrent arrest after ROSC or narrow-complex PEA.",maxCumulative:null,maxDoses:3,note:"IV/IO BOLUS. Requires 0.1 mg/mL (1:10,000) solution."}
      : {weight:true,rates:[0.01],unit:"mg",perKg:true,maxSingle:null,repeat:3,repeatText:"Repeat every 3–5 minutes. DMP 9120 does not state a pediatric dose-count maximum.",maxCumulative:null,maxDoses:null,note:"IV/IO BOLUS. Requires 0.1 mg/mL (1:10,000) solution."};
    if (reason === "Bradycardia with poor perfusion") return {weight:true,rates:[0.01],unit:"mg",perKg:true,maxSingle:null,repeat:0,repeatText:"No routine repeat is listed in DMP 9120 for this indication.",maxCumulative:null,maxDoses:1,note:"Pediatric IV/IO dose. Requires 0.1 mg/mL (1:10,000) solution."};
    if (reason === "Pediatric severe anaphylaxis — Base push dose") return {weight:true,rates:[0.001],unit:"mg",perKg:true,maxSingle:null,repeat:0,repeatText:"Give slow IV/IO aliquots as needed under direct Base authorization.",maxCumulative:null,maxDoses:1,note:"BASE CONTACT REQUIRED. Only after 3 total IM Epinephrine doses AND 60 mL/kg NS. Required final dilution: 0.01 mg/mL."};
    if (reason === "Systemic allergic reaction — IM" || reason === "Wheezing — IM") {
      if (adult) return {weight:false,rates:[0.5],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"May repeat once.",maxCumulative:null,maxDoses:2,note:"IM in the lateral thigh. Requires 1 mg/mL (1:1,000) solution."};
      if (age < 4/12) return {weight:false,rates:[0.1],unit:"mg",perKg:false,maxSingle:null,repeat:5,repeatText:"Term to under 4 months: may repeat twice every 5 minutes.",maxCumulative:null,maxDoses:3,note:"Allergic reaction only. IM in the lateral thigh. Requires 1 mg/mL (1:1,000) solution."};
      return {weight:true,rates:[0.15],unit:"mg",perKg:false,maxSingle:null,repeat:5,repeatText:"May repeat twice every 5 minutes.",maxCumulative:null,maxDoses:3,note:"Dose is selected by weight: 0.15 mg under 25 kg; 0.3 mg at 25 kg or more. Requires 1 mg/mL (1:1,000) solution."};
    }
    if (reason === "Systemic allergic reaction — auto-injector") return adult
      ? {weight:false,rates:[0.3],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"No repeat auto-injector dose is listed in DMP 9120.",maxCumulative:null,maxDoses:1,note:"Adult 0.3 mg IM auto-injector."}
      : {weight:false,rates:[0.15],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"No repeat auto-injector dose is listed in DMP 9120.",maxCumulative:null,maxDoses:1,note:"Pediatric 0.15 mg IM auto-injector."};
    if (reason.includes("push dose")) return {weight:false,rates:[0.01,0.02],unit:"mg",perKg:false,maxSingle:null,repeat:1,repeatText:"Give 0.01–0.02 mg aliquots every 1–5 minutes as needed.",maxCumulative:null,maxDoses:10,note:"IV PUSH DOSE. Follow agency-specific mixing guidance; dosing error is common. Required concentration: 0.1 mg/mL (0.01 mg per 0.1 mL)."};
    if (reason.includes("infusion")) return {weight:false,rates:[0.002,0.003,0.004,0.005,0.006,0.007,0.008,0.009],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"Titrate to SBP >90 mmHg, improved respiratory status and improved perfusion/mentation.",maxCumulative:null,maxDoses:1,note:"IV/IO INFUSION — NOT PUSH. Mix 1 mg in 1000 mL NS for 0.001 mg/mL and label the bag."};
    return {weight:false,rates:[5],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"One nebulized dose; pediatric repeat requires Base contact.",maxCumulative:null,maxDoses:1,note:"NEBULIZED — NOT INJECTED. Give 5 mL of 1 mg/mL solution."};
  }
  if (drug === "magnesium") {
    const pediatricWeightDose = reason === "Torsades — cardiac arrest" || reason === "Refractory severe bronchospasm";
    if (!adult && pediatricWeightDose) {
      const bronchospasm = reason === "Refractory severe bronchospasm";
      return {
        weight: true,
        rates: [bronchospasm ? 50 : 25],
        unit: "mg",
        perKg: true,
        maxSingle: 2000,
        repeat: 0,
        repeatText: "No repeat dose is listed in DMP 9190.",
        maxCumulative: null,
        maxDoses: 1,
        note: bronchospasm
          ? "IV DRIP — NOT PUSH. Dilute and administer over 30 minutes. Maximum 2 g."
          : "Administer undiluted by IV/IO push during cardiac arrest. Maximum 2 g.",
      };
    }
    const dose = reason === "Eclampsia" ? (route === "IM" ? 10000 : 6000) : 2000;
    const note = reason === "Eclampsia"
      ? route === "IM"
        ? "Give 5 g in each buttock. Maximum volume per site is 10 mL."
        : "IV/IO DRIP — NOT PUSH. Dilute in 50 mL normal saline and infuse over 15 minutes."
      : reason === "Torsades — stable/intermittent"
        ? "IV/IO DRIP — NOT PUSH. Dilute in 50 mL normal saline and infuse over 15 minutes."
        : reason === "Torsades — unstable/peri-arrest"
          ? "Administer undiluted by IV push over 2 minutes."
          : reason === "Torsades — cardiac arrest"
            ? "Administer undiluted by IV/IO push."
            : adult
              ? "IV DRIP — NOT PUSH. Dilute in 50 mL normal saline and infuse over 15 minutes."
              : "IV DRIP — NOT PUSH. Dilute and infuse over 30 minutes.";
    return {weight:false,rates:[dose],unit:"mg",perKg:false,maxSingle:null,repeat:0,repeatText:"No repeat dose is listed in DMP 9190.",maxCumulative:null,maxDoses:1,note};
  }
  if (drug === "fentanyl") {
    const rate = route === "IN" && !adult ? [2] : [1, 2];
    return {
      weight: true,
      rates: rate,
      unit: "mcg",
      perKg: true,
      maxSingle: null,
      repeat: route === "IN" ? 10 : 5,
      repeatText: `Maximum cumulative ${route === "IN" ? 4 : 3} mcg/kg`,
      maxCumulative: route === "IN" ? 4 : 3,
      maxDoses: null,
      note:
        route === "IN"
          ? "Maximum 1 mL per nostril; IV preferred for repeat dosing."
          : route === "IM"
            ? "IV is preferred for accurate titration; IM is an acceptable alternative."
            : "",
    };
  }
  const seizure = reason === "Status epilepticus",
    inim = route === "IN" || route === "IM";
  if (adult)
    return {
      weight: false,
      rates: [seizure ? (inim ? 10 : 5) : inim ? 5 : 2],
      unit: "mg",
      perKg: false,
      maxSingle: null,
      repeat: 5,
      repeatText: "May repeat once; Base Contact for more than 2 doses.",
      maxCumulative: null,
      maxDoses: 2,
      note:
        route === "IN"
          ? "IN has slower, less predictable onset than IV; IN is preferred over IM when no IV."
          : route === "IM"
            ? "IM has the slowest onset."
            : "",
    };
  return {
    weight: true,
    rates: [inim ? 0.2 : 0.1],
    unit: "mg",
    perKg: true,
    maxSingle: seizure ? (inim ? 10 : 5) : inim ? 5 : 2,
    repeat: 5,
    repeatText: "May repeat once; Base Contact for more than 2 doses.",
    maxCumulative: null,
    maxDoses: 2,
    note:
      route === "IN"
        ? "IN is preferred over IM when IV cannot be safely or rapidly obtained."
        : route === "IM"
          ? "IM has the slowest onset."
          : "",
  };
}
function checksFor(drug: Drug, age: number, reason: string, fentanylOlderFrail = false, midazolamHalfConsideration = false) {
  if(drug==="albuterol") return ["Wheezing or bronchospasm is present","IM Epinephrine has been given first when wheezing is associated with anaphylaxis","Severe tachycardia has been considered as a relative contraindication","Heart rate, respiratory status and SpO₂ will be monitored"];
  if(drug==="diphenhydramine") return [reason.includes("Dystonic")?"Dystonic medication reaction or akathisia is confirmed":"Allergic symptoms remain present",reason.includes("Dystonic")?"Causative antipsychotic/antiemetic and airway status have been reviewed":"Airway, breathing and Epinephrine priorities have already been addressed","Asthma/COPD secretion thickening and narrow-angle glaucoma precautions reviewed",...(age>65?["DMP over-65 half-dose of 25 mg confirmed"]:[])];
  if(drug==="methylprednisolone") return [reason.includes("Addisonian")?"Suspected adrenal insufficiency with cardiovascular collapse is confirmed":"Primary airway, ventilation, Epinephrine and beta-agonist priorities have been completed","Patient is stable enough that administration will not delay transport","Active GI bleeding precaution reviewed","Medication will be reconstituted and used immediately"];
  if (drug === "epinephrine") {
    const indication = reason === "Pulseless arrest" ? "Pulseless arrest is confirmed"
      : reason === "Bradycardia with poor perfusion" ? "Pediatric bradycardia with poor perfusion persists after oxygenation and ventilation"
      : reason === "Pediatric severe anaphylaxis — Base push dose" ? "Three total IM Epinephrine doses AND 60 mL/kg NS in 20 mL/kg increments have been completed"
      : reason.includes("Stridor") ? "Stridor at rest is present and nebulized epinephrine is being used as the racemic-epinephrine alternative"
      : reason.includes("push dose") ? "Hypotension/poor perfusion is refractory to other interventions OR anaphylaxis is refractory to IM epinephrine"
      : reason.includes("infusion") ? "Hypotension/poor perfusion is refractory to other interventions OR anaphylaxis is refractory to IM epinephrine"
      : "The selected systemic allergic reaction or wheezing indication is confirmed";
    return [indication,...(reason === "Systemic allergic reaction — IM" && age < 4/12 ? ["Patient is a term infant; the term-to-under-4-month DMP dose applies"] : []),"The route and formulation on the physical medication have been read aloud","Continuous ECG, blood pressure and pulse oximetry monitoring are in place","Tachydysrhythmia, hypertension and myocardial ischemia risk have been reviewed"];
  }
  if (drug === "magnesium") {
    const indicationCheck = reason === "Eclampsia"
      ? "Pregnancy is at least 20 weeks gestation OR patient is within 6 weeks postpartum with seizure"
      : reason === "Refractory severe bronchospasm"
        ? "Severe bronchospasm remains unresponsive to continuous albuterol, ipratropium and IM epinephrine"
        : "Torsades de Pointes associated with a prolonged QT interval is confirmed";
    return [indicationCheck,"Continuous ECG, blood pressure and respiratory monitoring are in place","Bradycardia, hypotension and respiratory depression reviewed as DMP precautions","Route-specific dilution, administration time and maximum dose have been verified"];
  }
  const base = drug==="adenosine"?["Rhythm is REGULAR and narrow-complex","12-lead ECG obtained and documented when available","Patient has NO heart transplant history","Continuous ECG monitoring is in place","Patient warned about brief, unpleasant chest discomfort"]:
    drug === "fentanyl"
      ? [
          "Patient is hemodynamically stable with NO signs of shock",
          "Patient has NO respiratory depression",
          "No benzodiazepine coadministration OR direct physician verbal order obtained",
        ]
      : ["Patient is NOT hypotensive", "Patient has NO respiratory depression", "No opioid coadministration OR direct physician verbal order obtained"];
  if(drug==="fentanyl"&&fentanylOlderFrail)return[...base,"Elderly/frail starting-dose pathway selected; ½ of the chosen weight-based dose verified"];
  if(drug==="midazolam"&&age>=12)return[...base,...(midazolamHalfConsideration?["DMP 9070 ½-dose consideration applied for patient over 65 or small adult under 50 kg"]:[])];
  return base;
}
function monitoringCautions(drug: Drug, reason = "", route: Route | null = null, adult = true) {
  if(drug==="albuterol") return ["Nebulized medication — monitor respiratory effort, breath sounds, SpO₂ and heart rate","Watch for tachycardia, palpitations, dysrhythmia and angina","For anaphylaxis-associated wheezing, IM Epinephrine is the first-line treatment"];
  if(drug==="diphenhydramine") return ["Monitor mental status, airway and respiratory status","Watch for drowsiness and additive effects with alcohol or other CNS depressants","Patients over 65 receive the DMP half-dose because of confusion, urinary retention, dizziness and fall risk"];
  if(drug==="methylprednisolone") return ["Slow IV/IO bolus over 2 minutes","Reconstitute and use immediately","Delayed effect: do not delay transport or primary airway/ventilation treatment to administer"];
  if (drug === "epinephrine") {
    const administration = reason.includes("infusion") ? "IV/IO INFUSION — NOT PUSH: 1 mg in 1000 mL NS = 0.001 mg/mL; label the bag"
      : reason.includes("push dose") ? "IV PUSH DOSE: use agency-specific mixing guidance; dosing error is common"
      : reason.includes("Stridor") ? "NEBULIZED — NOT INJECTED: 5 mL of 1 mg/mL solution"
      : reason.includes("allergic") || reason.includes("auto-injector") ? "IM into the lateral thigh; verify 1 mg/mL formulation before administration"
      : "Verify the 0.1 mg/mL IV/IO formulation before administration";
    return [administration,"Continuously monitor ECG, blood pressure, pulse oximetry and perfusion","Watch for tachydysrhythmia, hypertension, anxiety and cardiac ischemia","Do not add epinephrine to sodium bicarbonate or other alkaline solutions"];
  }
  if(drug==="adenosine")return["Continuous ECG monitoring throughout administration","Rapid IV bolus followed immediately by normal saline flush","Asthma: bronchospasm may occur; transient asystole or AV block is common"];
  if(drug==="fentanyl")return["Continuous pulse oximetry for every administration","Titrate slowly; watch for sudden respiratory depression, hypotension and chest-wall rigidity","Keep resuscitation equipment and naloxone immediately available; add cardiac monitoring and capnography for complex or repeated dosing"];
  if(drug==="magnesium") {
    const administration = reason === "Eclampsia"
      ? route === "IM" ? "Give 5 g in each buttock; maximum 10 mL per site" : "IV/IO DRIP — NOT PUSH: dilute in 50 mL NS and infuse over 15 minutes"
      : reason === "Torsades — stable/intermittent" ? "IV/IO DRIP — NOT PUSH: dilute in 50 mL NS and infuse over 15 minutes"
      : reason === "Torsades — unstable/peri-arrest" ? "Give undiluted IV push over 2 minutes"
      : reason === "Torsades — cardiac arrest" ? "Give undiluted IV/IO push"
      : `IV DRIP — NOT PUSH: dilute and infuse over ${adult?15:30} minutes`;
    return [administration,"Continuously monitor ECG, blood pressure and respiratory status","Watch for bradycardia, hypotension and respiratory depression"];
  }
  return["Cardiac and pulse oximetry monitoring during transport","Watch for respiratory depression and hypotension; waveform capnography is recommended","Opioids, alcohol and other CNS depressants increase the sedative effect"];
}
function suggestedWeight(ageYears: number) {
  if (ageYears < 0.5 || ageYears >= 12) return null;
  if (ageYears < 1) return 6.5;
  if (ageYears < 2) return 10;
  if (ageYears < 4) return 14;
  if (ageYears < 6) return 19;
  if (ageYears < 9) return 25;
  if (ageYears < 11) return 31;
  return 38;
}
function ClinicalApp() {
  const [step, setStep] = useState<Step>("drug"),
    [drug, setDrug] = useState<Drug | null>(null),
    [search, setSearch] = useState(""),
    [reason, setReason] = useState(""),
    [ageClass, setAgeClass] = useState<AgeClass | "">(""),
    [fentanylOlderFrail, setFentanylOlderFrail] = useState(false),
    [midazolamSmallAdult, setMidazolamSmallAdult] = useState<boolean | null>(null),
    [diphenhydramineOlder, setDiphenhydramineOlder] = useState<boolean | null>(null),
    [age, setAge] = useState(""),
    [au, setAu] = useState<AgeUnit | "">(""),
    [route, setRoute] = useState<Route | null>(null),
    [weight, setWeight] = useState(""),
    [wu, setWu] = useState("kg"),
    [ws, setWs] = useState("actual"),
    [tapeColor, setTapeColor] = useState(""),
    [rate, setRate] = useState<number | null>(null),
    [customRate, setCustomRate] = useState(""),
    [amt, setAmt] = useState(""),
    [ml, setMl] = useState(""),
    [checks, setChecks] = useState<boolean[]>([]),
    [online, setOnline] = useState(true),
    [install, setInstall] = useState(false),
    [dosesGiven, setDosesGiven] = useState<
      { dose: number; volume: number; time: number }[]
    >([]),
    [encounterAdministrations, setEncounterAdministrations] = useState<EncounterAdministration[]>([]),
    [now, setNow] = useState(Date.now()),
    [scannedVial, setScannedVial] = useState<StockVial | null>(null),
    [scanMedOk, setScanMedOk] = useState(false),
    [scanConcOk, setScanConcOk] = useState(false),
    [baseContactOpen, setBaseContactOpen] = useState(false),
    [basePhysician, setBasePhysician] = useState(""),
    [baseAttested, setBaseAttested] = useState(false),
    [baseApproval, setBaseApproval] = useState<{physician:string;time:number;reason:string}|null>(null),
    [catalogProtocol, setCatalogProtocol] = useState<ProtocolTarget|null>(null),
    [genericMedId, setGenericMedId] = useState<string|null>(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [visibleMedicationIds, setVisibleMedicationIds] = useState<string[]>(savedVisibleMedications),
    [encounterReportOpen, setEncounterReportOpen] = useState(false),
    [reportSignal, setReportSignal] = useState(0);
  useEffect(() => {
    try { localStorage.setItem(VISIBLE_MEDICATIONS_KEY, JSON.stringify(visibleMedicationIds)); } catch {}
  }, [visibleMedicationIds]);
  useEffect(() => {
    setOnline(navigator.onLine);
    setWu(localStorage.getItem("preferredWeightUnit") || "kg");
    const a = () => setOnline(true),
      b = () => setOnline(false);
    addEventListener("online", a);
    addEventListener("offline", b);
    return () => {
      removeEventListener("online", a);
      removeEventListener("offline", b);
    };
  }, []);
  const av = Number(age),
    an = au === "years" ? av : au === "months" ? av / 12 : au === "days" ? av / 365.25 : 0,
    adult = an >= 12,
    midazolamHalfConsideration = drug==="midazolam"&&adult&&(an>65||midazolamSmallAdult===true),
    midazolamSizeAnswered = drug!=="midazolam"||ageClass!=="adult"||an>65||midazolamSmallAdult!==null,
    diphenhydramineAgeAnswered = drug!=="diphenhydramine"||ageClass!=="adult"||diphenhydramineOlder!==null,
    tapeEligible = !adult && an < 10,
    underOne = age !== "" && an < 1,
    epiWheezingTooYoung = drug === "epinephrine" && reason === "Wheezing — IM" && age !== "" && an < 1,
    ageText = drug==="adenosine"&&ageClass==="adult"?"12 years or older":drug==="fentanyl"&&fentanylOlderFrail?"Adult • elderly/frail":ageClass==="adult"?(drug==="midazolam"?(an>65?"over 65 years":"12–65 years"):drug==="diphenhydramine"?(diphenhydramineOlder?"over 65 years":"12–65 years"):"Adult 12+"):au ? `${age} ${au}` : age,
    weightSuggestion = suggestedWeight(an),
    r = drug && reason && route ? rules(drug, reason, an, route) : null,
    epiVariableDose = drug === "epinephrine" && !!r && r.rates.length > 1,
    epiDoseMinimum = epiVariableDose ? Math.min(...r.rates) : 0,
    epiDoseMaximum = epiVariableDose ? Math.max(...r.rates) : 0,
    epiEnteredDoseValid = !epiVariableDose || (rate !== null && rate >= epiDoseMinimum && rate <= epiDoseMaximum),
    needWeight = !!r?.weight,
    kg = wu === "lb" ? Number(weight) / 2.20462 : Number(weight),
    items = drug ? checksFor(drug, an, reason, fentanylOlderFrail, midazolamHalfConsideration) : [],
    safetyComplete = items.length > 0 && items.every((_, index) => checks[index] === true),
    safetyCompletedCount = items.reduce((count, _, index) => count + (checks[index] === true ? 1 : 0), 0),
    baseRequirement = drug==="fentanyl"&&underOne?"Fentanyl administration for a pediatric patient under 1 year":drug==="midazolam"&&reason==="Sedation for transcutaneous pacing"&&!adult?"Transcutaneous pacing for a patient under 12 years":drug==="epinephrine"&&reason==="Pediatric severe anaphylaxis — Base push dose"?"Pediatric severe anaphylaxis refractory to 3 IM Epinephrine doses and 60 mL/kg NS":null,
    baseClear = !baseRequirement||(baseApproval?.reason===baseRequirement),
    ageBlocked = !!au&&(((drug === "fentanyl" && underOne)&&!baseClear)||(drug==="adenosine"&&age!==""&&!adult)||epiWheezingTooYoung),
    ageWithinRange =
      au === "years"
        ? av >= 0 && av < 130
        : au === "months"
          ? av >= 0 && av < 144
          : au === "days" && av >= 0 && av < 366,
    ageOk = age !== "" && !!au && ageWithinRange && !ageBlocked,
    weightOk = !needWeight || (kg > 0 && kg < 350),
    epiWeightBandDose = drug === "epinephrine" && (reason === "Systemic allergic reaction — IM" || reason === "Wheezing — IM") && !adult && an >= 4/12,
    baseDose = r && rate !== null && epiEnteredDoseValid ? (epiWeightBandDose ? (kg < 25 ? 0.15 : 0.3) : r.perKg ? kg * rate : rate) : 0,
    doseModifier = (drug==="fentanyl"&&fentanylOlderFrail)||midazolamHalfConsideration ? .5 : 1,
    adjustedBaseDose = baseDose*doseModifier,
    dose = r?.maxSingle ? Math.min(adjustedBaseDose, r.maxSingle) : adjustedBaseDose,
    vialAmountForCalculation = drug === "epinephrine" && scannedVial ? Number(normalizedVialAmount(scannedVial.amount, scannedVial.unit, drug)) : Number(amt),
    vialVolumeForCalculation = drug === "epinephrine" && scannedVial ? Number(scannedVial.volume) : Number(ml),
    conc = vialAmountForCalculation > 0 && vialVolumeForCalculation > 0 ? vialAmountForCalculation / vialVolumeForCalculation : 0,
    availableReasons = drug === "epinephrine" ? epinephrineReasonsForConcentration(conc) : drug ? reasons[drug] : [],
    epiConcentrationName = drug !== "epinephrine" || conc <= 0 ? "" : Math.abs(conc-0.1)<0.0001 ? "0.1 mg/mL (1:10,000)" : Math.abs(conc-1)<0.0001 ? "1 mg/mL (1:1,000)" : `${fmt(conc)} mg/mL — nonstandard for DMP pathways`,
    epiInfusion = drug === "epinephrine" && reason.includes("infusion"),
    epiPediatricDilution = drug === "epinephrine" && reason === "Pediatric severe anaphylaxis — Base push dose",
    administrationConcentration = epiInfusion ? 0.001 : epiPediatricDilution ? 0.01 : conc,
    vol = administrationConcentration ? dose / administrationConcentration : 0,
    isIntranasal = route === "IN",
    inVolumeOverTarget = isIntranasal && vol > 2,
    inTooHigh = drug === "fentanyl" && inVolumeOverTarget,
    unit = drug === "fentanyl" ? "mcg" : "mg",
    doseText = drug ? `${formatDose(drug,dose,unit)}${epiInfusion?"/min":""}` : `${fmt(dose)} ${unit}`,
    magImTooHigh = drug === "magnesium" && reason === "Eclampsia" && route === "IM" && vol > 20,
    magInfusion = drug === "magnesium" && !!route && route !== "IM" && (reason === "Torsades — stable/intermittent" || reason === "Refractory severe bronchospasm" || reason === "Eclampsia"),
    magPush = drug === "magnesium" && (reason === "Torsades — unstable/peri-arrest" || reason === "Torsades — cardiac arrest"),
    epiExpectedConcentration = drug !== "epinephrine" ? null : reason.includes("infusion") ? null : reason.includes("push dose") || reason === "Pulseless arrest" || reason === "Bradycardia with poor perfusion" ? 0.1 : 1,
    epiConcentrationMismatch = epiExpectedConcentration !== null && conc > 0 && Math.abs(conc - epiExpectedConcentration) > 0.0001,
    volumeBlocked = inTooHigh || magImTooHigh || epiConcentrationMismatch,
    magInfusionMinutes = magInfusion ? (reason === "Refractory severe bronchospasm" && !adult ? 30 : 15) : 0,
    administrationRoute = magInfusion ? `${route} DRIP` : magPush ? `${route} PUSH` : epiInfusion ? `${route} INFUSION` : drug === "epinephrine" && reason.includes("push dose") ? `${route} PUSH DOSE` : route,
    maxTotal = r?.maxCumulative
      ? r.maxCumulative * kg
      : r?.maxDoses
        ? r.maxDoses * dose
        : dose,
    epiOpenEndedRepeats = drug === "epinephrine" && reason === "Pulseless arrest" && !adult,
    totalGiven = dosesGiven.reduce((s, x) => s + x.dose, 0),
    totalVolume = dosesGiven.reduce((s, x) => s + x.volume, 0),
    remaining = Math.max(0, maxTotal - totalGiven),
    nextRepeat = epiOpenEndedRepeats ? dose : Math.min(dose, remaining),
    repeatsLeft = epiOpenEndedRepeats ? 1 : r?.maxDoses
      ? Math.max(0, r.maxDoses - dosesGiven.length)
      : dose > 0
        ? Math.ceil((remaining - 0.000001) / dose)
        : 0,
    lastTime = dosesGiven.at(-1)?.time || 0,
    secondsLeft = Math.max(
      0,
      Math.ceil((lastTime + (r?.repeat || 0) * 60000 - now) / 1000),
    );
  useEffect(() => setChecks(Array(items.length).fill(false)), [drug, reason, an > 65, fentanylOlderFrail, midazolamHalfConsideration]);
  useEffect(() => {
    if (drug === "epinephrine" && reason && !availableReasons.includes(reason)) {
      setReason("");
      setAgeClass("");
      setAge("");
      setAu("");
      setRoute(null);
      setWeight("");
    }
  }, [drug, conc, reason]);
  useEffect(() => {
    setRate(r?.rates.length === 1 ? r.rates[0] : null);
    setCustomRate("");
  }, [drug, reason, route, adult, an>65]);
  useEffect(() => setDosesGiven([]), [drug, reason, route, dose, conc]);
  useEffect(()=>{setBaseApproval(null);setBasePhysician("");setBaseAttested(false);setBaseContactOpen(false)},[drug,reason,ageClass,underOne]);
  useEffect(() => {
    if (!dosesGiven.length || !repeatsLeft) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dosesGiven.length, repeatsLeft]);
  const capped = !!r?.maxSingle && baseDose > r.maxSingle,
    visible: Step[] = [
      "drug",
      ...(scannedVial ? (["scanConfirm"] as Step[]) : []),
      "age",
      "safety",
      "review",
    ],
    pos = visible.indexOf(step),
    valid = useMemo(
      () => ({
        drug: !!drug,
        scanConfirm: scanMedOk && scanConcOk,
        reason: !!reason,
        age: ageOk,
        route: !!route,
        weight: weightOk,
        safety: safetyComplete,
        vial: rate !== null && epiEnteredDoseValid && conc > 0 && !volumeBlocked,
        review: true,
      }),
      [
        drug,
        reason,
        ageOk,
        route,
        weightOk,
        checks,
        items.length,
        rate,
        conc,
        volumeBlocked,
      ],
    );
  const next = () => {
      if (valid[step]) setStep(visible[Math.min(pos + 1, visible.length - 1)]);
    },
    back = () => setStep(visible[Math.max(pos - 1, 0)]),
    reset = () => {
      setStep("drug");
      setDrug(null);
      setSearch("");
      setReason("");
      setAgeClass("");
      setFentanylOlderFrail(false);
      setMidazolamSmallAdult(null);
      setDiphenhydramineOlder(null);
      setAge("");
      setAu("");
      setRoute(null);
      setWeight("");
      setWs("actual");
      setTapeColor("");
      setRate(null);
      setCustomRate("");
      setAmt("");
      setMl("");
      setDosesGiven([]);
      setEncounterAdministrations([]);
      setEncounterReportOpen(false);
      setGenericMedId(null);
      setScannedVial(null);
      setScanMedOk(false);
      setScanConcOk(false);
      setBaseApproval(null);
      setBasePhysician("");
      setBaseAttested(false);
      setBaseContactOpen(false);
    },
    setUnit = (x: string) => {
      setWu(x);
      setWeight("");
      setTapeColor("");
      localStorage.setItem("preferredWeightUnit", x);
    },
    useSuggestedWeight = () => {
      if (weightSuggestion !== null) {
        setWs("age");
        setWu("kg");
        setTapeColor("");
        setWeight(String(weightSuggestion));
      }
    },
    selectTapeBand = (name: string, bandKg: number) => {
      setWs("tape");
      setWu("kg");
      setTapeColor(name);
      setWeight(String(bandKg));
    },
    recordDose = (amount: number) => {
      const time = Date.now();
      const volume = amount / administrationConcentration;
      setNow(time);
      setDosesGiven((x) => [
        ...x,
        { dose: amount, volume, time },
      ]);
      if (drug) setEncounterAdministrations((entries) => [...entries, {
        drug: medName(drug), reason, route: administrationRoute || "",
        dose: amount, unit, volume, time,
        concentration: `${fmt(administrationConcentration)} ${unit}/mL`,
        patient: `${adult?"Adult":"Pediatric"} • ${ageText}${needWeight?` • ${fmt(kg)} kg`:""}`,
        baseAuthorization: baseApproval||undefined,
      }]);
    },
    beginMedication = (selectedDrug: Drug, preservePatient = false) => {
      setDrug(selectedDrug);
      setFentanylOlderFrail(false);
      setMidazolamSmallAdult(null);
      setDiphenhydramineOlder(null);
      if (!preservePatient) {
        setAgeClass(selectedDrug==="adenosine"?"adult":"");
        setAge(selectedDrug==="adenosine"?"12":"");
        setAu(selectedDrug==="adenosine"?"years":"");
        setWeight("");
        setWs("actual");
        setTapeColor("");
        setEncounterAdministrations([]);
      }
      setReason(reasons[selectedDrug].length===1?reasons[selectedDrug][0]:"");
      setRoute(null);
      setChecks([]);
      setCustomRate("");
      setAmt("");
      setMl("");
      setDosesGiven([]);
      setScanMedOk(false);
      setScanConcOk(false);
      setBaseApproval(null);
      setBasePhysician("");
      setBaseAttested(false);
      setBaseContactOpen(false);
      const selected=meds.find(x=>x.id===selectedDrug);
      setScannedVial({drug:selectedDrug,amount:"",volume:"",unit:selectedDrug==="fentanyl"?"mcg":selectedDrug==="magnesium"?"g":"mg",label:selected?.brand||selectedDrug,barcode:"",photo:medicationPhoto(selectedDrug)});
      setStep("scanConfirm");
    };
  return (
    <main className="wizard-app">
      <header>
        <div className="brand">
          <b>M</b>
          <span>
            <strong>Metro Med Dose</strong>
            <small>DMP medication cross-check</small>
          </span>
        </div>
        <div className="header-actions">
          <span className={`connection ${online ? "online" : "offline"}`}>
            {online ? "Online" : "Offline ready"}
          </span>
          <button onClick={() => setSettingsOpen(true)} aria-label="Open drug list settings">Settings</button>
          <button onClick={() => setInstall(true)}>Install</button>
        </div>
      </header>
      <section className="wizard-shell">
        {drug && step !== "drug" && (
          <nav className="patient-strip" aria-label="Current medication calculation">
            <button onClick={() => setStep("scanConfirm")} aria-label="Edit medication and concentration">
              <small>MED</small><b>{medName(drug)}</b>
              {conc > 0 && <span>{fmt(conc)} {unit}/mL</span>}
            </button>
            {reason && <button onClick={() => setStep("age")} aria-label="Edit indication">
              <small>USE</small><b>{reason}</b>
            </button>}
            {ageClass && <button onClick={() => setStep("age")} aria-label="Edit patient age">
              <small>PATIENT</small><b>{ageOk ? `${adult ? "Adult" : "Pediatric"} • ${ageText}` : ageClass === "adult" ? "Adult" : "Pediatric"}</b>
              {needWeight && weightOk && <span>{fmt(kg)} kg</span>}
            </button>}
            {route && <button onClick={() => setStep("age")} aria-label="Edit route">
              <small>ROUTE</small><b>{administrationRoute}</b>
            </button>}
          </nav>
        )}
        <div className="wizard-top">
          <button className="back" onClick={back} disabled={step === "drug"}>
            ‹ Back
          </button>
          <span>
            Step {pos + 1} of {visible.length}
          </span>
          <button className="start-over" onClick={reset}>
            Start over
          </button>
        </div>
        <div className="progress">
          <i style={{ width: `${((pos + 1) / visible.length) * 100}%` }} />
        </div>
        <div className="clinical-banner">
          <b>DMP verified</b>
          <span>
            July 2026 • Approved July 1, 2026 • Next review January 2027
          </span>
        </div>
        {step === "drug" && (
          <Screen
            e="START"
            t="Which medication was requested?"
            h="Search every current Denver Metro medication monograph. Each medication opens a pathway-specific dose or administration calculator with a direct link to its source protocol."
          >
            <div className="catalog-controls">
              <div className="catalog-status"><span><b>{visibleMedicationIds.length}</b> of {meds.length} medications shown</span></div>
              <button className="drug-settings-button" onClick={() => setSettingsOpen(true)}><span aria-hidden="true">⚙</span> Drug list settings</button>
            </div>
            <label className="drug-search">
              <span>Search generic or brand name</span>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Fentanyl, Versed…"
              />
            </label>
            <div className="choice-grid medication-order">
              {meds
                .filter((m) => visibleMedicationIds.includes(m.id))
                .filter((m) => fuzzyMedicationMatch(m, search))
                .map((m) => {
                  return (
                    <button
                      key={m.id}
                      className="choice calculator-med"
                      onClick={() => m.calculator ? beginMedication(m.calculator) : setGenericMedId(m.id)}
                    >
                      <span className="rx">{meds.findIndex(x=>x.id===m.id)+1}</span>
                      <span>
                        <b>{m.name}</b>
                        <small>
                          {m.brand} • {m.sub}
                        </small>
                      </span>
                      <><em>Dose calculator</em><i>›</i></>
                    </button>
                  );
                })}
            </div>
            {visibleMedicationIds.length === 0 && <div className="empty-medication-list"><b>No medications are currently shown.</b><span>Open Drug list settings to choose which medications appear on this screen.</span><button onClick={() => setSettingsOpen(true)}>Choose medications</button></div>}
          </Screen>
        )}
        {step === "scanConfirm" && scannedVial && (
          <Screen e="MEDICATION CHECK" t="Confirm the medication in your hand" h="Compare the physical vial with the selected medication.">
            <div className="scan-confirm-card">
              <div className="scan-med-photo">{scannedVial.photo ? <img src={scannedVial.photo} alt={`${scannedVial.label} reference vial`}/> : <div className="reference-vial"><small>{medName(scannedVial.drug).toUpperCase()}</small><b>VIAL</b><span>Reference photo not saved</span></div>}</div>
              <div className="scan-med-identity"><small>{scannedVial.barcode?"BARCODE MATCH":"MANUAL SELECTION"}</small><h2>{medName(scannedVial.drug)}</h2><p>{scannedVial.label}</p>{Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0?<><strong>{scannedVial.amount} {scannedVial.unit} in {scannedVial.volume} mL</strong><b>{fmt(Number(scannedVial.amount)/Number(scannedVial.volume))} {scannedVial.unit}/mL</b></>:<span className="manual-vial-note">Enter the concentration from the physical vial below.</span>}</div>
            </div>
            {!scannedVial.barcode&&<>
              <h3 className="label-heading">Enter exactly what the physical vial says</h3>
              <div className="vial-entry">
                <label><span>Total drug</span><div>
                  <input inputMode="decimal" value={scannedVial.amount} onChange={e=>{const value=e.target.value;setScannedVial({...scannedVial,amount:value});setAmt(normalizedVialAmount(value,scannedVial.unit,scannedVial.drug));setScanConcOk(false)}} placeholder="0"/>
                  {scannedVial.drug==="magnesium"?<select aria-label="Magnesium vial amount unit" value={scannedVial.unit} onChange={e=>{const unit=e.target.value as DoseUnit;setScannedVial({...scannedVial,unit});setAmt(normalizedVialAmount(scannedVial.amount,unit,scannedVial.drug));setScanConcOk(false)}}><option value="g">g</option><option value="mg">mg</option></select>:<b>{scannedVial.unit}</b>}
                </div></label>
                <label><span>Total volume</span><div><input inputMode="decimal" value={scannedVial.volume} onChange={e=>{const value=e.target.value;setScannedVial({...scannedVial,volume:value});setMl(value);setScanConcOk(false)}} placeholder="0"/><b>mL</b></div></label>
              </div>
              {Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0&&<div className="manual-concentration-result"><span>Calculated concentration — confirm only after both label values are complete</span><b>{fmt(Number(scannedVial.amount)/Number(scannedVial.volume))} {scannedVial.unit}/mL</b></div>}
            </>}
            {scannedVial.drug==="magnesium"&&scannedVial.unit==="g"&&Number(scannedVial.amount)>0&&<div className="input-guidance"><b>Calculation conversion</b><span>{scannedVial.amount} g = {fmt(Number(scannedVial.amount)*1000)} mg. The dose calculation uses milligrams internally.</span></div>}
            {scannedVial.drug==="epinephrine"&&Number(scannedVial.amount)>0&&<div className="input-guidance"><b>Epinephrine units locked</b><span>All Epinephrine concentrations and doses remain in milligrams throughout this calculation.</span></div>}
            <div className="scan-confirm-checks compact-confirmations">
              <label className={scanMedOk?"checked":""}><input type="checkbox" checked={scanMedOk} onChange={e=>setScanMedOk(e.target.checked)}/><span><b>Medication matches</b>{medName(scannedVial.drug)}</span></label>
              <label className={scanConcOk?"checked":""}><input type="checkbox" disabled={!(Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0)} checked={scanConcOk} onChange={e=>setScanConcOk(e.target.checked)}/><span><b>Concentration matches</b>{Number(scannedVial.amount)>0&&Number(scannedVial.volume)>0?`${scannedVial.amount} ${scannedVial.unit} / ${scannedVial.volume} mL`:"Enter label values"}</span></label>
            </div>
            <Next ok={scanMedOk&&scanConcOk} go={()=>setStep("age")} text="Continue to patient information"/>
          </Screen>
        )}
        {step === "reason" && drug && (
          <Screen
            e="INDICATION"
            t={`Why is ${medName(drug)} being given?`}
            h="Only indications mapped from the medication protocol are shown."
          >
            <div className="stack">
              {reasons[drug].map((x) => (
                <button
                  className="big-choice"
                  key={x}
                  onClick={() => {
                    setReason(x);
                    setTimeout(() => setStep("age"), 60);
                  }}
                >
                  <span>{x}</span>
                  <i>›</i>
                </button>
              ))}
            </div>
            <div className="indication-source"><span><small>SOURCE</small><b>Current Denver Metro medication protocol</b></span><a href={protocolUrl(drug)} target="_blank" rel="noreferrer">Open medication {protocolId(drug)} ↗</a></div>
          </Screen>
        )}
        {step === "age" && drug && (
          <Screen
            e="PATIENT"
            t="Patient and route"
            h="Complete only the questions needed for this medication pathway."
          >
            {drug==="epinephrine"&&<div className="confirmed-source"><small>CONFIRMED EPINEPHRINE FORMULATION</small><strong>{epiConcentrationName}</strong><span>Only DMP uses compatible with this concentration are shown below.</span></div>}
            {availableReasons.length>1?<div className="adaptive-section"><small>INDICATION</small><div className="compact-choice-grid">{availableReasons.map((x)=><button key={x} className={reason===x?"selected":""} onClick={()=>{setReason(x);setRoute(null);setWeight("");if((drug==="magnesium"&&magnesiumAdultOnly(x))||(drug==="epinephrine"&&(epinephrineAdultOnly(x)||epinephrinePediatricOnly(x)))){setAgeClass("");setAge("");setAu("")}}}>{x}</button>)}</div>{reason&&<a className="inline-protocol" href={indicationProtocolUrl(drug,reason)} target="_blank" rel="noreferrer">Open DMP {indicationProtocol(drug,reason).id} {indicationProtocol(drug,reason).name} ↗</a>}</div>:availableReasons.length===1?<div className="selected-path"><small>INDICATION</small><b>{availableReasons[0]}</b><a href={indicationProtocolUrl(drug,availableReasons[0])} target="_blank" rel="noreferrer">DMP {indicationProtocol(drug,availableReasons[0]).id} ↗</a></div>:<HardStop title="NO MATCHING EPINEPHRINE PATHWAY" reason={`The confirmed concentration (${epiConcentrationName||"not entered"}) does not match a supported DMP 9120 Epinephrine formulation.`} source="DMP 9120 Epinephrine" action="Return to the medication check and enter the total drug and total volume exactly as printed on the physical medication." recoveryLabel="Correct concentration" onRecover={()=>setStep("scanConfirm")}/>} 
            {availableReasons.length>0&&<><div className="adaptive-heading">AGE GROUP</div>
            {!ageClass ? <div className={`age-class-grid ${(drug==="fentanyl"||drug==="midazolam")?"three-age-options":""}`}>
              {!epinephrinePediatricOnly(reason)&&((drug==="adenosine"||(drug==="magnesium"&&magnesiumAdultOnly(reason))||(drug==="epinephrine"&&epinephrineAdultOnly(reason)))?<button onClick={()=>{setAgeClass("adult");setAge("12");setAu("years");setRoute(null);setWeight("")}}><small>12 YEARS OR OLDER</small><b>Adult</b><span>›</span></button>:<><button onClick={()=>{setAgeClass("adult");setFentanylOlderFrail(false);setMidazolamSmallAdult(null);setAge("12");setAu("years");setRoute(null);setWeight("")}}><small>{drug==="midazolam"?"12–65 YEARS":drug==="fentanyl"?"NOT IDENTIFIED AS ELDERLY/FRAIL":"12 YEARS OR OLDER"}</small><b>Adult</b><span>›</span></button>{(drug==="fentanyl"||drug==="midazolam")&&<button onClick={()=>{setAgeClass("adult");setFentanylOlderFrail(drug==="fentanyl");setMidazolamSmallAdult(false);setAge(drug==="midazolam"?"66":"65");setAu("years");setRoute(null);setWeight("")}}><small>{drug==="midazolam"?"OVER 65 YEARS":"FENTANYL-SPECIFIC CONSIDERATION"}</small><b>{drug==="midazolam"?"Adult >65":"Elderly or frail"}</b><span>›</span></button>}</>)}
              {drug!=="adenosine"&&!(drug==="magnesium"&&magnesiumAdultOnly(reason))&&!(drug==="epinephrine"&&epinephrineAdultOnly(reason))&&<button onClick={()=>{setAgeClass("pediatric");setFentanylOlderFrail(false);setMidazolamSmallAdult(null);setAge("");setAu("");setRoute(null);setWeight("")}}><small>UNDER 12 YEARS</small><b>Pediatric</b><span>›</span></button>}
            </div>:<>
              {drug!=="adenosine"&&<button className="change-age-class" onClick={()=>{setAgeClass("");setFentanylOlderFrail(false);setMidazolamSmallAdult(null);setAge("");setAu("");setRoute(null);setWeight("")}}>← Change age group</button>}
              {ageClass==="adult" ? <><div className="selected-age"><b>{drug==="adenosine"?"Adult standing-order pathway • age 12+":drug==="magnesium"?"Adult magnesium pathway • age 12+":drug==="epinephrine"?"Adult Epinephrine pathway • age 12+":drug==="midazolam"?(an>65?"Adult over 65":"Adult 12–65"):fentanylOlderFrail?"Adult • elderly/frail starting-dose pathway":"Adult fentanyl pathway"}</b></div>{drug==="midazolam"&&an<=65&&<div className="adaptive-section"><small>MEDICATION-SPECIFIC SIZE CHECK</small><b className="compact-question">Is this a small adult under 50 kg?</b><div className="compact-choice-grid"><button className={midazolamSmallAdult===false?"selected":""} onClick={()=>{setMidazolamSmallAdult(false);setRoute(null)}}>No</button><button className={midazolamSmallAdult===true?"selected":""} onClick={()=>{setMidazolamSmallAdult(true);setRoute(null)}}>Yes</button></div></div>}{drug==="midazolam"&&midazolamHalfConsideration&&<div className="base-order-note"><b>½-dose consideration applied</b><span>DMP 9070 states that lower doses may be sufficient in patients over 65 or small adults under 50 kg and says to consider ½ dosing.</span></div>}{drug==="fentanyl"&&fentanylOlderFrail&&<div className="base-order-note"><b>½ starting dose will be calculated</b><span>DMP 9230 says respiratory depression is more common in children and the elderly and directs providers to start with ½ the traditional dose. This does not reduce the cumulative protocol ceiling.</span></div>}{drug==="adenosine"&&<div className="base-order-note"><b>Patient under 12?</b><span>DMP 9010 requires a direct verbal Base order. This pathway does not calculate pediatric Adenosine.</span></div>}</>:drug==="adenosine"?<HardStop title="BASE CONTACT REQUIRED" reason="DMP 9010 requires a direct verbal Base order for pediatric Adenosine administration." source="DMP 9010 Adenosine" action="Choose Adult if the category was selected incorrectly. Otherwise stop and contact Base for a direct order." recoveryLabel="Correct age group" onRecover={()=>{setAgeClass("");setAge("");setAu("")}}/>:<>
                <div className="age-followup"><small>PEDIATRIC DETAIL NEEDED</small><h3>Enter the patient’s age</h3></div>
                <label className="giant-input"><span>Age</span><input autoFocus inputMode="decimal" value={age} onChange={(e)=>setAge(e.target.value)} placeholder="0"/></label>
                <div className="age-unit-toggle age-unit-after-input" aria-label="Age unit">{(["years","months","days"] as AgeUnit[]).map((x)=><button key={x} className={au===x?"selected":""} onClick={()=>setAu(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
                {age!==""&&!au?<div className="input-guidance"><b>Select the age unit</b><span>Choose years, months or days to continue.</span></div>:age!==""&&!ageWithinRange?<div className="input-guidance"><b>Check the age entry</b><span>Use days through 365, months through 143, or years below 12.</span></div>:epiWheezingTooYoung?<HardStop title="AGE OUTSIDE THIS INDICATION" reason="DMP 9120 lists pediatric wheezing Epinephrine only for ages 1 through 12 years." source="DMP 9120 Epinephrine" action="Correct the age or choose the systemic allergic reaction indication when that is the actual clinical reason." recoveryLabel="Correct age or indication" onRecover={()=>{setAge("");setAu("")}}/>:baseRequirement?<BaseContactGate reason={baseRequirement} source={drug==="fentanyl"?"DMP 9230 Opioids":drug==="epinephrine"?"DMP 9120 Epinephrine":"DMP 1100 Transcutaneous Cardiac Pacing"} open={baseContactOpen} physician={basePhysician} attested={baseAttested} approval={baseApproval?.reason===baseRequirement?baseApproval:null} setOpen={setBaseContactOpen} setPhysician={setBasePhysician} setAttested={setBaseAttested} approve={()=>setBaseApproval({physician:basePhysician.trim(),time:Date.now(),reason:baseRequirement})} clear={()=>{setBaseApproval(null);setBaseAttested(false);setBaseContactOpen(true)}}/>:null}
              </>}
            </>}</>}
            {drug==="diphenhydramine"&&ageClass==="adult"&&<div className="adaptive-section"><small>MEDICATION-SPECIFIC AGE CHECK</small><b className="compact-question">Is this patient over 65 years old?</b><div className="compact-choice-grid"><button className={diphenhydramineOlder===false?"selected":""} onClick={()=>{setDiphenhydramineOlder(false);setAge("12");setAu("years");setRoute(null)}}>No</button><button className={diphenhydramineOlder===true?"selected":""} onClick={()=>{setDiphenhydramineOlder(true);setAge("66");setAu("years");setRoute(null)}}>Yes — use 25 mg</button></div></div>}
            {!!reason&&ageOk&&!ageBlocked&&baseClear&&midazolamSizeAnswered&&diphenhydramineAgeAnswered&&<div className="adaptive-section"><small>ROUTE</small><div className="route-grid compact-routes">{routesFor(drug,reason).map((x)=><button key={x} className={route===x?"selected":""} onClick={()=>setRoute(x)}>{x}</button>)}</div>{drug==="midazolam"&&reason==="Status epilepticus"&&<div className="source-note">IN is preferred over IM when IV cannot be safely or rapidly obtained.</div>}{drug==="magnesium"&&route&&r?.note&&<div className="source-note">{r.note}</div>}</div>}
            {!!route&&needWeight&&<div className="adaptive-section"><small>CALCULATION WEIGHT</small><div className="source-grid compact-sources">{[["actual","Actual"],["estimated","Estimated"],...(tapeEligible?[["tape","Length-based tape"]]:[])].map(([id,x])=><button key={id} className={ws===id?"selected":""} onClick={()=>{setWs(id);setWeight("");setTapeColor("");if(id==="tape")setWu("kg")}}>{x}</button>)}</div>
              {weightSuggestion!==null&&ws!=="tape"&&<button className="quick-estimate" onClick={useSuggestedWeight}>Use DMP age-band estimate: {weightSuggestion} kg</button>}
              {ws==="tape"&&tapeEligible?<><div className="tape-heading"><b>Select tape color</b><span>Use only when the child physically fits the tape.</span></div><div className="tape-grid">{tapeBands.map((b)=><button key={b.name} className={tapeColor===b.name?"selected":""} style={{background:b.color,color:b.text}} onClick={()=>selectTapeBand(b.name,b.kg)}><b>{b.name}</b><span>{b.kg} kg</span></button>)}</div></>:<><div className="unit-toggle compact-unit"><button className={wu==="kg"?"selected":""} onClick={()=>setUnit("kg")}>kg</button><button className={wu==="lb"?"selected":""} onClick={()=>setUnit("lb")}>lb</button></div><label className="giant-input compact-weight"><span>Patient weight ({wu})</span><input inputMode="decimal" value={weight} onChange={(e)=>{setWeight(e.target.value);if(ws==="age")setWs("estimated")}} placeholder="0"/></label>{Number(weight)>0&&<div className="kg-lock" role="status"><small>CALCULATION WEIGHT</small><b>{fmt(kg)} kg</b><span>{wu==="lb"?`${weight} lb ÷ 2.2046`:"Entered in kilograms"}</span></div>}</>}
              {ws==="age"&&<div className="estimate-warning"><b>Age-based estimate selected</b><span>Replace it if a better weight becomes available before administration.</span></div>}
            </div>}
            {!!reason&&ageOk&&!ageBlocked&&baseClear&&midazolamSizeAnswered&&diphenhydramineAgeAnswered&&<Next ok={!!route&&weightOk} go={()=>setStep("safety")} text="Continue to safety checks"/>}
          </Screen>
        )}
        {step === "route" && drug && (
          <Screen
            e="ROUTE"
            t="Which route will be used?"
            h="Only routes listed for this drug and indication are offered."
          >
            <div className="route-grid">
              {routesFor(drug,reason).map((x) => (
                <button
                  key={x}
                  className={route === x ? "selected" : ""}
                  onClick={() => {
                    setRoute(x);
                    setTimeout(
                      () =>
                        setStep(
                          rules(drug, reason, an, x).weight
                            ? "weight"
                            : "safety",
                        ),
                      60,
                    );
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
            {drug === "midazolam" && reason === "Status epilepticus" && (
              <div className="source-note">
                IN is preferred over IM when IV cannot be safely or rapidly
                obtained.
              </div>
            )}
          </Screen>
        )}
        {step === "weight" && (
          <Screen
            e="WEIGHT-BASED DOSE"
            t="Enter the calculation weight"
            h="Use an actual weight whenever available."
          >
            <div className="source-grid">
              {[
                ["actual", "Actual"],
                ["estimated", "Estimated"],
                ...(tapeEligible ? [["tape", "Length-based tape"]] : []),
              ].map(([id, x]) => (
                <button
                  key={id}
                  className={ws === id ? "selected" : ""}
                  onClick={() => {
                    setWs(id);
                    setWeight("");
                    setTapeColor("");
                    if (id === "tape") setWu("kg");
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
            {weightSuggestion !== null && ws !== "tape" && (
              <div className="age-weight-suggestion">
                <span>
                  <small>DMP CHART AGE-BAND MIDPOINT</small>
                  <b>
                    {weightSuggestion} kg suggested for {ageText}
                  </b>
                  <em>
                    Use only when an actual or length-based weight is
                    unavailable.
                  </em>
                </span>
                <button
                  className={ws === "age" ? "used" : ""}
                  onClick={useSuggestedWeight}
                >
                  {ws === "age" ? "Using estimate ✓" : "Use estimate"}
                </button>
              </div>
            )}
            {an < 0.5 && (
              <div className="input-guidance">
                <b>No age-based suggestion</b>
                <span>
                  DMP does not provide an age-band weight for patients younger
                  than 6 months. Use an actual, estimated, or length-based
                  weight.
                </span>
              </div>
            )}
            {ws !== "tape" && ws !== "age" && (
              <div className="unit-toggle">
                <button
                  className={wu === "kg" ? "selected" : ""}
                  onClick={() => setUnit("kg")}
                >
                  Kilograms
                </button>
                <button
                  className={wu === "lb" ? "selected" : ""}
                  onClick={() => setUnit("lb")}
                >
                  Pounds
                </button>
              </div>
            )}
            {ws === "tape" && tapeEligible ? (
              <>
                <div className="tape-heading">
                  <b>Select the tape color</b>
                  <span>Use only when the child physically fits the tape.</span>
                </div>
                <div className="tape-grid">
                  {tapeBands.map((b) => (
                    <button
                      key={b.name}
                      className={tapeColor === b.name ? "selected" : ""}
                      style={{ background: b.color, color: b.text }}
                      onClick={() => selectTapeBand(b.name, b.kg)}
                    >
                      <b>{b.name}</b>
                      <span>{b.kg} kg</span>
                    </button>
                  ))}
                </div>
                {tapeColor && (
                  <div className="tape-selected">
                    <span>Selected length-based band</span>
                    <b>
                      {tapeColor} • {fmt(kg)} kg
                    </b>
                  </div>
                )}
              </>
            ) : (
              <label className="giant-input">
                <span>
                  {ws === "age"
                    ? "Accepted age-based estimate (kg)"
                    : `Patient weight ()`}
                </span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    if (ws === "age") setWs("estimated");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && weightOk) next();
                  }}
                  placeholder="0"
                />
              </label>
            )}
            {ws === "age" && (
              <div className="estimate-warning">
                <b>Age-based estimate accepted</b>
                <span>
                  Replace it if a better weight becomes available before
                  medication administration.
                </span>
              </div>
            )}
            <Next ok={valid.weight} go={next} />
          </Screen>
        )}
        {step === "safety" && drug && (
          <Screen
            e="CONTRAINDICATIONS"
            t="Confirm applicable safety checks"
            h={`Only checks applicable to ${medName(drug)} are shown.`}
          >
            <div className="safety-list">
              {items.map((x, i) => (
                <label key={x} className={checks[i] ? "checked" : ""}>
                  <input
                    type="checkbox"
                    checked={!!checks[i]}
                    onChange={(e) => setChecks(current => items.map((_, n) => n === i ? e.target.checked : current[n] === true))}
                  />
                  <span>
                    <b>{i + 1}</b>
                    {x}
                  </span>
                </label>
              ))}
            </div>
            <div className={safetyComplete?"checklist-progress complete":"checklist-progress"} role="status">
              <b>{safetyCompletedCount} of {items.length} confirmed</b>
              <span>{safetyComplete?"Safety checklist complete — continue to the final dose.":"Confirm every applicable item to continue."}</span>
            </div>
            <a
              className="protocol-link"
              href={protocolUrl(drug)}
              target="_blank"
              rel="noreferrer"
            >
              Open medication {protocolId(drug)} ↗
            </a>
            <Next ok={safetyComplete} go={()=>{if(safetyComplete)setStep("review")}} text="Continue to final dose" />
          </Screen>
        )}
        {step === "vial" && drug && r && (
          <Screen
            e="DOSE & CONCENTRATION"
            t={`Build the ${medName(drug)} dose`}
            h="Complete each section from top to bottom."
          >
            <div className="route-rule">
              <b>
                {route} • {reason}
              </b>
              <span>
                {r.repeat>0?`Repeat after ${r.repeat} minutes`:"Repeat per protocol"} • {r.repeatText}
              </span>
              {r.note && <small>{r.note}</small>}
            </div>
            <div className="route-label">
              1. Select the ordered DMP initial dose
            </div>
            {r.rates.length === 1 ? (
              <div className="locked-dose">
                <b>
                  {r.rates[0]} {unit}
                  {r.perKg ? "/kg" : ""}
                </b>
                <span>
                  Automatically selected for this age, indication and route
                </span>
              </div>
            ) : (
              <div className="dose-rate-grid">
                {r.rates.map((x) => (
                  <button
                    key={x}
                    className={rate === x ? "selected" : ""}
                    onClick={() => setRate(x)}
                  >
                    <b>
                      {x} {unit}/kg
                    </b>
                    <span>DMP option</span>
                  </button>
                ))}
              </div>
            )}
            {rate === null ? (
              <div className="completion-prompt">
                <b>Dose selection required</b>
                <span>
                  Select the ordered DMP dose above before entering the vial
                  concentration.
                </span>
              </div>
            ) : (
              <>
                <div className="med-verify">
                  <div className={`photo-placeholder ${medicationPhoto(drug)?"has-med-photo":""}`}>
                    {medicationPhoto(drug)?<img className="medication-vial-photo" src={medicationPhoto(drug)} alt={`${medName(drug)} 12 mg per 4 mL vial reference`}/>:<><div className="drawn-vial">
                      <small>{medName(drug).toUpperCase()}</small>
                      <b>VIAL</b>
                      <small>PHOTO REQUIRED</small>
                    </div>
                    <span>Department photo pending</span></>}
                    <div className="verified-medication">
                      <b>✓ Medication confirmed</b>
                      <span>{medName(drug)}</span>
                    </div>
                  </div>
                  <div className="dose-card">
                    <small>CALCULATED INITIAL DOSE</small>
                    <h3>
                      {doseText}
                    </h3>
                    <p>
                      <span>Patient</span>
                      <b>{needWeight ? `${fmt(kg)} kg` : "Fixed protocol dose"}</b>
                    </p>
                    <p>
                      <span>Route</span>
                      <b>{administrationRoute}</b>
                    </p>
                  </div>
                </div>
                <div className="confirmed-source">
                  <small>CONFIRMED VIAL CONCENTRATION</small>
                  <strong>{fmt(vialAmountForCalculation)} {unit} in {fmt(vialVolumeForCalculation)} mL</strong>
                  <b>{fmt(conc)} {unit}/mL</b>
                  <span>Confirmed before patient dosing information was entered.</span>
                </div>
                {capped && <div className="ceiling-alert" role="alert"><b>PROTOCOL MAXIMUM APPLIED</b><strong>{fmt(baseDose)} {unit} calculated → {fmt(dose)} {unit} maximum</strong><span>The displayed administration volume uses the capped dose. Verify the ceiling against the linked protocol.</span></div>}
                {inTooHigh && (
                  <HardStop
                    title="IN VOLUME EXCEEDS LIMIT"
                    reason={`The calculated total volume of ${fmt(vol)} mL would require more than 1 mL in at least one nostril. DMP limits IN Fentanyl to 1 mL per nostril.`}
                    source="DMP 9230 Opioids"
                    action="Use an appropriate higher concentration or select another DMP-approved route, then recalculate."
                    recoveryLabel="Correct route or concentration"
                    onRecover={() => setStep("age")}
                  />
                )}
                {magImTooHigh && (
                  <HardStop
                    title="IM VOLUME EXCEEDS SITE LIMIT"
                    reason={`The calculated stock volume is ${fmt(vol)} mL, or ${fmt(vol/2)} mL per buttock. DMP 9190 limits each IM site to 10 mL.`}
                    source="DMP 9190 Magnesium Sulfate"
                    action="Confirm an appropriate higher-concentration vial or select the IV/IO route, then recalculate."
                    recoveryLabel="Correct route or concentration"
                    onRecover={() => setStep("age")}
                  />
                )}
                {drug === "midazolam" && inVolumeOverTarget && (
                  <div className="in-volume-caution" role="alert">
                    <b>HIGH IN VOLUME</b>
                    <strong>{fmt(vol)} mL total • {fmt(vol / 2)} mL per nostril</strong>
                    <span>
                      This exceeds the app's 1 mL-per-nostril atomization target. DMP 9070 does not
                      publish a separate IN volume ceiling. Confirm the vial concentration and use a
                      more concentrated formulation or another approved route when appropriate.
                    </span>
                  </div>
                )}
                <Next ok={valid.vial} go={next} text="Review final dose" />
              </>
            )}
          </Screen>
        )}
        {step === "review" && drug && r && (
          <Screen
            e="FINAL CROSS-CHECK"
            t="Select and confirm the dose"
            h="Choose the ordered DMP dose when required, then read the action line aloud."
          >
            <section className="entered-summary" aria-label="Entered medication information">
              <header><small>ENTERED INFORMATION</small><b>Tap a field to correct it</b></header>
              <div>
                <button onClick={()=>setStep("scanConfirm")}><small>MEDICATION</small><b>{medName(drug)}</b></button>
                <button onClick={()=>setStep("age")}><small>PATIENT</small><b>{adult?"Adult":"Pediatric"} • {ageText}</b>{needWeight&&<span>{fmt(kg)} kg</span>}</button>
                <button onClick={()=>setStep("age")}><small>ROUTE</small><b>{administrationRoute}</b></button>
                <button onClick={()=>setStep("scanConfirm")}><small>CONCENTRATION</small><b>{fmt(conc)} {unit}/mL</b><span>{fmt(vialAmountForCalculation)} {unit} in {fmt(vialVolumeForCalculation)} mL</span></button>
                <button className="summary-indication" onClick={()=>setStep("age")}><small>INDICATION</small><b>{reason}</b></button>
                {rate!==null&&<><span className="summary-result"><small>PROTOCOL DOSE</small><b>{epiWeightBandDose?`${kg<25?"<25":"≥25"} kg → ${formatDose(drug,dose,unit)}`:r.perKg?`${fmt(rate)} ${unit}/kg`:formatDose(drug,rate,unit)}</b></span><span className="summary-result primary"><small>CALCULATED RESULT</small><b>{doseText} • {fmt(vol)} mL{epiInfusion?"/min":""}</b></span></>}
              </div>
              <a href={protocolUrl(drug)} target="_blank" rel="noreferrer">Medication {protocolId(drug)} ↗</a>
            </section>
            {baseApproval&&<div className="base-approved compact"><small>BASE AUTHORIZATION</small><b>Approved by {baseApproval.physician}</b><time>{new Date(baseApproval.time).toLocaleString()}</time></div>}
            {epiVariableDose?<section className="epi-dose-entry" aria-label="Enter ordered Epinephrine dose"><header><small>DMP PROTOCOL RANGE</small><strong>{fmt(epiDoseMinimum)}–{fmt(epiDoseMaximum)} mg{epiInfusion?"/min":""}</strong><span>{epiInfusion?"Enter the ordered starting infusion rate.":"Enter the ordered IV push-dose aliquot."}</span></header><label><span>Ordered dose</span><div><input inputMode="decimal" value={customRate} onChange={e=>{const value=e.target.value;setCustomRate(value);setRate(value.trim()===""?null:Number(value))}} placeholder={epiInfusion?"0.002–0.009":"0.01–0.02"}/><b>mg{epiInfusion?"/min":""}</b></div></label>{customRate!==""&&!epiEnteredDoseValid&&<div className="partial-error" role="alert">Enter a dose from {fmt(epiDoseMinimum)} through {fmt(epiDoseMaximum)} mg{epiInfusion?"/min":""}.</div>}</section>:r.rates.length>1&&<><div className="route-label">Select the ordered DMP initial dose</div><div className="dose-rate-grid">{r.rates.map((x)=><button key={x} className={rate===x?"selected":""} onClick={()=>setRate(x)}><b>{x} {unit}/kg</b><span>DMP option</span></button>)}</div></>}
            {rate===null||!epiEnteredDoseValid?<div className="completion-prompt"><b>{epiVariableDose?"Ordered dose required":"Dose selection required"}</b><span>{epiVariableDose?`Enter a dose within the displayed DMP range of ${fmt(epiDoseMinimum)}–${fmt(epiDoseMaximum)} mg${epiInfusion?"/min":""}.`:"Select the ordered DMP dose above to calculate the administration volume."}</span></div>:inTooHigh?<HardStop title="IN VOLUME EXCEEDS LIMIT" reason={`The calculated total volume of ${fmt(vol)} mL would require more than 1 mL in at least one nostril. DMP limits IN Fentanyl to 1 mL per nostril.`} source="DMP 9230 Opioids" action="Select another DMP-approved route or confirm an appropriate higher-concentration vial, then recalculate." recoveryLabel="Correct route or concentration" onRecover={()=>setStep("age")}/>:magImTooHigh?<HardStop title="IM VOLUME EXCEEDS SITE LIMIT" reason={`The calculated stock volume is ${fmt(vol)} mL, or ${fmt(vol/2)} mL per buttock. DMP 9190 limits each IM site to 10 mL.`} source="DMP 9190 Magnesium Sulfate" action="Confirm an appropriate higher-concentration vial or select the IV/IO route, then recalculate." recoveryLabel="Correct route or concentration" onRecover={()=>setStep("age")}/>:epiConcentrationMismatch?<HardStop title="WRONG EPINEPHRINE CONCENTRATION" reason={`This pathway requires ${epiExpectedConcentration===0.1?"0.1 mg/mL (1:10,000)":"1 mg/mL (1:1,000)"}, but the confirmed medication is ${fmt(conc)} mg/mL.`} source="DMP 9120 Epinephrine" action="Do not calculate through the mismatch. Return to the medication check and confirm the correct formulation from the physical label." recoveryLabel="Correct medication concentration" onRecover={()=>setStep("scanConfirm")}/>:<>
            {drug==="fentanyl"&&adult&&<div className="dose-guidance"><b>ADULT DOSING GUIDANCE</b><span>Initial dose is typically 100 mcg. Adult doses may be rounded to the nearest 25 mcg.</span></div>}
            {drug==="fentanyl"&&fentanylOlderFrail&&<div className="ceiling-alert geriatric-adjustment" role="alert"><b>ELDERLY/FRAIL STARTING DOSE APPLIED</b><strong>{fmt(baseDose)} mcg × ½ = GIVE {fmt(dose)} mcg</strong><span>DMP 9230 directs providers to start with ½ the traditional dose in elderly patients and strongly consider ½ typical dosing in elderly or frail patients. The cumulative protocol ceiling is unchanged.</span></div>}
            {drug==="midazolam"&&midazolamHalfConsideration&&<div className="ceiling-alert geriatric-adjustment" role="alert"><b>MIDAZOLAM ½-DOSE CONSIDERATION APPLIED</b><strong>{fmt(baseDose)} mg × ½ = GIVE {fmt(dose)} mg</strong><span>DMP 9070 states lower doses may be sufficient for patients over 65 or small adults under 50 kg. This calculation applies the protocol’s ½-dose consideration.</span></div>}
            {capped && <div className="ceiling-alert" role="alert"><b>PROTOCOL MAXIMUM APPLIED</b><strong>{fmt(baseDose)} {unit} calculated → GIVE {fmt(dose)} {unit}</strong><span>Do not administer the uncapped weight-based result.</span></div>}
            {isIntranasal&&<div className={`in-split-card ${inVolumeOverTarget?"caution":""}`} role={inVolumeOverTarget?"alert":undefined}>
              <small>INTRANASAL DELIVERY</small>
              <strong>{fmt(vol/2)} mL LEFT + {fmt(vol/2)} mL RIGHT</strong>
              <span>{fmt(vol)} mL total • Split evenly between nostrils</span>
              {inVolumeOverTarget&&drug==="midazolam"&&<em>Above the app's 1 mL-per-nostril atomization target; verify concentration and route.</em>}
            </div>}
            {drug==="magnesium"&&reason==="Eclampsia"&&route==="IM"&&<div className="in-split-card"><small>IM SITE SPLIT</small><strong>5 g LEFT + 5 g RIGHT BUTTOCK</strong><span>{fmt(vol/2)} mL per site • {fmt(vol)} mL total stock volume</span></div>}
            {magInfusion&&<MagnesiumDripCalculator durationMinutes={magInfusionMinutes}/>}
            {epiInfusion&&<EpinephrineInfusionCalculator rate={rate||0} stockConcentration={conc}/>}
            {epiPediatricDilution&&<section className="mag-drip-calculator" aria-label="Pediatric Epinephrine push-dose dilution"><header><small>PEDIATRIC PUSH-DOSE DILUTION</small><strong>BASE CONTACT REQUIRED</strong><span>Prepare 0.01 mg/mL before giving</span></header><div className="drip-results"><span><small>DRAW</small><b>1 mL of 0.1 mg/mL Epinephrine</b></span><span><small>ADD</small><b>9 mL Normal Saline</b></span></div><p><b>Final syringe: 0.01 mg/mL.</b> Give {fmt(dose)} mg ({fmt(vol)} mL) by slow IV/IO push under the recorded Base authorization.</p></section>}
            <div className={`monitoring-cautions ${drug}`}><small>MONITORING & ADMINISTRATION</small><ul>{monitoringCautions(drug,reason,route,adult).map((x)=><li key={x}>{x}</li>)}</ul></div>
            {!epiInfusion&&<DoseTracker
              entries={dosesGiven}
              unit={unit}
              total={totalGiven}
              totalVolume={totalVolume}
              maxTotal={maxTotal}
              repeatsLeft={repeatsLeft}
              repeatMinutes={r.repeat}
              secondsLeft={secondsLeft}
              nextDose={nextRepeat}
              concentration={administrationConcentration}
              drug={drug}
              reason={reason}
              route={administrationRoute||""}
              intranasal={isIntranasal}
              record={recordDose}
              openEndedRepeats={epiOpenEndedRepeats}
            />}
            {!epiInfusion&&!epiPediatricDilution&&<details className="calculation-details">
              <summary>Show calculation and syringe guide</summary>
              <MathPicture
                perKg={r.perKg}
                kg={kg}
                rate={rate || 0}
                dose={dose}
                amount={vialAmountForCalculation}
                vialMl={vialVolumeForCalculation}
                concentration={administrationConcentration}
                volume={vol}
                unit={unit}
                doseModifier={doseModifier}
              />
              <SyringeDiagram volume={vol} />
            </details>}
            <MedicationReport
              drug={medName(drug)}
              reason={reason}
              route={administrationRoute || ""}
              age={ageText}
              patientClass={adult ? "Adult" : "Pediatric"}
              weight={needWeight ? `${fmt(kg)} kg` : undefined}
              weightSource={
                ws === "age"
                  ? "age-based estimate"
                  : ws === "tape"
                    ? `${tapeColor} length-based band`
                    : ws
              }
              protocol={`${protocolId(drug)} • July 2026`}
              doseRule={
                (epiWeightBandDose
                  ? `${fmt(kg)} kg ${kg<25?"<":"≥"} 25 kg = ${formatDose(drug,dose,unit)}`
                  : r.perKg
                  ? `${fmt(kg)} kg × ${rate} ${unit}/kg${doseModifier!==1?" × ½ medication-specific adjustment":""}`
                  : `${rate} ${unit}${epiInfusion?"/min infusion rate":" fixed dose"}${doseModifier!==1?" × ½ medication-specific adjustment":""}`) + ((drug==="magnesium"||drug==="epinephrine")?` • ${r.note}`:"")
              }
              concentration={epiInfusion?`${fmt(conc)} mg/mL confirmed stock • prepared bag 0.001 mg/mL`:epiPediatricDilution?`${fmt(conc)} mg/mL confirmed stock • diluted syringe 0.01 mg/mL`:`${fmt(conc)} ${unit}/mL`}
              calculatedDose={doseText}
              calculatedVolume={epiInfusion?`${fmt(vol)} mL/min from prepared 0.001 mg/mL bag`:isIntranasal?`${fmt(vol)} mL total (${fmt(vol/2)} mL per nostril)`:`${fmt(vol)} mL`}
              unit={unit}
              entries={dosesGiven}
              encounterEntries={encounterAdministrations}
              baseApproval={baseApproval||undefined}
              openSignal={reportSignal}
              hideLauncher
            />
            <details className="full-cross-check">
              <summary>Show full medication cross-check</summary>
            <div className="final-card">
              <div className="final-drug">
                <span>Medication</span>
                <b>{medName(drug)}</b>
                <small>
                  {reason} • {administrationRoute}
                </small>
              </div>
              <Review
                l="Patient"
                v={`${adult ? "Adult" : "Pediatric"} • age ${ageText}${needWeight ? ` • ${fmt(kg)} kg${ws === "age" ? " (age-based estimate)" : ws === "tape" ? ` ( length-based band)` : ""}` : ""}`}
              />
              <Review
                l="Medication check"
                v={`Physical vial confirmed as ${medName(drug)}`}
              />
              {baseApproval&&<Review l="Base authorization" v={`Direct verbal order approved by ${baseApproval.physician} • ${new Date(baseApproval.time).toLocaleString()} • ${baseApproval.reason}`}/>} 
              <Review
                l="DMP dose"
                v={
                  epiWeightBandDose
                    ? `${fmt(kg)} kg ${kg<25?"<":"≥"} 25 kg = ${formatDose(drug,dose,unit)}`
                    : r.perKg
                    ? `${fmt(kg)} kg × ${rate} ${unit}/kg${doseModifier!==1?" × ½":""} = ${fmt(dose)} ${unit}`
                    : `${rate} ${unit} fixed dose${doseModifier!==1?" × ½ = "+fmt(dose)+" "+unit:""}`
                }
              />
              {capped && (
                <Review
                  l="Maximum applied"
                  v={`${fmt(baseDose)} ${unit} capped at ${r.maxSingle} ${unit}`}
                />
              )}
              <Review
                l="Repeat rule"
                v={`${r.repeat>0?`After ${r.repeat} min`:"Per protocol"} • ${r.repeatText}`}
              />
              {isIntranasal && (
                <Review
                  l="IN volume split"
                  v={`${fmt(vol / 2)} mL per nostril (${fmt(vol)} mL total)`}
                />
              )}
              <Review
                l="Vial"
                v={`${fmt(vialAmountForCalculation)} ${unit} in ${fmt(vialVolumeForCalculation)} mL = ${fmt(conc)} ${unit}/mL`}
              />
              <Review
                l="Volume calculation"
                v={epiInfusion?`${fmt(dose)} mg/min ÷ 0.001 mg/mL = ${fmt(vol)} mL/min`:epiPediatricDilution?`${fmt(dose)} mg ÷ 0.01 mg/mL = ${fmt(vol)} mL from prepared syringe`:`${fmt(dose)} ${unit} ÷ ${fmt(conc)} ${unit}/mL = ${fmt(vol)} mL`}
              />
              <Review
                l="Protocol"
                v={
                  drug === "fentanyl"
                    ? "DMP 9230 • July 2026"
                    : drug === "adenosine"
                      ? "DMP 9010 • July 2026"
                      : drug === "magnesium"
                        ? "DMP 9190 • July 2026"
                        : drug === "epinephrine"
                          ? "DMP 9120 • July 2026"
                          : "DMP 9070 • July 2026"
                }
              />
            </div>
            <div className="final-warning">
              <b>DMP cross-check required</b>
              <span>
                The syringe diagram is a visual cross-check, not an actual-size
                measuring tool. Verify the physical syringe markings, Six Rights
                and verbal repeat-back. Obtain repeat vital signs after
                administration.
              </span>
            </div>
            </details>
            </>}
            <button className="new-calc" onClick={reset}>
              Start a new calculation
            </button>
          </Screen>
        )}
      </section>
      {install && (
        <div className="modal-backdrop" onClick={() => setInstall(false)}>
          <section className="install-modal">
            <button className="close" onClick={() => setInstall(false)}>
              ×
            </button>
            <h2>Install for offline use</h2>
            <ol>
              <li>Open in Safari and tap Share.</li>
              <li>
                Choose <b>Add to Home Screen</b>.
              </li>
              <li>Open once online after protocol updates.</li>
            </ol>
          </section>
        </div>
      )}
      <FieldToolbar
        ageYears={ageOk?an:null}
        ageLabel={ageOk?ageText:""}
        weightKg={needWeight&&weightOk?kg:null}
        currentDrugId={drug||undefined}
        currentDrug={drug?medName(drug):undefined}
        currentIndication={reason||undefined}
        currentRoute={administrationRoute||undefined}
        fentanylOlderFrail={fentanylOlderFrail}
        midazolamHalfConsideration={midazolamHalfConsideration}
        currentDose={drug&&r&&rate!==null?doseText:undefined}
        currentVolume={drug&&r&&rate!==null&&conc>0?`${fmt(vol)} mL`:undefined}
        onSelectMedication={beginMedication}
        onSelectSuggestedMedication={(selectedDrug)=>beginMedication(selectedDrug,true)}
        reportReady={encounterAdministrations.length>0||Boolean(drug&&r&&rate!==null&&epiEnteredDoseValid&&conc>0&&!volumeBlocked)}
        onOpenReport={()=>{
          if(encounterAdministrations.length)setEncounterReportOpen(true);
          else {setStep("review");setReportSignal(x=>x+1)}
        }}
      />
      {catalogProtocol&&<ProtocolViewer target={catalogProtocol} close={()=>setCatalogProtocol(null)}/>} 
      {genericMedId&&genericMedication(genericMedId)&&<DmpMedicationCalculator medication={genericMedication(genericMedId)} close={()=>setGenericMedId(null)} openProtocol={()=>setCatalogProtocol(genericMedication(genericMedId).paths.length?{id:genericMedication(genericMedId).protocolId,name:genericMedication(genericMedId).name,page:genericMedication(genericMedId).page}:{id:"9000",name:"Medication Administration Guidelines",page:121})} record={(entry)=>setEncounterAdministrations(x=>[...x,entry])}/>} 
      {settingsOpen&&<MedicationVisibilitySettings visibleIds={visibleMedicationIds} setVisibleIds={setVisibleMedicationIds} close={()=>setSettingsOpen(false)}/>} 
      {encounterReportOpen&&<EncounterReport entries={encounterAdministrations} close={()=>setEncounterReportOpen(false)}/>} 
    </main>
  );
}

function MedicationVisibilitySettings({visibleIds,setVisibleIds,close}:{visibleIds:string[];setVisibleIds:(ids:string[])=>void;close:()=>void}) {
  const visible = new Set(visibleIds);
  const toggle = (id:string) => setVisibleIds(visible.has(id) ? visibleIds.filter((item)=>item!==id) : [...visibleIds,id]);
  return <div className="modal-backdrop medication-settings-backdrop" onClick={close}>
    <section className="medication-settings-modal" role="dialog" aria-modal="true" aria-labelledby="medication-settings-title" onClick={(event)=>event.stopPropagation()}>
      <header>
        <span><small>SETTINGS</small><h2 id="medication-settings-title">Medications shown on home screen</h2></span>
        <button className="close" onClick={close} aria-label="Close settings">×</button>
      </header>
      <p>Choose the medications your agency carries or that you want available in the main chart. This changes only the list shown on this device; medication and protocol data are not deleted.</p>
      <div className="medication-settings-summary"><b>{visibleIds.length} shown</b><span>{meds.length-visibleIds.length} hidden</span></div>
      <div className="medication-settings-actions">
        <button onClick={()=>setVisibleIds(meds.map((med)=>med.id))}>Show all</button>
        <button onClick={()=>setVisibleIds([])}>Hide all</button>
      </div>
      <div className="medication-settings-list">
        {meds.map((med)=><label key={med.id} className={visible.has(med.id)?"selected":""}>
          <input type="checkbox" checked={visible.has(med.id)} onChange={()=>toggle(med.id)}/>
          <span><b>{med.name}</b><small>{med.brand} • DMP {med.protocol.id}</small></span>
        </label>)}
      </div>
      <footer><span>Saved automatically on this device</span><button onClick={close}>Done</button></footer>
    </section>
  </div>;
}

const CLINICAL_REVIEW_LOCKED = true;
const REVIEW_PASSWORD_HASH="44099822f339d924177c5e9491735ef0c6b59e73af2c7f0dfe5e9a04a16ee34c",REVIEW_SESSION_KEY="metro-med-dose-review-session",REVIEW_SESSION_MS=8*60*60*1000;
export default function App(){
  const [authorized,setAuthorized]=useState(()=>reviewSessionActive());
  const authorize=async(password:string)=>{
    const digest=await sha256(password),approved=digest===REVIEW_PASSWORD_HASH;
    if(approved){try{localStorage.setItem(REVIEW_SESSION_KEY,String(Date.now()+REVIEW_SESSION_MS))}catch{}setAuthorized(true)}
    return approved;
  };
  const endSession=()=>{try{localStorage.removeItem(REVIEW_SESSION_KEY)}catch{}setAuthorized(false)};
  if(!CLINICAL_REVIEW_LOCKED)return <ClinicalApp/>;
  if(!authorized)return <ReviewLock authorize={authorize}/>;
  return <><button className="review-session-end" onClick={endSession}>End reviewer session</button><ClinicalApp/></>;
}
function reviewSessionActive(){try{return Number(localStorage.getItem(REVIEW_SESSION_KEY))>Date.now()}catch{return false}}
async function sha256(value:string){const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function Screen({
  e,
  t,
  h,
  children,
}: {
  e: string;
  t: string;
  h: string;
  children: ReactNode;
}) {
  return (
    <section className="wizard-card">
      <small className="eyebrow">{e}</small>
      <h1>{t}</h1>
      <p className="screen-help">{h}</p>
      {children}
    </section>
  );
}
function HardStop({
  title,
  reason,
  source,
  action,
  recoveryLabel,
  onRecover,
}: {
  title: string;
  reason: string;
  source: string;
  action: string;
  recoveryLabel?: string;
  onRecover?: () => void;
}) {
  return (
    <div className="hard-stop" role="alert">
      <b>{title}</b>
      <span>
        <strong>Why:</strong> {reason}
      </span>
      <span>
        <strong>Protocol:</strong> {source}
      </span>
      <span>
        <strong>Next:</strong> {action}
      </span>
      {onRecover && (
        <button className="hard-stop-recovery" onClick={onRecover}>
          {recoveryLabel || "Correct the entry"} →
        </button>
      )}
    </div>
  );
}
function BaseContactGate({reason,source,open,physician,attested,approval,setOpen,setPhysician,setAttested,approve,clear}:{reason:string;source:string;open:boolean;physician:string;attested:boolean;approval:{physician:string;time:number;reason:string}|null;setOpen:(x:boolean)=>void;setPhysician:(x:string)=>void;setAttested:(x:boolean)=>void;approve:()=>void;clear:()=>void}) {
  if(approval)return <div className="base-approved" role="status"><small>DIRECT VERBAL ORDER RECORDED</small><b>Base contact approved</b><span>Physician: {approval.physician}</span><time>{new Date(approval.time).toLocaleString()}</time><button onClick={clear}>Correct authorization record</button></div>;
  return <div className="base-contact-gate" role="alert"><button className="base-contact-required" onClick={()=>setOpen(!open)}><small>{source}</small><b>BASE CONTACT REQUIRED</b><span>{reason}</span><strong>{open?"Close":"Record authorization ›"}</strong></button>{open&&<div className="base-contact-form"><p>Continue only after receiving a direct verbal order from the Base physician.</p><label><span>Approving physician name</span><input value={physician} onChange={e=>setPhysician(e.target.value)} autoComplete="off" placeholder="First and last name"/></label><label className="base-attestation"><input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)}/><span>I received and read back the direct verbal order for this patient.</span></label><button className="record-base-approval" disabled={!physician.trim()||!attested} onClick={approve}>Record Base approval and continue</button></div>}</div>;
}
function Next({
  ok,
  go,
  text = "Continue",
}: {
  ok: boolean;
  go: () => void;
  text?: string;
}) {
  return (
    <button className="continue" disabled={!ok} onClick={go}>
      {text}
      <span>→</span>
    </button>
  );
}
function Review({ l, v }: { l: string; v: string }) {
  return (
    <div className="review-row">
      <span>{l}</span>
      <b>{v}</b>
    </div>
  );
}
function MagnesiumDripCalculator({durationMinutes}:{durationMinutes:number}) {
  const [finalVolume,setFinalVolume]=useState("50"),[dropFactor,setDropFactor]=useState(15);
  const volume=Number(finalVolume),valid=volume>0&&volume<=250;
  const mlPerHour=valid?volume*60/durationMinutes:0;
  const dropsPerMinute=valid?Math.round(volume*dropFactor/durationMinutes):0;
  return <section className="mag-drip-calculator" aria-label="Magnesium gravity drip calculator">
    <header><small>MAGNESIUM INFUSION</small><strong>IV DRIP — NOT IV PUSH</strong><span>Infuse over {durationMinutes} minutes</span></header>
    <label><span>Confirmed final prepared volume</span><div><input inputMode="decimal" value={finalVolume} onChange={e=>setFinalVolume(e.target.value)} aria-label="Final prepared infusion volume in milliliters"/><b>mL</b></div></label>
    <div className="drop-factor"><span>Tubing drop factor</span><div>{[10,15,20,60].map(x=><button key={x} className={dropFactor===x?"selected":""} onClick={()=>setDropFactor(x)}>{x} gtt/mL</button>)}</div></div>
    {valid?<div className="drip-results"><span><small>INFUSION PUMP</small><b>{fmt(mlPerHour)} mL/hr</b></span><span><small>GRAVITY TUBING</small><b>{dropsPerMinute} gtt/min</b><em>{dropsPerMinute} drops/min</em></span></div>:<div className="partial-error" role="alert">Enter the final prepared infusion volume to calculate the rate.</div>}
    <p><b>Verify before use:</b> confirm the final prepared volume and the drop factor printed on the tubing package. If medication was added without removing saline, enter the actual total volume. Use an infusion pump when available.</p>
  </section>;
}

function EpinephrineInfusionCalculator({rate,stockConcentration}:{rate:number;stockConcentration:number}) {
  const [dropFactor,setDropFactor]=useState(10);
  const stockVolume=stockConcentration>0?1/stockConcentration:0;
  const mlPerMinute=rate/0.001;
  const mlPerHour=mlPerMinute*60;
  const dropsPerMinute=Math.round(mlPerMinute*dropFactor);
  return <section className="mag-drip-calculator" aria-label="Epinephrine infusion calculator">
    <header><small>EPINEPHRINE INFUSION</small><strong>IV/IO DRIP — NOT IV PUSH</strong><span>Selected rate: {fmt(rate)} mg/min</span></header>
    <div className="drip-results"><span><small>PREPARE</small><b>1 mg in 1000 mL NS</b><em>Draw {fmt(stockVolume)} mL from the confirmed stock • final concentration 0.001 mg/mL</em></span><span><small>INFUSION PUMP</small><b>{fmt(mlPerHour)} mL/hr</b><em>{fmt(mlPerMinute)} mL/min</em></span></div>
    <div className="drop-factor"><span>Macrodrip tubing</span><div>{[10,15].map(x=><button key={x} className={dropFactor===x?"selected":""} onClick={()=>setDropFactor(x)}>{x} gtt/mL</button>)}</div></div>
    <div className="drip-results"><span><small>GRAVITY RATE</small><b>{dropsPerMinute} gtt/min</b><em>{dropFactor} gtt/mL tubing • {fmt(rate)} mg/min</em></span></div>
    <p><b>Label the bag “Epinephrine 0.001 mg/mL.”</b> Begin wide open to gravity in small aliquots and titrate to SBP &gt;90 mmHg, improved respiratory status, and improved perfusion/mentation. Confirm the drop factor printed on the tubing.</p>
  </section>;
}

function MathPicture({
  perKg,
  kg,
  rate,
  dose,
  amount,
  vialMl,
  concentration,
  volume,
  unit,
  doseModifier=1,
}: {
  perKg: boolean;
  kg: number;
  rate: number;
  dose: number;
  amount: number;
  vialMl: number;
  concentration: number;
  volume: number;
  unit: string;
  doseModifier?: number;
}) {
  return (
    <section className="math-picture" aria-label="Dose calculation picture">
      <h2>Calculation picture</h2>
      <div>
        <span>
          <small>1 • DOSE</small>
          <b>
            {perKg
              ? `${fmt(kg)} kg × ${fmt(rate)} ${unit}/kg${doseModifier!==1?" × ½":""}`
              : `Fixed DMP dose${doseModifier!==1?" × ½":""}`}
          </b>
          <strong>
            {fmt(dose)} {unit}
          </strong>
        </span>
        <i>→</i>
        <span>
          <small>2 • CONCENTRATION</small>
          <b>
            {fmt(amount)} {unit} ÷ {fmt(vialMl)} mL
          </b>
          <strong>
            {fmt(concentration)} {unit}/mL
          </strong>
        </span>
        <i>→</i>
        <span className="math-answer">
          <small>3 • DRAW</small>
          <b>
            {fmt(dose)} ÷ {fmt(concentration)}
          </b>
          <strong>{fmt(volume)} mL</strong>
        </span>
      </div>
    </section>
  );
}
function SyringeDiagram({ volume }: { volume: number }) {
  const size = syringeSize(volume),
    fill = Math.min(volume / size, 1) * 190,
    marker = 20 + fill;
  return (
    <section
      className="syringe-card"
      aria-label={`${size} mL syringe drawn to ${fmt(volume)} mL`}
    >
      <div className="syringe-heading">
        <span>
          <small>SUGGESTED SYRINGE</small>
          <b>{size} mL syringe</b>
        </span>
        <strong>DRAW TO {fmt(volume)} mL</strong>
      </div>
      <svg
        viewBox="0 0 300 135"
        role="img"
        aria-label={`Diagram of medication drawn to ${fmt(volume)} mL in a ${size} mL syringe`}
      >
        <path
          d="M4 68h16M4 61v14M210 55h29v26h-29M239 68h49M288 55v26"
          fill="none"
          stroke="#193447"
          strokeWidth="4"
        />
        <rect
          x="20"
          y="40"
          width="190"
          height="55"
          rx="8"
          fill="#fff"
          stroke="#193447"
          strokeWidth="4"
        />
        <rect
          x="22"
          y="42"
          width={Math.max(fill - 2, 0)}
          height="51"
          rx="5"
          fill="#75c9df"
        />
        <line
          x1={marker}
          y1="36"
          x2={marker}
          y2="100"
          stroke="#08745f"
          strokeWidth="4"
        />
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={i}
            x1={20 + i * 19}
            y1="40"
            x2={20 + i * 19}
            y2={i % 5 === 0 ? 55 : 49}
            stroke="#193447"
            strokeWidth="2"
          />
        ))}
        <text x="20" y="118" fontSize="12" fill="#435b6b">
          0
        </text>
        <text x="195" y="118" fontSize="12" fill="#435b6b">
          {size} mL
        </text>
        <text
          x={Math.min(Math.max(marker - 20, 55), 220)}
          y="28"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#08745f"
        >
          {fmt(volume)} mL
        </text>
      </svg>
      <p>
        Use the smallest stocked syringe that safely accommodates the volume.
        Diagram is not actual size; verify the physical graduations.
      </p>
    </section>
  );
}
function syringeSize(volume: number) {
  return [1, 3, 5, 10, 20, 30, 60].find((x) => volume <= x) || 60;
}
function fmt(n: number) {
  const decimals = Math.abs(n) > 0 && Math.abs(n) < 1 ? 3 : 2;
  return Number.isFinite(n) ? Number(n.toFixed(decimals)).toString() : "—";
}
function formatDose(drug: Drug, dose: number, unit: string) {
  return drug === "magnesium" && dose >= 1000
    ? `${fmt(dose)} mg (${fmt(dose / 1000)} g)`
    : `${fmt(dose)} ${unit}`;
}
function medName(d: Drug) {
  return d === "fentanyl" ? "Fentanyl" : d==="adenosine"?"Adenosine (Adenocard)":d==="magnesium"?"Magnesium Sulfate":d==="epinephrine"?"Epinephrine (Adrenalin)":d==="diphenhydramine"?"Diphenhydramine (Benadryl)":d==="methylprednisolone"?"Methylprednisolone (Solu-Medrol)":d==="albuterol"?"Albuterol":"Midazolam (Versed)";
}
function protocolId(d: Drug) {
  return d==="fentanyl"?"DMP 9230":d==="adenosine"?"DMP 9010":d==="magnesium"?"DMP 9190":d==="epinephrine"?"DMP 9120":d==="albuterol"?"DMP 9020":d==="diphenhydramine"?"DMP 9100":d==="methylprednisolone"?"DMP 9200":"DMP 9070";
}
