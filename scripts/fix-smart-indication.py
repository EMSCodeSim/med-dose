from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
old='onClick={()=>{choosePath(x);setStep("route")}}><b>{x.label}</b><span>{x.protocol}</span></button>)}</div>'
new='onClick={()=>choosePath(x)}><b>{x.label}</b><span>{x.protocol}</span></button>)}</div>'
if old not in s: raise SystemExit('smart indication override not found')
p.write_text(s.replace(old,new,1))
print('indication now delegates next-step decision to smart engine')
