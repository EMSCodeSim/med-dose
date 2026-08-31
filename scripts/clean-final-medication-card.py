from pathlib import Path

# Shared dashboard becomes the single dominant dose/GIVE NOW card only.
p=Path('src/FentanylDoseDashboard.tsx')
s=p.read_text()
start=s.index('export default function FentanylDoseDashboard')
new_component='''export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive}:Props){
  return <section className="shared-fentanyl-dashboard final-dose-card" aria-label={`Final ${medication} dose`}>
    <section className={ready?"dashboard-primary-dose ready":"dashboard-primary-dose pending"}>
      <small>FINAL DOSE</small>
      {previewReady?<>
        <div className="dashboard-dose-answer"><strong>GIVE {dose||"—"}</strong>{volume&&<span>DRAW <b>{volume}</b></span>}</div>
        {doseDetail&&<p>{doseDetail}</p>}
        {showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}
      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}
    </section>
  </section>;
}
'''
s=s[:start]+new_component
# DoseSyringe import is no longer needed in this presentation-only component.
s=s.replace('import DoseSyringe from "./DoseSyringe";\n\n','')
p.write_text(s)

# Medication engine owns edit strip, actions, math, and the one details collapse.
p=Path('src/MedicationEngine.tsx')
s=p.read_text(); original=s
if 'import DoseSyringe from "./DoseSyringe";' not in s:
    s=s.replace('import FentanylDoseDashboard from "./FentanylDoseDashboard";','import FentanylDoseDashboard from "./FentanylDoseDashboard";\nimport DoseSyringe from "./DoseSyringe";')

s=s.replace('[returnToResult,setReturnToResult]=useState(false),[editingFinalDose,setEditingFinalDose]=useState(false);','[returnToResult,setReturnToResult]=useState(false),[editingFinalDose,setEditingFinalDose]=useState(false),[showFinalMath,setShowFinalMath]=useState(true);',1)

# Compact edit grid wording and remove protocol link from the primary surface.
s=s.replace('<section className="entered-summary final-selection-review"><header><small>FINAL CROSS-CHECK</small><b>Tap a selection to edit it</b></header><div>','<section className="entered-summary final-selection-review final-edit-grid"><header><small>SELECTIONS</small><b>Tap any box to edit</b></header><div>',1)
s=s.replace('</div><button className="generic-protocol-link" onClick={openProtocol}>Medication {medication.protocolId} ↗</button></section>','</div></section>',1)

# Remove old standalone change-dose card. It will become one half of the action row.
old_start='{result.numeric&&!isDopamine&&!linkedDose&&<section className="final-change-dose">'
idx=s.find(old_start)
if idx==-1: raise SystemExit('old change-dose section not found')
end=s.find('</section>}',idx)+len('</section>}')
s=s[:idx]+s[end:]

# Remove doseDetail duplication from the primary card.
s=s.replace('doseDetail={patientText?`${patientText} • ${path.label}`:path.label}','doseDetail={undefined}',1)

# After the dashboard, add two big controls, live math, and one details wrapper.
dash_end='''          recorded={administrations.length?{count:administrations.length,detail:`${fmt(totalDose)} ${result.numeric?result.unit:"treatments"} recorded`}:null}
        />'''
if dash_end not in s: raise SystemExit('dashboard end marker not found')
action='''          recorded={administrations.length?{count:administrations.length,detail:`${fmt(totalDose)} ${result.numeric?result.unit:"treatments"} recorded`}:null}
        />
        <div className="final-action-row">
          {result.numeric&&!isDopamine&&!linkedDose&&<button type="button" className={editingFinalDose?"active":""} onClick={()=>setEditingFinalDose(x=>!x)}><small>CHANGE DOSE</small><strong>{editingFinalDose?"CLOSE EDITOR":"CHANGE AMOUNT"}</strong></button>}
          {result.numeric&&<button type="button" className={showFinalMath?"active":""} onClick={()=>setShowFinalMath(x=>!x)}><small>MATH</small><strong>{showFinalMath?"HIDE MATH":"SHOW MATH"}</strong></button>}
        </div>
        {editingFinalDose&&result.numeric&&!isDopamine&&!linkedDose&&<div className="final-dose-editor"><label><span>Amount to give</span><div><input autoFocus inputMode="decimal" value={actual} onChange={e=>setActual(e.target.value)} /><b>{result.unit}</b></div></label><button type="button" onClick={()=>{setActual(String(result.minDose||result.dose));setEditingFinalDose(false)}}>Use calculated dose</button>{actualDose>0&&actualDose<=doseMaximum?<strong>{needsConcentration?`Draw ${fmt(actualDose/conc)} mL`:`Give ${fmt(actualDose)} ${result.unit}`}</strong>:<em>Enter more than 0 and no more than {fmt(doseMaximum)} {result.unit}.</em>}</div>}
        {showFinalMath&&result.numeric&&<section className="final-math-line"><small>DOSE MATH</small><strong>{isDopamine?`${fmt(kg)} kg × ${dopamineRate} mcg/kg/min = ${fmt(dopamineTotal)} mcg/min → ${fmt(dopamineMlHr)} mL/hr`:needsConcentration?`${fmt(actualDose>0?actualDose:result.dose)} ${result.unit} ÷ ${fmt(conc)} ${result.unit}/mL = ${fmt((actualDose>0?actualDose:result.dose)/conc)} mL`:needsWeight?`${fmt(kg)} kg → ${fmt(actualDose>0?actualDose:result.dose)} ${result.unit}`:`Protocol dose = ${fmt(actualDose>0?actualDose:result.dose)} ${result.unit}`}</strong></section>}
        <details className="final-all-details"><summary>MORE DETAILS</summary><div className="final-all-details-body">
          {!isDopamine&&needsConcentration&&result.numeric&&<DoseSyringe volume={(actualDose>0?actualDose:result.dose)/conc}/>} 
          <section className="administration-special"><small>ADMINISTRATION</small><div><span><b>Route</b>{selectedRoute}</span><span className="wide"><b>How to give</b>{path.administration}</span><span className="wide"><b>Repeat / reassess</b>{path.repeat}</span></div></section>
          {administrations.length>0&&<div className="dashboard-recorded"><b>✓ {administrations.length} dose{administrations.length===1?"":"s"} recorded</b><span>{fmt(totalDose)} {result.numeric?result.unit:"treatments"} recorded</span></div>}
          {additionalAdjustment&&<div className="generic-dose-adjustment"><b>MEDICATION-SPECIFIC ADJUSTMENT</b><span>{additionalAdjustment}</span></div>}
          <div className="monitoring-cautions"><small>MONITORING</small><ul>{monitoring.map(x=><li key={x}>{x}</li>)}</ul></div>
          <button className="generic-protocol-link" onClick={openProtocol}>Medication {medication.protocolId} ↗</button>'''
s=s.replace(dash_end,action,1)

# Existing secondary content remains functional but now lives under the single top-level More Details collapse.
new_calc_idx=s.find('        {result.numeric?(isDopamine?', s.find('<details className="final-all-details">'))
if new_calc_idx==-1: raise SystemExit('dose tracker block not found')
# Hide/remove redundant clinical detail wrappers before dose tracker; their useful content is already rendered above.
segment_start=s.find('        <details className="result-collapsible final-secondary-details">', s.find('<details className="final-all-details">'))
if segment_start!=-1 and segment_start<new_calc_idx:
    s=s[:segment_start]+s[new_calc_idx:]

# Close the single details container immediately before the final close button.
close_marker='        <button className="new-calc" onClick={close}>'
if close_marker not in s: raise SystemExit('new calc marker not found')
s=s.replace(close_marker,'        </div></details>\n'+close_marker,1)

# Any nested calculation/details controls inside MORE DETAILS should render open without another accordion layer.
s=s.replace('<details className="calculation-details">','<details className="calculation-details" open>',1)

p.write_text(s)

# Final visual hierarchy.
p=Path('src/genericMedication.css')
c=p.read_text()
addon=r'''

/* Clean final medication card: edit grid, one dose card, two actions, one details drawer. */
.final-edit-grid { margin-bottom:12px; }
.final-edit-grid > header { padding:10px 12px; }
.final-edit-grid > div { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:8px; }
.final-edit-grid > div > button { min-height:74px; padding:10px 34px 10px 11px; }
.final-edit-grid button b { font-size:13px; }
.final-edit-grid button span { margin-top:5px; font-size:9px; }
.final-dose-card { margin:0; border:0; box-shadow:none; }
.final-dose-card .dashboard-primary-dose { margin:0; padding:20px 16px; border:3px solid #0b6f5b; border-radius:16px; background:#f1fbf8; text-align:center; }
.final-dose-card .dashboard-primary-dose>small { display:block; margin-bottom:10px; font-size:10px; font-weight:900; letter-spacing:.14em; }
.final-dose-card .dashboard-dose-answer strong { display:block; font-size:44px !important; line-height:1; }
.final-dose-card .dashboard-dose-answer>span { display:block; margin-top:10px; font-size:18px; font-weight:800; }
.final-dose-card .dashboard-dose-answer>span b { font-size:30px; }
.final-dose-card .dashboard-give-now-inline { width:100%; min-height:88px; margin-top:16px; border-radius:12px; }
.final-dose-card .dashboard-give-now-inline strong { font-size:24px; }
.final-action-row { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:12px 0; }
.final-action-row>button { min-height:72px; padding:10px; border:2px solid #9fbac8; border-radius:12px; background:#fff; color:#173f56; text-align:left; }
.final-action-row>button.active { border-color:#0873b5; background:#edf8fe; }
.final-action-row small,.final-action-row strong { display:block; }
.final-action-row small { font-size:9px; font-weight:900; letter-spacing:.11em; color:#607b89; }
.final-action-row strong { margin-top:4px; font-size:16px; }
.final-math-line { margin:10px 0 12px; padding:16px; border:3px solid #173f56; border-radius:13px; background:#f7fafb; }
.final-math-line small,.final-math-line strong { display:block; }
.final-math-line small { font-size:9px; font-weight:900; letter-spacing:.12em; color:#5b7180; }
.final-math-line strong { margin-top:6px; font-size:20px; line-height:1.35; color:#173f56; }
.final-all-details { margin:12px 0; overflow:hidden; border:1px solid #c8d8df; border-radius:12px; background:#fff; }
.final-all-details>summary { padding:15px; cursor:pointer; color:#365565; font-size:12px; font-weight:900; letter-spacing:.06em; }
.final-all-details-body { padding:0 12px 12px; }
.final-all-details .result-collapsible,.final-all-details .generic-hidden-old-monitoring { display:none !important; }
.final-all-details .calculation-details { margin-top:10px; border:0; }
.final-all-details .calculation-details>summary { display:none; }
.final-all-details .calculation-details>div { display:block; }
@media(max-width:780px){
  .final-edit-grid>div { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .final-edit-grid>div>button { min-height:78px; }
  .final-dose-card .dashboard-dose-answer strong { font-size:40px !important; }
  .final-dose-card .dashboard-dose-answer>span b { font-size:27px; }
  .final-action-row>button { min-height:68px; }
  .final-math-line strong { font-size:18px; }
}
'''
if 'Clean final medication card: edit grid, one dose card, two actions, one details drawer.' not in c:
    c+=addon
p.write_text(c)
print('clean final medication card applied')
