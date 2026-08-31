from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text(); original=s

def once(old,new,label):
    global s
    if old not in s: raise SystemExit(f'missing {label}')
    s=s.replace(old,new,1)

# Make cross-check show only fields that actually matter and remove duplicate dose/result tiles.
once('''          <button onClick={()=>{if(agentNeedsConcentration){setReturnToResult(true);setStep("concentration")}}} disabled={!agentNeedsConcentration}><small>CONCENTRATION</small><b>{agentNeedsConcentration?(customConcentrationMode?`${fmt(conc)} ${concentrationUnit}/mL • Custom`:fieldConcentration?.label||`${fmt(conc)} ${concentrationUnit}/mL`):"Not required"}</b><span>{agentNeedsConcentration?"EDIT CONCENTRATION →":"No concentration needed"}</span></button>''',
'''          {agentNeedsConcentration&&<button onClick={()=>{setReturnToResult(true);setStep("concentration")}}><small>CONCENTRATION</small><b>{customConcentrationMode?`${fmt(conc)} ${concentrationUnit}/mL • Custom`:fieldConcentration?.label||`${fmt(conc)} ${concentrationUnit}/mL`}</b><span>EDIT →</span></button>}''','concentration compact')
once('''          <button onClick={()=>{if(needsPatientInfo){setReturnToResult(true);setStep("patient")}}} disabled={!needsPatientInfo}><small>PATIENT</small><b>{needsPatientInfo?`${path.patient==="adult"?"Adult":path.patient==="pediatric"?"Pediatric":"All ages"} • ${patientText}`:"No dose-changing patient entry"}</b>{needsWeight&&<span>{fmt(kg)} kg • EDIT PATIENT →</span>}</button>''',
'''          {needsPatientInfo&&<button onClick={()=>{setReturnToResult(true);setStep("patient")}}><small>PATIENT</small><b>{path.patient==="adult"?"Adult":path.patient==="pediatric"?"Pediatric":"All ages"} • {patientText}</b><span>{needsWeight?`${fmt(kg)} kg • EDIT →`:"EDIT →"}</span></button>}''','patient compact')
once('''          <button onClick={()=>{setReturnToResult(true);setStep("safety")}}><small>SAFETY</small><b>{safetyComplete?"All required checks confirmed":"Review required"}</b><span>EDIT SAFETY →</span></button>
          {result.numeric?<><span className="summary-result"><small>PROTOCOL DOSE</small><b>{isDopamine?"5–20 mcg/kg/min":result.text}</b></span><span className="summary-result primary"><small>FINAL CALCULATED RESULT</small><b>{isDopamine?`${fmt(dopamineMlHr)} mL/hr at ${dopamineRate} mcg/kg/min`:`${fmt(result.dose)} ${result.unit}${needsConcentration?` • ${fmt(result.dose/conc)} mL`:""}`}</b></span></>:<span className="summary-result primary"><small>FINAL TREATMENT</small><b>{result.text}</b></span>}''',
'''          {(contraindications.length>0||specialChecksText.length>0||!!path.baseContact)&&<button onClick={()=>{setReturnToResult(true);setStep("safety")}}><small>SAFETY</small><b>{safetyComplete?"Confirmed":"Review required"}</b><span>EDIT →</span></button>}''','remove duplicate result tiles')

# Shorter action labels in the remaining cross-check cards.
s=s.replace('EDIT MEDICATION →','EDIT →').replace('CHANGE MEDICATION →','CHANGE →').replace('EDIT INDICATION →','EDIT →').replace('EDIT ROUTE →','EDIT →')

# Remove the second full cross-check and documentation reminder panels; information already exists above or in report workflow.
start=s.find('<details className="full-cross-check">')
if start==-1: raise SystemExit('full cross-check not found')
end=s.find('</details>',start)+len('</details>')
s=s[:start]+s[end:]
start=s.find('<details className="result-collapsible"><summary>Documentation reminders</summary>')
if start==-1: raise SystemExit('documentation reminders not found')
end=s.find('</details>',start)+len('</details>')
s=s[:start]+s[end:]

# Clarify compact cross-check header.
s=s.replace('Review selections below — tap any EDIT button to jump directly to that field','Tap a selection to edit it')
p.write_text(s)

css=Path('src/genericMedication.css')
c=css.read_text()
addon='''\n\n/* Simplified final screen: compact editable selections above the dose action. */\n.final-selection-review > header { padding:10px 12px; }\n.final-selection-review > header b { font-size:11px; }\n.final-selection-review > div { gap:6px; padding:8px; }\n.final-selection-review > div > button { min-height:64px; padding:9px 32px 9px 10px; }\n.final-selection-review button b { font-size:12px; }\n.final-selection-review button span { margin-top:4px; font-size:8px; }\n@media (min-width:781px){.final-selection-review > div{grid-template-columns:repeat(3,minmax(0,1fr));}}\n'''
if 'Simplified final screen: compact editable selections' not in c: c+=addon
css.write_text(c)
print('simplified final medication screen')
