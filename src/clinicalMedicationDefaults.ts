import {commonEmsConcentrationsFor as baseCommonEmsConcentrationsFor} from "./emsMedicationDefaults";

export function commonEmsConcentrationsFor(id:string){
  if(id==="droperidol")return [{label:"2.5 mg/mL",amount:2.5,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:2.5,concentrationUnit:"mg/mL"}];
  const items=baseCommonEmsConcentrationsFor(id);
  if(id!=="naloxone")return items;
  return items.filter(item=>!String(item.label||"").toLowerCase().includes("nasal device"));
}
