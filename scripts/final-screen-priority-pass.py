from pathlib import Path

# 1) Shared dashboard: keep dose/action/math open; collapse everything else.
p=Path('src/FentanylDoseDashboard.tsx')
s=p.read_text()
old='''    {previewReady&&math&&<section className="dose-math-control"><button type="button" aria-expanded={showMath} onClick={()=>setShowMath(!showMath)}>{showMath?"Hide math":"Show math"} <span>{showMath?"−":"+"}</span></button>{showMath&&<div className="dose-math-box"><small>DOSE CALCULATION</small><b>{math}</b>{mathDetails.map(item=><span key={item}>{item}</span>)}</div>}</section>}
    {previewReady&&syringeVolume!==undefined&&syringeVolume>=0&&<DoseSyringe volume={syringeVolume}/>} 
    {previewReady&&instructions.length>0&&<section className="administration-special"><small>SPECIAL INSTRUCTIONS</small><div>{instructions.map(item=><span key={`${item.label}-${item.value}`} className={item.wide?"wide":undefined}><b>{item.label}</b>{item.value}</span>)}</div></section>}
    {correction&&<button className="dashboard-required" onClick={correction.onClick}><b>{correction.title}</b><span>{correction.detail}</span><i>{correction.action} ›</i></button>}
    <section className={`dashboard-timer repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`}><small>{repeat.label}</small><strong>{repeat.value}</strong><span>{repeat.detail}</span>{repeat.nextDose&&<b className="next-dose-field">{repeat.nextDose}</b>}</section>
    {recorded&&<div className="dashboard-recorded"><b>✓ {recorded.count} dose{recorded.count===1?"":"s"} recorded</b><span>{recorded.detail}</span></div>}
'''
new='''    {previewReady&&math&&<section className="dose-math-control dose-math-always-open"><div className="dose-math-box"><small>DOSE CALCULATION</small><b>{math}</b>{mathDetails.map(item=><span key={item}>{item}</span>)}</div></section>}
    <details className="dashboard-more-details"><summary>More details</summary><div>
      {previewReady&&syringeVolume!==undefined&&syringeVolume>=0&&<DoseSyringe volume={syringeVolume}/>} 
      {previewReady&&instructions.length>0&&<section className="administration-special"><small>SPECIAL INSTRUCTIONS</small><div>{instructions.map(item=><span key={`${item.label}-${item.value}`} className={item.wide?"wide":undefined}><b>{item.label}</b>{item.value}</span>)}</div></section>}
      {correction&&<button className="dashboard-required" onClick={correction.onClick}><b>{correction.title}</b><span>{correction.detail}</span><i>{correction.action} ›</i></button>}
      <section className={`dashboard-timer repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`}><small>{repeat.label}</small><strong>{repeat.value}</strong><span>{repeat.detail}</span>{repeat.nextDose&&<b className="next-dose-field">{repeat.nextDose}</b>}</section>
      {recorded&&<div className="dashboard-recorded"><b>✓ {recorded.count} dose{recorded.count===1?"":"s"} recorded</b><span>{recorded.detail}</span></div>}
    </div></details>
'''
if old not in s: raise SystemExit('dashboard detail block not found')
s=s.replace(old,new,1)
p.write_text(s)

# 2) Medication engine: add real large Change Dose editor and make dashboard use adjusted dose.
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
old='''    [dopamineRate,setDopamineRate]=useState(5),[dropFactor,setDropFactor]=useState(60),[returnToResult,setReturnToResult]=useState(false);'''
new='''    [dopamineRate,setDopamineRate]=useState(5),[dropFactor,setDropFactor]=useState(60),[returnToResult,setReturnToResult]=useState(false),[editingFinalDose,setEditingFinalDose]=useState(false);'''
if old not in s: raise SystemExit('state anchor not found')
s=s.replace(old,new,1)

anchor='''      {step==="result"&&path&&result&&<>\n        <section className="entered-summary final-selection-review">'''
insert='''      {step==="result"&&path&&result&&<>\n        <section className="entered-summary final-selection-review">'''
if anchor not in s: raise SystemExit('result anchor not found')
# keep same anchor; editor is inserted after cross-check section using protocol link close marker
marker='''        </div><button className="generic-protocol-link" onClick={openProtocol}>Medication {medication.protocolId} ↗</button></section>\n        <FentanylDoseDashboard'''
replacement='''        </div><button className="generic-protocol-link" onClick={openProtocol}>Medication {medication.protocolId} ↗</button></section>\n        {result.numeric&&!isDopamine&&!linkedDose&&<section className="final-change-dose"><button type="button" onClick={()=>setEditingFinalDose(x=>!x)}><small>CHANGE DOSE</small><strong>{editingFinalDose?"USE CALCULATED DOSE":"CHANGE AMOUNT TO GIVE"}</strong><span>{editingFinalDose?"Reset or enter the actual amount below":"Tap to adjust the amount without restarting"}</span></button>{editingFinalDose&&<div className="final-dose-editor"><label><span>Amount to give</span><div><input autoFocus inputMode="decimal" value={actual} onChange={e=>setActual(e.target.value)} /><b>{result.unit}</b></div></label><button type="button" onClick={()=>{setActual(String(result.minDose||result.dose));setEditingFinalDose(false)}}>Use calculated dose</button>{actualDose>0&&actualDose<=doseMaximum?<strong>{needsConcentration?`Draw ${fmt(actualDose/conc)} mL`:`Give ${fmt(actualDose)} ${result.unit}`}</strong>:<em>Enter more than 0 and no more than {fmt(doseMaximum)} {result.unit}.</em>}</div>}</section>}\n        <FentanylDoseDashboard'''
if marker not in s: raise SystemExit('cross-check dashboard marker not found')
s=s.replace(marker,replacement,1)

# Replace dashboard dose/volume/give with actual amount when user changed it.
s=s.replace('''          dose={finalGiveText}\n          volume={finalVolumeText}''','''          dose={!isDopamine&&!linkedDose&&result.numeric&&actualDose>0?`${fmt(actualDose)} ${result.unit}`:finalGiveText}\n          volume={!isDopamine&&!linkedDose&&result.numeric&&actualDose>0?(needsConcentration?`${fmt(actualDose/conc)} mL`:result.unit==="mL"?`${fmt(actualDose)} mL`:finalVolumeText):finalVolumeText}''',1)
s=s.replace('''          giveText={`${finalGiveText}${finalVolumeText?` • ${finalVolumeText}`:""}`}''','''          giveText={!isDopamine&&!linkedDose&&result.numeric&&actualDose>0?`${fmt(actualDose)} ${result.unit}${needsConcentration?` • ${fmt(actualDose/conc)} mL`:""}`:`${finalGiveText}${finalVolumeText?` • ${finalVolumeText}`:""}`}''',1)
s=s.replace('''          giveDisabled={!safetyComplete||!result||isDopamine||!!linkedDose}\n          onGive={()=>result&&result.numeric&&recordAmount(result.dose)}''','''          giveDisabled={!safetyComplete||!result||isDopamine||!!linkedDose||(result.numeric&&(!actualDose||actualDose>doseMaximum))}\n          onGive={()=>result&&result.numeric&&recordAmount(actualDose>0?actualDose:result.dose)}''',1)

# Remove extra always-visible adjustment panel and make it part of More details below dashboard.
old='''        {additionalAdjustment&&<div className="generic-dose-adjustment"><b>MEDICATION-SPECIFIC ADJUSTMENT</b><span>{additionalAdjustment}</span></div>}\n        <details className="result-collapsible"><summary>Monitoring and administration</summary>'''
new='''        <details className="result-collapsible final-secondary-details"><summary>Clinical details</summary><div>{additionalAdjustment&&<div className="generic-dose-adjustment"><b>MEDICATION-SPECIFIC ADJUSTMENT</b><span>{additionalAdjustment}</span></div>}<div className="monitoring-cautions"><small>MONITORING & ADMINISTRATION</small><ul>{monitoring.map(x=><li key={x}>{x}</li>)}</ul></div></div></details>\n        <details className="result-collapsible generic-hidden-old-monitoring"><summary>Monitoring and administration</summary>'''
if old not in s: raise SystemExit('monitoring anchor not found')
s=s.replace(old,new,1)
# Hide duplicate old monitoring details block through class; safer than structural parse.

p.write_text(s)

# 3) CSS priorities.
p=Path('src/genericMedication.css')
c=p.read_text()
addon=r'''

/* Final screen priority: selections, dose, change dose, and math stay large/open. */
.final-selection-review > header { padding:14px 16px; }
.final-selection-review > header b { font-size:13px; }
.final-selection-review > div { gap:10px; padding:12px; }
.final-selection-review > div > button { min-height:96px; padding:14px 42px 14px 14px; }
.final-selection-review button small { font-size:9px; }
.final-selection-review button b { font-size:15px; line-height:1.25; }
.final-selection-review button span { margin-top:8px; font-size:10px; }
.final-change-dose { margin:14px 0; }
.final-change-dose > button { width:100%; min-height:92px; padding:14px 16px; border:3px solid #0873b5; border-radius:14px; background:#eef8fe; color:#123f58; text-align:left; }
.final-change-dose > button small,.final-change-dose > button strong,.final-change-dose > button span { display:block; }
.final-change-dose > button small { color:#0873b5; font-size:10px; font-weight:900; letter-spacing:.12em; }
.final-change-dose > button strong { margin-top:4px; font-size:23px; }
.final-change-dose > button span { margin-top:4px; color:#55707f; font-size:11px; }
.final-dose-editor { margin-top:8px; padding:14px; border:2px solid #b9d2df; border-radius:12px; background:#fff; }
.final-dose-editor label>span { display:block; margin-bottom:6px; font-size:10px; font-weight:900; }
.final-dose-editor label>div { display:flex; }
.final-dose-editor input { width:100%; min-width:0; height:64px; padding:0 14px; border:2px solid #9eb7c5; border-radius:10px 0 0 10px; font-size:30px; font-weight:900; }
.final-dose-editor label>div>b { display:grid; min-width:72px; place-items:center; border:2px solid #9eb7c5; border-left:0; border-radius:0 10px 10px 0; background:#e9f0f4; font-size:18px; }
.final-dose-editor>button { width:100%; min-height:52px; margin-top:9px; border:0; border-radius:9px; background:#e8eef1; color:#24495c; font-weight:900; }
.final-dose-editor>strong,.final-dose-editor>em { display:block; margin-top:9px; padding:10px; border-radius:9px; }
.final-dose-editor>strong { background:#e7f7f2; color:#09604f; font-size:18px; }
.final-dose-editor>em { background:#fff0e8; color:#8a3415; font-style:normal; font-weight:800; }
.shared-fentanyl-dashboard .dashboard-primary-dose { padding:18px; }
.shared-fentanyl-dashboard .dashboard-dose-answer strong { font-size:42px !important; line-height:1; }
.shared-fentanyl-dashboard .dashboard-dose-answer>span { margin-top:8px; font-size:18px; }
.shared-fentanyl-dashboard .dashboard-dose-answer>span b { font-size:28px; }
.shared-fentanyl-dashboard .dashboard-give-now-inline { min-height:92px; margin-top:14px; }
.shared-fentanyl-dashboard .dashboard-give-now-inline strong { font-size:25px; }
.shared-fentanyl-dashboard .dose-math-always-open { margin:14px 0; }
.shared-fentanyl-dashboard .dose-math-always-open>button { display:none; }
.shared-fentanyl-dashboard .dose-math-box { display:flex; flex-direction:column; gap:6px; padding:16px; border:3px solid #173f56; border-radius:13px; background:#f7fafb; }
.shared-fentanyl-dashboard .dose-math-box small { font-size:10px; font-weight:900; letter-spacing:.12em; }
.shared-fentanyl-dashboard .dose-math-box b { font-size:20px; line-height:1.35; }
.dashboard-more-details,.final-secondary-details { margin:12px 0; overflow:hidden; border:1px solid #cbd9e0; border-radius:10px; background:#fff; }
.dashboard-more-details>summary,.final-secondary-details>summary { padding:14px; color:#365565; font-size:12px; font-weight:900; cursor:pointer; }
.dashboard-more-details>div,.final-secondary-details>div { padding:0 12px 12px; }
.generic-hidden-old-monitoring { display:none; }
@media(max-width:780px){
  .final-selection-review>div>button { min-height:88px; }
  .shared-fentanyl-dashboard .dashboard-dose-answer strong { font-size:38px !important; }
  .shared-fentanyl-dashboard .dashboard-give-now-inline strong { font-size:22px; }
  .shared-fentanyl-dashboard .dose-math-box b { font-size:18px; }
}
'''
if 'Final screen priority: selections, dose, change dose, and math stay large/open.' not in c:
    c+=addon
p.write_text(c)
print('final screen priority pass applied')
