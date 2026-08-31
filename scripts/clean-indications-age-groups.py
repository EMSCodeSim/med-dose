from pathlib import Path

p=Path('src/MedicationEngine.tsx')
s=p.read_text()

old='''      {step==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is {selectedAgent} being given?</h1><div className="builder-options">{agentPaths.map(x=><button className={path?.id===x.id?"selected":""} key={x.id} onClick={()=>choosePath(x)}><b>{x.label}</b><span>{x.protocol}</span></button>)}</div></>}'''
new='''      {step==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is {selectedAgent} being given?</h1><div className="indication-age-groups">{(["adult","pediatric","all"] as const).map(group=>{const options=agentPaths.filter(x=>x.patient===group);if(!options.length)return null;return <section key={group} className={`indication-age-group ${group}`}><header><b>{group==="adult"?"ADULT":group==="pediatric"?"PEDIATRIC":"ALL AGES"}</b><span>{group==="adult"?"Adult pathway":group==="pediatric"?"Pediatric pathway":"Age-neutral pathway"}</span></header><div className="builder-options">{options.map(x=><button className={path?.id===x.id?"selected":""} key={x.id} onClick={()=>choosePath(x)}><i className={`patient-path-badge ${group}`}>{group==="adult"?"ADULT":group==="pediatric"?"PEDS":"ALL AGES"}</i><b>{cleanIndicationLabel(x.label)}</b><span>{x.protocol}</span></button>)}</div></section>})}</div></>}'''
if old not in s:
    raise SystemExit('indication screen anchor not found')
s=s.replace(old,new,1)

# Final selection review should also show the cleaned indication, since Route now has its own box.
old='''<button className="summary-indication" onClick={()=>{setReturnToResult(true);setStep("indication")}}><small>INDICATION</small><b>{path.label}</b><span>EDIT →</span></button>'''
new='''<button className="summary-indication" onClick={()=>{setReturnToResult(true);setStep("indication")}}><small>INDICATION</small><b>{cleanIndicationLabel(path.label)}</b><span>{path.patient==="adult"?"ADULT • EDIT →":path.patient==="pediatric"?"PEDS • EDIT →":"EDIT →"}</span></button>'''
if old not in s:
    raise SystemExit('final indication summary anchor not found')
s=s.replace(old,new,1)

# Add display-only helper before routesFor.
anchor='''function routesFor(route:string){'''
helper='''function cleanIndicationLabel(label:string){\n  let text=String(label||"").trim();\n  // Route now has its own quick-pick step, so remove route/patient qualifiers from the indication display only.\n  text=text.replace(/\\s*[—-]\\s*(adult|pediatric|peds?)\\s*(iv\\/io drip|iv\\/io|iv|io|im\\/in|im|in|po|odt|nebulized|sublingual)?\\s*$/i,"");\n  text=text.replace(/\\s*[—-]\\s*(iv\\/io drip|iv\\/io|iv|io|im\\/in|im|in|po|odt|nebulized|sublingual|auto-injector)\\s*$/i,"");\n  text=text.replace(/\\s*[—-]\\s*(adult|pediatric|peds?)\\s*$/i,"");\n  return text.trim();\n}\n\n'''
if anchor not in s:
    raise SystemExit('routesFor anchor not found')
s=s.replace(anchor,helper+anchor,1)
p.write_text(s)

css=Path('src/genericMedication.css')
c=css.read_text()
addon=r'''

/* Indication screen: route is selected separately; make Adult vs Pediatric unmistakable. */
.indication-age-groups{display:grid;gap:18px}
.indication-age-group{display:grid;gap:10px;padding:0}
.indication-age-group>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border:2px solid #bccbd4;border-radius:12px;background:#f5f8fa}
.indication-age-group>header b{font-size:15px;letter-spacing:.08em}
.indication-age-group>header span{font-size:11px;font-weight:800;color:#607583}
.indication-age-group.adult>header{border-left:7px solid #145f91}
.indication-age-group.pediatric>header{border-left:7px solid #9a4b75}
.indication-age-group.all>header{border-left:7px solid #55736a}
.indication-age-group .builder-options button{position:relative;padding-top:38px}
.patient-path-badge{position:absolute;top:10px;left:12px;display:inline-flex;align-items:center;min-height:20px;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:1000;font-style:normal;letter-spacing:.09em;background:#e9f1f6;color:#184f70}
.patient-path-badge.pediatric{background:#f7eaf1;color:#7d365d}
.patient-path-badge.all{background:#eaf1ee;color:#3e6257}
@media(max-width:760px){
  .indication-age-groups{gap:14px}
  .indication-age-group>header{padding:9px 11px}
  .indication-age-group>header b{font-size:14px}
  .indication-age-group>header span{font-size:10px}
  .indication-age-group .builder-options button{padding-top:36px}
}
'''
if 'Indication screen: route is selected separately' not in c:
    c += addon
css.write_text(c)
print('Indication labels cleaned and Adult/Pediatric groups added')
