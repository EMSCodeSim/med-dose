export type CatalogProtocol={id:string;name:string;page:number};
export type CatalogMedication={
  id:string;
  name:string;
  brand:string;
  sub:string;
  protocol:CatalogProtocol;
  calculator?:string;
  visible?:boolean;
  retired?:boolean;
  custom?:boolean;
  pending?:boolean;
};

export type MedicationCatalogState=Record<string,CatalogMedication>;
export const MEDICATION_CATALOG_KEY="metro-med-dose-medication-catalog-v1";

const canUseStorage=()=>typeof window!=="undefined"&&!!window.localStorage;
export function loadMedicationCatalogState():MedicationCatalogState{
  if(!canUseStorage())return {};
  try{
    const parsed=JSON.parse(window.localStorage.getItem(MEDICATION_CATALOG_KEY)||"{}");
    return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};
  }catch{return {}}
}
export function saveMedicationCatalogState(state:MedicationCatalogState){
  if(canUseStorage())window.localStorage.setItem(MEDICATION_CATALOG_KEY,JSON.stringify(state));
}
export function saveCatalogMedication(medication:CatalogMedication){
  const state=loadMedicationCatalogState();
  state[medication.id]=medication;
  saveMedicationCatalogState(state);
  return state;
}
export function mergeMedicationCatalog<T extends {id:string;name:string;brand:string;sub:string;protocol:CatalogProtocol;calculator?:unknown}>(bundled:T[]):T[]{
  if(!canUseStorage())return bundled;
  const state=loadMedicationCatalogState();
  const merged=new Map<string,T>();
  bundled.forEach(item=>{
    const saved=state[item.id];
    if(!saved){merged.set(item.id,item);return}
    merged.set(item.id,{...item,...saved,protocol:{...item.protocol,...saved.protocol}} as T);
  });
  Object.values(state).forEach(saved=>{
    if(!merged.has(saved.id))merged.set(saved.id,saved as unknown as T);
  });
  return Array.from(merged.values()).sort((a,b)=>a.name.localeCompare(b.name));
}
export function medicationCatalogVisible(id:string,fallback=false){
  const item=loadMedicationCatalogState()[id];
  if(item?.retired||item?.pending)return false;
  return typeof item?.visible==="boolean"?item.visible:fallback;
}
export function medicationCatalogRetired(id:string){return loadMedicationCatalogState()[id]?.retired===true}
