from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text(); original=s

def once(old,new,label):
    global s
    if old not in s: raise SystemExit(f'missing {label}')
    s=s.replace(old,new,1)

# Indication quick-pick immediately advances to Route.
once('onClick={()=>choosePath(x)}><b>{x.label}</b><span>{x.protocol}</span></button>)}</div>{path&&<button className="continue" onClick={()=>setStep("route")}>Continue to route <span>→</span></button>}',
     'onClick={()=>{choosePath(x);setStep("route")}}><b>{x.label}</b><span>{x.protocol}</span></button>)}</div>', 'indication one click')

# Route quick-pick immediately advances to the next required screen.
once('onClick={()=>setRoute(x)}><b>{x}</b><span>Approved route</span></button>)}</div><button className="continue" disabled={!selectedRoute} onClick={()=>setStep(needsPatientInfo?"patient":"safety")}>Continue to {needsPatientInfo?"patient information":"safety checks"} <span>→</span></button>',
     'onClick={()=>{setRoute(x);setStep(needsPatientInfo?"patient":"safety")}}><b>{x}</b><span>Approved route</span></button>)}</div>', 'route one click')

# Weight quick picks immediately advance when that selection completes all required patient data.
once('onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([])}}',
     'onSelect={(nextKg,source)=>{setWeightUnit("kg");setWeight(String(nextKg));setWeightSource(source);setContraChecks([]);setSpecialChecks([]);const nextEligibility=path?genericEligibilityReason(path,ageChangesDose?ageYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageChangesDose||age!=="")&&!nextEligibility)setStep("safety")}}', 'weight one click')

# Safety master confirmation goes straight to final dose when no Base authorization remains.
once('onChange={e=>{const confirmed=e.target.checked;setContraChecks(Array(contraindications.length).fill(confirmed));setSpecialChecks(Array(specialChecksText.length).fill(confirmed))}}',
     'onChange={e=>{const confirmed=e.target.checked;setContraChecks(Array(contraindications.length).fill(confirmed));setSpecialChecks(Array(specialChecksText.length).fill(confirmed));if(confirmed&&!path.baseContact)showResult()}}', 'safety one click')

# Base authorization final confirmation goes straight to final dose when physician is entered.
once('checked={baseApproved} onChange={e=>setBaseApproved(e.target.checked)}/><span>Direct verbal order received and read back</span>',
     'checked={baseApproved} onChange={e=>{const checked=e.target.checked;setBaseApproved(checked);if(checked&&basePhysician.trim())showResult()}}/><span>Direct verbal order received and read back</span>', 'base one click')

# Remove redundant safety Continue button.
once('<button className="continue" disabled={!safetyComplete} onClick={showResult}>Continue to final dose <span>→</span></button>', '', 'remove safety continue')

# Replace collapsed final review with always-visible editable selection review, and fix Route edit target.
old='''<details className="result-collapsible"><summary>Review entered information</summary><div className="entered-summary"><header><small>ENTERED INFORMATION</small><b>Tap a field to correct it</b></header><div>
          <button onClick={()=>medicationAgents.length>1?setStep("medication"):close()}><small>MEDICATION</small><b>{path.agent}</b></button>
          {needsPatientInfo&&<button onClick={()=>setStep("patient")}><small>PATIENT</small><b>{path.patient==="adult"?"Adult":path.patient==="pediatric"?"Pediatric":"All ages"} • {patientText}</b>{needsWeight&&<span>{fmt(kg)} kg</span>}</button>}
          <button onClick={()=>setStep("indication")}><small>ROUTE</small><b>{selectedRoute}</b></button>
          {needsConcentration&&<button onClick={()=>setStep("concentration")}><small>CONCENTRATION</small><b>{fieldConcentration?.label||`${fmt(conc)} ${result.unit}/mL`}</b><span>Admin-controlled • field confirmed</span></button>}
          <button className="summary-indication" onClick={()=>setStep("indication")}><small>INDICATION</small><b>{path.label}</b></button>
          {result.numeric&&<><span className="summary-result"><small>PROTOCOL DOSE</small><b>{isDopamine?"5–20 mcg/kg/min":result.text}</b></span><span className="summary-result primary"><small>CALCULATED RESULT</small><b>{isDopamine?`${fmt(dopamineMlHr)} mL/hr at ${dopamineRate} mcg/kg/min`:`${fmt(result.dose)} ${result.unit}${needsConcentration?` • ${fmt(result.dose/conc)} mL`:""}`}</b></span></>}
        </div><button className="generic-protocol-link" onClick={openProtocol}>Medication {medication.protocolId} ↗</button></div></details>'''
new='''<section className="entered-summary final-selection-review"><header><small>FINAL CROSS-CHECK</small><b>Tap any field to change only that selection</b></header><div>
          <button onClick={()=>medicationAgents.length>1?setStep("medication"):close()}><small>MEDICATION</small><b>{path.agent}</b><span>{medicationAgents.length>1?"Tap to change agent":"Tap to choose a different medication"}</span></button>
          <button onClick={()=>agentNeedsConcentration&&setStep("concentration")} disabled={!agentNeedsConcentration}><small>CONCENTRATION</small><b>{agentNeedsConcentration?(customConcentrationMode?`${fmt(conc)} ${concentrationUnit}/mL • Custom`:fieldConcentration?.label||`${fmt(conc)} ${concentrationUnit}/mL`):"Not required"}</b><span>{agentNeedsConcentration?"Tap to change":"No concentration needed for this medication"}</span></button>
          <button className="summary-indication" onClick={()=>setStep("indication")}><small>INDICATION</small><b>{path.label}</b><span>Tap to change</span></button>
          <button onClick={()=>setStep("route")}><small>ROUTE</small><b>{selectedRoute}</b><span>Tap to change</span></button>
          <button onClick={()=>needsPatientInfo&&setStep("patient")} disabled={!needsPatientInfo}><small>PATIENT</small><b>{needsPatientInfo?`${path.patient==="adult"?"Adult":path.patient==="pediatric"?"Pediatric":"All ages"} • ${patientText}`:"No dose-changing patient entry"}</b>{needsWeight&&<span>{fmt(kg)} kg • Tap to change</span>}</button>
          <button onClick={()=>setStep("safety")}><small>SAFETY</small><b>{safetyComplete?"All required checks confirmed":"Review required"}</b><span>Tap to review or change</span></button>
          {result.numeric?<><span className="summary-result"><small>PROTOCOL DOSE</small><b>{isDopamine?"5–20 mcg/kg/min":result.text}</b></span><span className="summary-result primary"><small>FINAL CALCULATED RESULT</small><b>{isDopamine?`${fmt(dopamineMlHr)} mL/hr at ${dopamineRate} mcg/kg/min`:`${fmt(result.dose)} ${result.unit}${needsConcentration?` • ${fmt(result.dose/conc)} mL`:""}`}</b></span></>:<span className="summary-result primary"><small>FINAL TREATMENT</small><b>{result.text}</b></span>}
        </div><button className="generic-protocol-link" onClick={openProtocol}>Medication {medication.protocolId} ↗</button></section>'''
once(old,new,'final visible review')

if s==original: raise SystemExit('no changes')
p.write_text(s)
print('one-click quick picks and visible editable final cross-check installed')
