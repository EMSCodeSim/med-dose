from pathlib import Path

# --- FentanylDoseDashboard: make the primary card operational after first dose and host infusion content ---
p=Path('src/FentanylDoseDashboard.tsx')
s=p.read_text()
s=s.replace('type Props={', 'import type {ReactNode} from "react";\n\ntype Props={', 1)
s=s.replace('  recorded?:{count:number;detail:string}|null;\n};', '''  recorded?:{count:number;detail:string}|null;\n  repeatAction?:{enabled:boolean;label:string;text:string;detail?:string;onGive:()=>void}|null;\n  infusionContent?:ReactNode;\n};''')
s=s.replace('export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive,repeat,recorded}:Props){', 'export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive,repeat,recorded,repeatAction,infusionContent}:Props){')
old='''      {previewReady?<>\n        <div className="dashboard-dose-answer"><strong>GIVE {dose||"—"}</strong>{volume&&<span>DRAW <b>{volume}</b></span>}</div>\n        {doseDetail&&<p>{doseDetail}</p>}\n        {showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}\n      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}'''
new='''      {previewReady?<>\n        {recorded?<div className="dashboard-dose-given"><small>DOSE {recorded.count} GIVEN</small><strong>✓ {recorded.detail}</strong></div>:<div className="dashboard-dose-answer"><strong>GIVE {dose||"—"}</strong>{volume&&<span>DRAW <b>{volume}</b></span>}</div>}\n        {infusionContent}\n        {doseDetail&&<p>{doseDetail}</p>}\n        {!recorded&&showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}\n      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}'''
if old not in s and 'dashboard-dose-given' not in s: raise SystemExit('dashboard primary anchor not found')
if old in s: s=s.replace(old,new,1)
old='''    {previewReady&&<section className={`final-next-dose repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`} aria-live="polite">\n      <span><small>NEXT DOSE / REASSESS</small><strong>{repeat.value}</strong></span>\n      {repeat.nextDose&&<span><small>MAX NEXT DOSE</small><b>{repeat.nextDose}</b></span>}\n      <p>{repeat.detail}</p>\n    </section>}\n    {recorded&&<div className="final-recorded-summary"><b>✓ {recorded.count} dose{recorded.count===1?"":"s"} recorded</b><span>{recorded.detail}</span></div>}'''
new='''    {previewReady&&recorded&&<section className={`final-next-dose repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`} aria-live="polite">\n      <span><small>NEXT DOSE</small><strong>{repeat.nextDose||repeat.value}</strong></span>\n      <span><small>{repeat.state==="running"?"AVAILABLE IN":"STATUS"}</small><b>{repeat.value}</b></span>\n      <p>{repeat.detail}</p>\n      {repeatAction&&<button type="button" className="dashboard-next-dose-action" disabled={!repeatAction.enabled} onClick={repeatAction.onGive}><small>{repeatAction.label}</small><strong>{repeatAction.text}</strong>{repeatAction.detail&&<span>{repeatAction.detail}</span>}</button>}\n    </section>}'''
if old not in s and 'dashboard-next-dose-action' not in s: raise SystemExit('dashboard repeat anchor not found')
if old in s: s=s.replace(old,new,1)
p.write_text(s)

# --- Gravity drip component: compact primary-card mode ---
p=Path('src/GravityDripCalculator.tsx')
s=p.read_text()
s=s.replace('  calculatedMlHr?:number;\n};','  calculatedMlHr?:number;\n  primary?:boolean;\n};')
s=s.replace('export default function GravityDripCalculator({administration,route,calculatedMlHr}:Props){','export default function GravityDripCalculator({administration,route,calculatedMlHr,primary=false}:Props){')
s=s.replace('return <section className="gravity-drip-calculator"', 'return <section className={`gravity-drip-calculator ${primary?"primary-infusion":""}`}',1)
s=s.replace('<header><span><small>IV DRIP / INFUSION</small><b>Gravity drip rate</b></span>{derivedMlHr>0&&<strong>{fmt(gttMin)} drops/min</strong>}</header>', '<header><span><small>IV DRIP / INFUSION</small><b>{primary?"Administration rate":"Gravity drip rate"}</b></span>{derivedMlHr>0&&<strong>{fmt(gttMin)} drops/min</strong>}</header>')
s=s.replace('''    {derivedMlHr>0?<div className="gravity-results"><span><small>PUMP RATE</small><b>{fmt(derivedMlHr)} mL/hr</b></span><span className="primary"><small>GRAVITY RATE</small><b>{fmt(gttMin)} drops/min</b></span></div>:<div className="gravity-awaiting">Confirm prepared volume and infusion time to calculate the gravity rate.</div>}''','''    {derivedMlHr>0?<><div className="gravity-primary-lines">{volume>0&&<span><small>IN</small><b>{fmt(volume)} mL</b></span>}{duration>0&&<span><small>OVER</small><b>{fmt(duration)} min</b></span>}<span><small>PUMP</small><b>{fmt(derivedMlHr)} mL/hr</b></span></div><div className="gravity-results"><span className="primary"><small>GRAVITY RATE</small><b>{fmt(gttMin)} drops/min</b></span></div></>:<div className="gravity-awaiting">Confirm prepared volume and infusion time to calculate the gravity rate.</div>}''')
p.write_text(s)

# --- MedicationEngine: simplify safety, make repeat operational in primary card, move infusion inside it ---
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
old='''{step==="safety"&&path&&result&&<><small className="eyebrow">SAFETY CHECK</small><h1>Review all contraindications</h1><p className="screen-help">Read every applicable item, then confirm the complete list once.</p><div className="action-line"><small>DMP DOSE</small><b>{selectedRoute}</b><strong>{isDopamine?`${fmt(kg)} kg × 5 mcg/kg/min = ${fmt(kg*5)} mcg/min • ${fmt(kg*5/conc*60)} mL/hr`:result.text+(needsConcentration?` = ${fmt(volume)} mL`:"")}</strong></div>'''
new='''{step==="safety"&&path&&result&&<><small className="eyebrow">SAFETY CHECK</small><h1>Review contraindications</h1><div className="safety-med-summary"><b>{path.agent}</b><span>{result.text} • {selectedRoute}</span></div>'''
if old in s: s=s.replace(old,new,1)
elif 'safety-med-summary' not in s: raise SystemExit('safety header anchor not found')
anchor='''          recorded={administrations.length?{count:administrations.length,detail:`${fmt(totalDose)} ${result.numeric?result.unit:"treatments"} recorded`}:null}\n        />\n        {infusionLike&&<GravityDripCalculator administration={path.administration} route={selectedRoute} calculatedMlHr={isDopamine?dopamineMlHr:undefined}/>}\n        {result.numeric&&!isDopamine&&!linkedDose&&administrations.length>0&&<div className="final-repeat-dose-action">'''
replacement='''          recorded={administrations.length?{count:administrations.length,detail:`${fmt(totalDose)} ${result.numeric?result.unit:"treatments"} recorded`}:null}\n          repeatAction={result&&path&&result.numeric&&!isDopamine&&!linkedDose&&administrations.length>0&&repeatRemaining>0&&doseMaximum>0?{enabled:secondsLeft===0,label:secondsLeft?"REASSESS / WAIT":"GIVE NEXT DOSE",text:secondsLeft?`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`:`${fmt(doseMaximum)} ${result!.unit}${needsConcentration?` • ${fmt(doseMaximum/conc)} mL`:""}`,detail:secondsLeft?"Repeat button unlocks when the medication-specific interval is complete.":"Tap to record the next dose using the current medication-specific limit.",onGive:()=>recordAmount(doseMaximum)}:null}\n          infusionContent={infusionLike&&path?<GravityDripCalculator administration={path!.administration} route={selectedRoute} calculatedMlHr={isDopamine?dopamineMlHr:undefined} primary/>:null}\n        />\n        {false&&result.numeric&&!isDopamine&&!linkedDose&&administrations.length>0&&<div className="final-repeat-dose-action">'''
if anchor in s: s=s.replace(anchor,replacement,1)
elif 'repeatAction=' not in s: raise SystemExit('dashboard integration anchor not found')
p.write_text(s)

# --- Shared CSS: standardized post-medication frame, compact safety, operational card, tighter final edit grid ---
p=Path('src/genericMedication.css')
c=p.read_text()
addon=r'''

/* Unified post-medication flow: one frame, one spacing system, one mobile width. */
.streamlined-choice-workspace > .builder-stage-form { width:100%; max-width:760px; margin:0 auto; }
.builder-stage-form > .eyebrow { margin-top:2px; }
.builder-stage-form > h1 { margin:4px 0 12px; }
.safety-med-summary { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 12px; padding:10px 12px; border:1px solid #b8cbd5; border-radius:12px; background:#f6fafc; color:#173f56; }
.safety-med-summary b { font-size:15px; }
.safety-med-summary span { font-size:14px; font-weight:800; text-align:right; }
.dashboard-dose-given { display:flex; flex-direction:column; align-items:center; gap:5px; padding:8px 0 4px; }
.dashboard-dose-given small { font-size:12px; font-weight:900; letter-spacing:.12em; }
.dashboard-dose-given strong { font-size:26px; }
.dashboard-next-dose-action { grid-column:1/-1; width:100%; min-height:68px; margin-top:6px; border:0; border-radius:14px; background:#2e7967; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
.dashboard-next-dose-action:disabled { background:#dbe4e8; color:#61747e; }
.dashboard-next-dose-action small { font-size:10px; font-weight:900; letter-spacing:.12em; }
.dashboard-next-dose-action strong { font-size:21px; }
.dashboard-next-dose-action span { font-size:10px; }
.primary-infusion { margin:10px 0 0; border:0; background:transparent; padding:0; }
.primary-infusion header { display:none; }
.gravity-primary-lines { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:8px 0; }
.gravity-primary-lines span { display:flex; flex-direction:column; align-items:center; padding:7px; border-radius:10px; background:#fff; border:1px solid #bdd2cb; }
.gravity-primary-lines small { font-size:9px; font-weight:900; letter-spacing:.12em; }
.gravity-primary-lines b { font-size:18px; }
.primary-infusion .gravity-drop-sets { margin-top:7px; }
.primary-infusion .gravity-results { margin-top:7px; }
.primary-infusion .gravity-results .primary b { font-size:24px; }

@media(max-width:760px){
  .streamlined-choice-workspace > .builder-stage-form { width:100% !important; max-width:100% !important; margin:0 !important; padding:8px !important; box-sizing:border-box !important; }
  .builder-stage-form > h1 { font-size:25px; line-height:1.08; margin-bottom:10px; }
  .safety-med-summary { margin-bottom:10px; padding:9px 10px; }
  .safety-med-summary b { font-size:14px; }
  .safety-med-summary span { font-size:13px; }
  .final-selection-review.final-edit-grid { margin-bottom:8px !important; padding:7px !important; }
  .final-selection-review.final-edit-grid header { min-height:26px !important; padding:3px 4px !important; }
  .final-selection-review.final-edit-grid > div { display:grid !important; grid-template-columns:1fr 1fr !important; gap:6px !important; }
  .final-selection-review.final-edit-grid button { min-height:62px !important; padding:7px 9px !important; }
  .final-selection-review.final-edit-grid button small { font-size:8px !important; }
  .final-selection-review.final-edit-grid button b { font-size:13px !important; line-height:1.1 !important; }
  .shared-fentanyl-dashboard.final-dose-card { margin-top:6px !important; }
  .dashboard-primary-dose { padding:14px 10px !important; }
  .dashboard-dose-answer strong { font-size:38px !important; }
  .dashboard-dose-answer span { font-size:19px !important; }
  .dashboard-next-dose-action { min-height:64px; }
  .gravity-primary-lines b { font-size:16px; }
}
'''
if 'Unified post-medication flow: one frame' not in c:
    c += addon
p.write_text(c)

p=Path('src/gravityDripCalculator.css')
c=p.read_text()
addon=r'''

.primary-infusion.gravity-drip-calculator { box-shadow:none; }
.primary-infusion .gravity-prep-inputs { grid-template-columns:1fr 1fr; gap:6px; }
.primary-infusion .gravity-confirm-note { font-size:9px; margin:5px 0; }
@media(max-width:760px){
  .primary-infusion .gravity-prep-inputs { grid-template-columns:1fr 1fr; }
  .primary-infusion .gravity-drop-sets>div { grid-template-columns:repeat(4,1fr); }
}
'''
if 'primary-infusion.gravity-drip-calculator' not in c:
    c += addon
p.write_text(c)

print('operational post-medication cleanup applied')
