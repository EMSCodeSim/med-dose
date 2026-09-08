import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import AdminMedicationManager from "./AdminMedicationManager";
import {releasedFieldMedicationDefinitions} from "./expandedFieldMedicationDefinitions";
import {mergeMedicationCatalog,type CatalogMedication,MEDICATION_CATALOG_KEY} from "./medicationCatalogStore";
import {ADMIN_MEDICATION_STATE_KEY,CLINICAL_OVERRIDE_KEY,REVIEWER_TITLES} from "./adminMedicationStore";
import {errorMessage,neonAdminClient,type AdminWorkspacePayload,type AdminWorkspaceRow,workspaceToPayload} from "./neonAdmin";
import type {ReleasePayload} from "./medicationRelease";
import "./neonAdmin.css";
import "./adminAccount.css";

const REVIEW_KEY="metro-med-dose-medication-reviews-v1";
const ADMIN_LOAD_TIMEOUT_MS=12000;
type AdminAllowlistRow={email:string;role:"admin"|"reviewer";title:string;active:boolean;created_at:string};

function withTimeout<T>(request:PromiseLike<T>,milliseconds=ADMIN_LOAD_TIMEOUT_MS):Promise<T>{
  return new Promise((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new Error("The secure medication workspace did not respond. Check your connection and try again.")),milliseconds);
    Promise.resolve(request).then(value=>{window.clearTimeout(timer);resolve(value)},error=>{window.clearTimeout(timer);reject(error)});
  });
}

function baseCatalog():CatalogMedication[]{
  return releasedFieldMedicationDefinitions.map(def=>({id:def.id,name:def.name,brand:"",sub:def.paths[0]?.protocol||`DMP ${def.protocolId}`,protocol:{id:def.protocolId,name:def.name,page:def.page},visible:true}));
}

function writeLocalWorkspace(payload:AdminWorkspacePayload){
  localStorage.setItem(ADMIN_MEDICATION_STATE_KEY,JSON.stringify(payload.medicationState));
  localStorage.setItem(REVIEW_KEY,JSON.stringify(payload.reviews));
  localStorage.setItem(MEDICATION_CATALOG_KEY,JSON.stringify(payload.catalog));
  localStorage.setItem(CLINICAL_OVERRIDE_KEY,JSON.stringify(payload.clinicalOverrides));
}

function readLocalWorkspace():AdminWorkspacePayload{
  const read=<T,>(key:string):T=>{try{return JSON.parse(localStorage.getItem(key)||"{}") as T}catch{return {} as T}};
  return {medicationState:read(ADMIN_MEDICATION_STATE_KEY),reviews:read(REVIEW_KEY),catalog:read(MEDICATION_CATALOG_KEY),clinicalOverrides:read(CLINICAL_OVERRIDE_KEY)};
}

const hasWorkspaceData=(payload:AdminWorkspacePayload)=>Object.values(payload).some(value=>Object.keys(value).length>0);

function AuthPanel(){
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError("");
    try{
      const result=mode==="signin"
        ?await neonAdminClient.auth.signIn.email({email:email.trim(),password})
        :await neonAdminClient.auth.signUp.email({email:email.trim(),password,name:"MyMedDose Administrator"});
      if(result&&typeof result==="object"&&"error" in result&&(result as {error?:unknown}).error)throw (result as {error:unknown}).error;
      window.location.reload();
    }catch(err){setError(errorMessage(err,"Unable to authenticate"))}
    finally{setBusy(false)}
  };
  return <main className="neon-admin-gate"><section className="neon-admin-card">
    <small>MYMEDDOSE • SECURE ADMIN</small><h1>Medication governance</h1>
    <p>Sign in to manage medication records, field visibility and clinical review history. Access is restricted to approved administrators.</p>
    <form onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label>Password<input type="password" autoComplete={mode==="signin"?"current-password":"new-password"} minLength={8} required value={password} onChange={event=>setPassword(event.target.value)}/></label>
      {error&&<div className="neon-admin-error" role="alert">{error}</div>}
      <button className="primary" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create administrator account"}</button>
    </form>
    <button className="neon-admin-mode" onClick={()=>{setMode(value=>value==="signin"?"signup":"signin");setError("")}}>{mode==="signin"?"First visit? Create the approved account":"Already created the account? Sign in"}</button>
    <a href="/">← Return to field calculator</a>
  </section></main>;
}

export default function AdminRoute(){
  const session=neonAdminClient.auth.useSession();
  const [workspace,setWorkspace]=useState<AdminWorkspaceRow|null>(null);
  const [loadState,setLoadState]=useState<"loading"|"ready"|"denied"|"error">("loading");
  const [syncState,setSyncState]=useState<"synced"|"saving"|"failed">("synced");
  const [message,setMessage]=useState("");
  const [localRevision,setLocalRevision]=useState(0);
  const [liveVersion,setLiveVersion]=useState(0);
  const [publishing,setPublishing]=useState(false);
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [accountOpen,setAccountOpen]=useState(false);
  const [admins,setAdmins]=useState<AdminAllowlistRow[]>([]);
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteTitle,setInviteTitle]=useState("Administrator");
  const [accountBusy,setAccountBusy]=useState(false);
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const versionRef=useRef(0);
  const savedPayloadRef=useRef("");
  const saveTimerRef=useRef<number|undefined>(undefined);
  const user=session.data?.user;

  useEffect(()=>{
    if(session.isPending)return;
    if(!user){setLoadState("loading");setWorkspace(null);return}
    let active=true;
    (async()=>{
      setLoadState("loading");setMessage("");
      try{
        const {data,error}=await withTimeout(neonAdminClient.from("admin_workspace").select("*").eq("id","primary").single());
        if(!active)return;
        if(error)throw error;
        const row=data as AdminWorkspaceRow;
        const remotePayload=workspaceToPayload(row);
        const localPayload=readLocalWorkspace();
        const payload=!hasWorkspaceData(remotePayload)&&hasWorkspaceData(localPayload)?localPayload:remotePayload;
        try{writeLocalWorkspace(payload)}catch{}
        versionRef.current=row.version;savedPayloadRef.current=JSON.stringify(remotePayload);
        setWorkspace({...row,reviews:payload.reviews});setLocalRevision(value=>value+1);setLoadState("ready");
        try{
          const latest=await withTimeout(neonAdminClient.from("medication_releases").select("release_version").order("release_version",{ascending:false}).limit(1).maybeSingle());
          if(active&&latest.data)setLiveVersion(Number((latest.data as {release_version:number}).release_version));
        }catch{}
        try{
          const members=await withTimeout(neonAdminClient.from("admin_allowlist").select("email,role,title,active,created_at").order("created_at",{ascending:true}));
          if(active&&!members.error)setAdmins((members.data||[]) as AdminAllowlistRow[]);
        }catch{}
      }catch(error){
        if(!active)return;
        const text=errorMessage(error,"The secure workspace could not be loaded.");
        setMessage(text);
        setLoadState(/permission|policy|row|jwt|authorized/i.test(text)?"denied":"error");
      }
    })();
    return()=>{active=false};
  },[session.isPending,user?.id,loadAttempt]);

  useEffect(()=>()=>window.clearTimeout(saveTimerRef.current),[]);

  const saveWorkspace=useCallback((payload:AdminWorkspacePayload)=>{
    const serialized=JSON.stringify(payload);
    if(serialized===savedPayloadRef.current)return;
    window.clearTimeout(saveTimerRef.current);setSyncState("saving");
    saveTimerRef.current=window.setTimeout(async()=>{
      const expectedVersion=versionRef.current;
      const {data,error}=await neonAdminClient.from("admin_workspace").update({medication_state:payload.medicationState,reviews:payload.reviews,catalog:payload.catalog,clinical_overrides:payload.clinicalOverrides,version:expectedVersion+1,updated_at:new Date().toISOString(),updated_by:user?.id||null}).eq("id","primary").eq("version",expectedVersion).select("version").maybeSingle();
      if(error||!data){setSyncState("failed");setMessage(error?errorMessage(error):"This dashboard changed in another session. Reload before editing again.");return}
      versionRef.current=(data as {version:number}).version;savedPayloadRef.current=serialized;setSyncState("synced");setMessage("");
      await neonAdminClient.from("admin_audit_log").insert({action:"workspace.saved",details:{version:versionRef.current}});
    },650);
  },[user?.id]);

  const catalog=useMemo(()=>mergeMedicationCatalog(baseCatalog()),[localRevision]);
  const reviews=useMemo(()=>workspace?.reviews||{},[workspace,localRevision]);
  const setReviews=(next:typeof reviews)=>{try{localStorage.setItem(REVIEW_KEY,JSON.stringify(next))}catch{};setWorkspace(value=>value?{...value,reviews:next}:value)};
  const publish=async(payload:ReleasePayload,medicationCount:number)=>{
    setPublishing(true);setMessage("");
    try{
      const nextVersion=liveVersion+1;
      const {error}=await neonAdminClient.from("medication_releases").insert({release_version:nextVersion,protocol_revision:payload.protocolRevision,payload,medication_count:medicationCount,published_by:user?.id||null});
      if(error)throw error;
      setLiveVersion(nextVersion);setMessage(`Release ${nextVersion} is live. User devices can download it now.`);
      await neonAdminClient.from("admin_audit_log").insert({action:"medication_release.published",details:{releaseVersion:nextVersion,medicationCount}});
    }catch(err){setMessage(errorMessage(err,"Unable to publish the medication release"))}
    finally{setPublishing(false)}
  };
  const changePassword=async(event:FormEvent)=>{
    event.preventDefault();setMessage("");
    if(newPassword.length<8){setMessage("The new password must be at least 8 characters.");return}
    if(newPassword!==confirmPassword){setMessage("The new passwords do not match.");return}
    setAccountBusy(true);
    try{
      const result=await neonAdminClient.auth.changePassword({currentPassword,newPassword,revokeOtherSessions:true});
      if(result&&typeof result==="object"&&"error" in result&&(result as {error?:unknown}).error)throw (result as {error:unknown}).error;
      setCurrentPassword("");setNewPassword("");setConfirmPassword("");setMessage("Password changed successfully. Other sessions were signed out.");
      await neonAdminClient.from("admin_audit_log").insert({action:"account.password_changed",details:{}});
    }catch(err){setMessage(errorMessage(err,"Unable to change the password"))}
    finally{setAccountBusy(false)}
  };
  const inviteAdmin=async(event:FormEvent)=>{
    event.preventDefault();setMessage("");
    const email=inviteEmail.trim().toLowerCase();
    if(admins.filter(item=>item.active).length>=3){setMessage("This workspace already has three active reviewers.");return}
    setAccountBusy(true);
    try{
      const {data,error}=await neonAdminClient.from("admin_allowlist").upsert({email,role:"admin",title:inviteTitle,active:true,invited_by:user?.id||null},{onConflict:"email"}).select("email,role,title,active,created_at").single();
      if(error)throw error;
      setAdmins(items=>[...items.filter(item=>item.email!==email),data as AdminAllowlistRow]);
      setInviteEmail("");setMessage(`${email} is authorized. Send them the admin link so they can create an account and review.`);
      await neonAdminClient.from("admin_audit_log").insert({action:"admin.invited",details:{email,title:inviteTitle}});
    }catch(err){setMessage(errorMessage(err,"Unable to invite that reviewer"))}
    finally{setAccountBusy(false)}
  };

  if(session.isPending)return <main className="neon-admin-gate"><section className="neon-admin-card"><p>Checking secure admin session…</p></section></main>;
  if(!user)return <AuthPanel/>;
  if(loadState!=="ready")return <main className="neon-admin-gate"><section className="neon-admin-card"><small>MYMEDDOSE • SECURE ADMIN</small><h1>{loadState==="loading"?"Loading dashboard":loadState==="denied"?"Access not approved":"Dashboard unavailable"}</h1><p>{loadState==="loading"?"Retrieving the current medication workspace from Neon…":message||"The secure workspace could not be loaded."}</p>{loadState!=="loading"&&<><button className="primary" onClick={()=>setLoadAttempt(value=>value+1)}>Try again</button><button className="neon-admin-mode" onClick={async()=>{await neonAdminClient.auth.signOut();window.location.reload()}}>Sign out and reconnect</button></>}</section></main>;

  return <div className="admin-route-shell">
    <div className={`neon-admin-session ${syncState}`}><span><b>{syncState==="saving"?"Saving to Neon…":syncState==="failed"?"Sync failed":"✓ Synced to Neon"}</b>{message&&<small>{message}</small>}</span><span>{user.email}<button onClick={()=>setAccountOpen(true)}>Account</button><button onClick={async()=>{await neonAdminClient.auth.signOut();window.location.assign("/")}}>Sign out</button></span></div>
    <AdminMedicationManager medications={catalog} reviews={reviews} setReviews={setReviews} onWorkspaceChange={saveWorkspace} onPublish={publish} liveVersion={liveVersion} publishing={publishing} reviewerIdentity={user.email} close={()=>window.location.assign("/")}/>
    {accountOpen&&<div className="admin-account-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setAccountOpen(false)}}><section className="admin-account-panel" role="dialog" aria-modal="true" aria-labelledby="account-heading">
      <header><div><small>ADMIN ACCOUNT</small><h2 id="account-heading">Security & reviewers</h2></div><button aria-label="Close" onClick={()=>setAccountOpen(false)}>×</button></header>
      {message&&<div className="neon-admin-notice" role="status">{message}</div>}
      <form onSubmit={changePassword}>
        <h3>Change password</h3><p>Enter your current password, then choose a new password with at least 8 characters.</p>
        <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)}/></label>
        <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event=>setNewPassword(event.target.value)}/></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label>
        <button className="primary" disabled={accountBusy}>Change password</button>
      </form>
      <section className="admin-reviewer-access"><h3>Authorized reviewers</h3><p>Up to three administrators can access the dashboard. Only two signatures are required to approve each medication.</p>
        <div className="admin-reviewer-list">{admins.map(admin=><article key={admin.email}><span><b>{admin.email}</b><small>{admin.title||"Administrator"}</small></span><i>{admin.active?"Active":"Inactive"}</i></article>)}</div>
        {admins.filter(item=>item.active).length<3?<form onSubmit={inviteAdmin}><h3>Invite another administrator</h3><label>Email<input type="email" autoComplete="email" required value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} placeholder="reviewer@example.com"/></label><label>Title<select value={inviteTitle} onChange={event=>setInviteTitle(event.target.value)}>{REVIEWER_TITLES.filter(title=>title!=="Other").map(title=><option key={title}>{title}</option>)}</select></label><button className="primary" disabled={accountBusy}>Authorize reviewer</button><small>After authorization, send the reviewer the admin link. They can use “Create administrator account” with this email.</small></form>:<div className="neon-admin-notice">Three reviewer accounts are active.</div>}
      </section>
    </section></div>}
  </div>;
}
