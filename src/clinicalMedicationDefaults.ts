import {commonEmsConcentrationsFor as baseCommonEmsConcentrationsFor} from "./emsMedicationDefaults";

export function commonEmsConcentrationsFor(id:string){
  const items=baseCommonEmsConcentrationsFor(id);
  if(id!=="naloxone")return items;
  return items.filter(item=>!String(item.label||"").toLowerCase().includes("nasal device"));
}
