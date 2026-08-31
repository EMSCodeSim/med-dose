from pathlib import Path

p=Path('src/MedicationEngine.tsx')
s=p.read_text()

start=s.index('<section className="entered-summary final-selection-review">')
end=s.index('</section>',start)+len('</section>')
block=s[start:end]
s=s[:start]+s[end:]

block=block.replace('<header><small>FINAL CROSS-CHECK</small><b>Tap any field to change only that selection</b></header>', '<header><small>FINAL CROSS-CHECK</small><b>Review selections below — tap any EDIT button to jump directly to that field</b></header>')
block=block.replace('<span>{medicationAgents.length>1?"Tap to change agent":"Tap to choose a different medication"}</span>', '<span>{medicationAgents.length>1?"EDIT MEDICATION →":"CHANGE MEDICATION →"}</span>')
block=block.replace('<span>{agentNeedsConcentration?"Tap to change":"No concentration needed for this medication"}</span>', '<span>{agentNeedsConcentration?"EDIT CONCENTRATION →":"No concentration needed"}</span>')
block=block.replace('<span>Tap to change</span></button>\n          <button onClick={()=>setStep("route")}>', '<span>EDIT INDICATION →</span></button>\n          <button onClick={()=>setStep("route")}>',1)
block=block.replace('<span>Tap to change</span></button>\n          <button onClick={()=>needsPatientInfo', '<span>EDIT ROUTE →</span></button>\n          <button onClick={()=>needsPatientInfo',1)
block=block.replace('{needsWeight&&<span>{fmt(kg)} kg • Tap to change</span>}', '{needsWeight&&<span>{fmt(kg)} kg • EDIT PATIENT →</span>}')
block=block.replace('<span>Tap to review or change</span>', '<span>EDIT SAFETY →</span>')

anchor='{step==="result"&&path&&result&&<>\n        <FentanylDoseDashboard'
if anchor not in s:
    raise SystemExit('result dashboard anchor not found')
s=s.replace(anchor,'{step==="result"&&path&&result&&<>\n        '+block+'\n        <FentanylDoseDashboard',1)
p.write_text(s)

css=Path('src/genericMedication.css')
c=css.read_text()
addon='''\n\n/* Final screen: make the cross-check the primary navigation surface. */\n.final-selection-review {\n  margin: 0 0 14px;\n  border: 2px solid #0873b5;\n  border-radius: 14px;\n  overflow: hidden;\n  background: #fff;\n}\n.final-selection-review > header {\n  padding: 13px 14px;\n  background: #eaf6fd;\n  border-bottom: 1px solid #c5dfea;\n}\n.final-selection-review > header small,\n.final-selection-review > header b { display:block; }\n.final-selection-review > header small { color:#0873b5; font-size:10px; font-weight:900; letter-spacing:.11em; }\n.final-selection-review > header b { margin-top:4px; color:#294b5f; font-size:12px; line-height:1.35; }\n.final-selection-review > div { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:10px; }\n.final-selection-review > div > button {\n  position:relative;\n  min-height:86px;\n  padding:11px 36px 11px 12px;\n  border:2px solid #b9d2df;\n  border-radius:10px;\n  background:#fff;\n  color:#173f56;\n  text-align:left;\n  cursor:pointer;\n}\n.final-selection-review > div > button:not(:disabled):hover,\n.final-selection-review > div > button:not(:disabled):active { border-color:#0873b5; background:#f0f9fe; }\n.final-selection-review > div > button:not(:disabled)::after {\n  content:'›';\n  position:absolute;\n  right:12px;\n  top:50%;\n  transform:translateY(-50%);\n  color:#0873b5;\n  font-size:30px;\n  font-weight:900;\n}\n.final-selection-review button small,\n.final-selection-review button b,\n.final-selection-review button span { display:block; }\n.final-selection-review button small { color:#627a88; font-size:8px; font-weight:900; letter-spacing:.1em; }\n.final-selection-review button b { margin-top:3px; font-size:13px; line-height:1.25; }\n.final-selection-review button span { margin-top:7px; color:#0873b5; font-size:9px; font-weight:900; letter-spacing:.04em; }\n.final-selection-review button:disabled { opacity:.65; cursor:default; }\n.final-selection-review .summary-result { padding:11px 12px; border-radius:10px; background:#eef3f6; }\n.final-selection-review .summary-result.primary { background:#e7f7f2; }\n.final-selection-review .generic-protocol-link { border-top:1px solid #d5e3ea; padding:10px 12px; }\n@media (max-width:780px){\n  .final-selection-review > div { grid-template-columns:1fr; }\n  .final-selection-review > div > button { min-height:76px; }\n}\n'''
if '.final-selection-review {' not in c:
    c += addon
else:
    raise SystemExit('final-selection-review styles already exist')
css.write_text(c)
print('moved final cross-check above dashboard and made edit cards obvious')
