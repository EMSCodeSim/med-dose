import type {OfflineReadyRecord} from "./offlineReadiness";
import "./offlineSetup.css";

type Props={status:"needed"|"downloading"|"ready"|"failed";record:OfflineReadyRecord|null;error:string;onDownload:()=>void};

export default function OfflineSetup({status,record,error,onDownload}:Props){
  if(status==="ready")return <section className="offline-setup ready"><div><small>✓ VERIFIED OFFLINE</small><b>Field calculator downloaded</b><span>Release {record?.releaseVersion||"built-in"} • {record?.cachedFiles||0} app files • Verified {record?new Date(record.verifiedAt).toLocaleDateString():"today"}</span></div><button type="button" onClick={onDownload}>Check updates &amp; verify</button></section>;
  return <section className={`offline-setup ${status}`}><div><small>UPDATES &amp; OFFLINE FIELD USE</small><b>{status==="downloading"?"Checking, downloading and verifying…":"Update and Prepare for Offline Use"}</b><span>{status==="failed"?error:"Checks for the newest live medication release, downloads it and verifies the app for offline use."}</span></div><button type="button" disabled={status==="downloading"} onClick={onDownload}>{status==="downloading"?"Please wait…":"Check updates, download & verify"}</button>{status==="downloading"&&<div className="offline-progress" aria-label="Update and offline verification in progress"><i/></div>}</section>;
}
