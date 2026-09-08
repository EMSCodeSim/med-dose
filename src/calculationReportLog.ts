import type {RecordedAdministration} from "./encounterTypes";
import {neonPublicClient,readReleaseMeta} from "./medicationRelease";

const QUEUE_KEY="mmd-calculation-report-queue-v1";

export type CalculationReportEvent="shared"|"printed_or_saved";
type QueuedCalculationReport={
  report_id:string;
  event_type:CalculationReportEvent;
  entries:Array<Omit<RecordedAdministration,"baseAuthorization">>;
  entry_count:number;
  client_created_at:string;
  release_version:number|null;
  protocol_revision:string|null;
};

let flushPromise:Promise<void>|null=null;

const createId=()=>globalThis.crypto?.randomUUID?.()||"10000000-1000-4000-8000-100000000000".replace(/[018]/g,character=>(Number(character)^(Math.random()*16>>(Number(character)/4))).toString(16));
const readQueue=():QueuedCalculationReport[]=>{
  try{
    const value=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");
    return Array.isArray(value)?value:[];
  }catch{return []}
};
const writeQueue=(items:QueuedCalculationReport[])=>localStorage.setItem(QUEUE_KEY,JSON.stringify(items.slice(-100)));

export function queueCalculationReport(eventType:CalculationReportEvent,entries:RecordedAdministration[]){
  if(!entries.length)return;
  const release=readReleaseMeta();
  const item:QueuedCalculationReport={
    report_id:createId(),
    event_type:eventType,
    entries:entries.slice(0,50).map(({baseAuthorization:_,...entry})=>entry),
    entry_count:Math.min(entries.length,50),
    client_created_at:new Date().toISOString(),
    release_version:release?.version||null,
    protocol_revision:release?.protocolRevision||null,
  };
  writeQueue([...readQueue(),item]);
  void flushCalculationReportQueue();
}

export function flushCalculationReportQueue(){
  if(flushPromise)return flushPromise;
  flushPromise=(async()=>{
    if(!navigator.onLine)return;
    let queue=readQueue();
    for(const item of queue){
      const {error}=await neonPublicClient.from("calculation_reports").insert(item);
      const code=error&&typeof error==="object"&&"code" in error?String((error as {code:unknown}).code):"";
      if(error&&code!=="23505")break;
      queue=queue.filter(candidate=>candidate.report_id!==item.report_id);
      writeQueue(queue);
    }
  })().finally(()=>{flushPromise=null});
  return flushPromise;
}
