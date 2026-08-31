from pathlib import Path

p=Path('src/MedicationEngine.tsx')
s=p.read_text()
old='''{step==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is {selectedAgent} being given?</h1><div className="indication-age-groups">{(["adult","pediatric","all"] as const).map(group=>{const options=agentPaths.filter(x=>x.patient===group);if(!options.length)return null;return <section key={group} className={`indication-age-group ${group}`}><header><b>{group==="adult"?"ADULT":group==="pediatric"?"PEDIATRIC":"ALL AGES"}</b><span>{group==="adult"?"Adult pathway":group==="pediatric"?"Pediatric pathway":"Age-neutral pathway"}</span></header><div className="builder-options">{options.map(x=><button className={path?.id===x.id?"selected":""} key={x.id} onClick={()=>choosePath(x)}><i className={`patient-path-badge ${group}`}>{group==="adult"?"ADULT":group==="pediatric"?"PEDS":"ALL AGES"}</i><b>{cleanIndicationLabel(x.label)}</b><span>{x.protocol}</span></button>)}</div></section>})}</div></>}'''
new='''{step==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is {selectedAgent} being given?</h1><div className="indication-age-groups">{(["adult","pediatric","all"] as const).map(group=>{const options=agentPaths.filter(x=>x.patient===group);if(!options.length)return null;return <section key={group} className={`indication-age-group ${group}`}><header><b>{group==="adult"?"ADULT":group==="pediatric"?"PEDIATRIC":"ALL AGES"}</b></header><div className="builder-options">{options.map(x=><button className={path?.id===x.id?"selected":""} key={x.id} onClick={()=>choosePath(x)}><b>{cleanIndicationLabel(x.label)}</b><span>{x.protocol}</span></button>)}</div></section>})}</div></>}'''
if old not in s:
    raise SystemExit('indication age group anchor not found')
s=s.replace(old,new,1)
p.write_text(s)

css=Path('src/genericMedication.css')
c=css.read_text()
addon=r'''

/* Simplified age sections: one clear heading, no badges covering indication text. */
.indication-age-group .patient-path-badge{display:none !important}
.indication-age-group .builder-options button{padding-top:18px !important}
.indication-age-group>header{min-height:54px;justify-content:flex-start !important;padding:12px 16px !important;background:#fff !important}
.indication-age-group>header b{font-size:20px !important;font-weight:1000 !important;letter-spacing:.08em !important;color:#173f56 !important}
.indication-age-group.adult>header{border:2px solid #8db6cc !important;border-left:8px solid #126b9b !important}
.indication-age-group.pediatric{margin-top:12px !important}
.indication-age-group.pediatric>header{border:2px solid #c8a8b9 !important;border-left:8px solid #a64676 !important}
.indication-age-group.pediatric>header b{color:#7d365d !important}
.indication-age-group.all>header{border-left:8px solid #55736a !important}
@media(max-width:760px){
  .indication-age-group>header{min-height:50px;padding:10px 14px !important}
  .indication-age-group>header b{font-size:18px !important}
  .indication-age-group .builder-options button{padding-top:14px !important}
}
'''
if 'Simplified age sections: one clear heading' not in c:
    c += addon
css.write_text(c)
print('Simplified Adult/Pediatric indication sections')
