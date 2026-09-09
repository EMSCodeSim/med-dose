export const OFFLINE_BUNDLE_VERSION="56";
export const OFFLINE_READY_KEY="mmd-offline-ready-v1";

export type OfflineReadyRecord={bundleVersion:string;releaseVersion:number|null;cachedFiles:number;verifiedAt:number;hiddenMedicationIds?:string[]};
type WorkerReply={ok:boolean;cachedFiles?:number;missing?:string[];error?:string};

export function readOfflineReady():OfflineReadyRecord|null{
  try{
    const value=JSON.parse(localStorage.getItem(OFFLINE_READY_KEY)||"null") as OfflineReadyRecord|null;
    return value?.bundleVersion===OFFLINE_BUNDLE_VERSION?value:null;
  }catch{return null}
}

export async function cacheAndVerifyOfflineFiles():Promise<number>{
  if(!("serviceWorker" in navigator))throw new Error("Offline installation is not supported by this browser.");
  const registration=await navigator.serviceWorker.ready;
  const worker=registration.active||navigator.serviceWorker.controller;
  if(!worker)throw new Error("The offline worker is not ready. Reload the page and try again.");
  const reply=await new Promise<WorkerReply>((resolve,reject)=>{
    const channel=new MessageChannel();
    const timer=window.setTimeout(()=>reject(new Error("Offline download timed out. Check your connection and retry.")),30000);
    channel.port1.onmessage=event=>{window.clearTimeout(timer);resolve(event.data as WorkerReply)};
    worker.postMessage({type:"CACHE_AND_VERIFY_OFFLINE"},[channel.port2]);
  });
  if(!reply.ok)throw new Error(reply.missing?.length?`Could not download: ${reply.missing.join(", ")}`:reply.error||"Offline verification failed.");
  return reply.cachedFiles||0;
}

export function saveOfflineReady(record:OfflineReadyRecord){localStorage.setItem(OFFLINE_READY_KEY,JSON.stringify(record))}
