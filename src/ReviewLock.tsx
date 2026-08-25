import "./reviewLock.css";
import {useState} from "react";

export default function ReviewLock({authorize}:{authorize:(password:string)=>Promise<boolean>}){
  const [password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[show,setShow]=useState(false);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!password||busy)return;setBusy(true);setError("");const approved=await authorize(password);if(!approved){setError("Password not recognized. Check the password and try again.");setPassword("")}setBusy(false)};
  return <main className="review-lock">
    <header className="review-lock-header">
      <div className="review-lock-brand"><b>M</b><span><strong>Metro Med Dose</strong><small>Clinical decision-support project</small></span></div>
      <span className="review-lock-status">RESTRICTED</span>
    </header>
    <section className="review-lock-main">
      <div className="review-lock-shield" aria-hidden="true"><span>✓</span></div>
      <small className="review-lock-eyebrow">CLINICAL SAFETY HOLD</small>
      <h1>Medical Director Review in Progress</h1>
      <p>Medication calculators, dose information, routes, protocols and reports are temporarily unavailable while the clinical content is reviewed and approved.</p>
      <div className="review-lock-warning" role="status"><b>Not approved for patient care</b><span>Use your current agency protocols and approved clinical resources.</span></div>
      <div className="review-lock-checks" aria-label="Review process">
        <article><i>1</i><span><b>Protocol validation</b><small>Medication pathways and indications</small></span></article>
        <article><i>2</i><span><b>Calculation review</b><small>Doses, concentrations and ceilings</small></span></article>
        <article><i>3</i><span><b>Medical approval</b><small>Release authorized by the Medical Director</small></span></article>
      </div>
      <form className="review-lock-login" onSubmit={submit}>
        <header><small>AUTHORIZED REVIEWERS</small><b>Open the clinical review build</b><span>Access remains active on this device for eight hours.</span></header>
        <label><span>Reviewer password</span><div><input autoFocus type={show?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("")}} autoComplete="current-password" placeholder="Enter password"/><button type="button" onClick={()=>setShow(x=>!x)} aria-label={show?"Hide password":"Show password"}>{show?"Hide":"Show"}</button></div></label>
        {error&&<p role="alert">{error}</p>}
        <button className="review-lock-enter" disabled={!password||busy}>{busy?"Checking…":"Enter review build →"}</button>
      </form>
      <footer><b>Metro Med Dose</b><span>Access will be restored after clinical approval.</span></footer>
    </section>
  </main>;
}
