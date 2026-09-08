import type {OfflineReadyRecord} from "./offlineReadiness";
import "./offlineSetup.css";

type Props={status:"needed"|"downloading"|"ready"|"failed";record:OfflineReadyRecord|null;error:string;onDownload:()=>void};

export default function OfflineSetup({status,record,error,onDownload}:Props){
  if(status==="ready")return <section className="offline-setup ready"><div><small>✓ VERIFIED OFFLINE</small><b>Field calculator downloaded</b><span>Release {record?.releaseVersion||"built-in"} • {record?.cachedFiles||0} app files • Verified {record?new Date(record.verifiedAt).toLocaleDateString():"today"}</span></div><button type="button" onClick={onDownload}>Refresh</button></section>;
  return <section className={`offline-setup ${status}`}><div><small>OFFLINE FIELD USE</small><b>{status==="downloading"?"Downloading and checking…":"Download for Offline Use"}</b><span>{status==="failed"?error:"Downloads the current medication library and verifies the app before you leave Wi-Fi."}</span></div><button type="button" disabled={status==="downloading"} onClick={onDownload}>{status==="downloading"?"Please wait…":"Download & verify"}</button>{status==="downloading"&&<div className="offline-progress" aria-label="Offline download in progress"><i/></div>}</section>;
}
