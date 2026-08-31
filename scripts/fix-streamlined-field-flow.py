from pathlib import Path
p=Path('src/DmpMedicationCalculator.tsx')
s=p.read_text(); original=s
repls=[
('const visibleSteps:Step[]=["medication",...(agentNeedsConcentration?["concentration" as Step]:[]),"indication","route",...(needsPatientInfo?["patient" as Step]:[]),"safety","result"]', 'const visibleSteps:Step[]=[...(medicationAgents.length>1?["medication" as Step]:[]),...(agentNeedsConcentration?["concentration" as Step]:[]),"indication","route",...(needsPatientInfo?["patient" as Step]:[]),"safety","result"]'),
('available:medConfirmed&&(!agentNeedsConcentration||(!!fieldConcentration&&concConfirmed))', 'available:medConfirmed&&(!agentNeedsConcentration||(conc>0&&concConfirmed))')
]
for old,new in repls:
    if old not in s: raise SystemExit(f'missing: {old}')
    s=s.replace(old,new,1)
if s==original: raise SystemExit('no changes')
p.write_text(s)
print('fixed custom concentration gate and single-agent navigation')
