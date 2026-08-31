from pathlib import Path
p=Path('src/DmpMedicationCalculator.tsx')
s=p.read_text(); original=s
repls=[
('selectedAgentPaths=medication.paths.filter(x=>x.agent===selectedAgent),agentHasConcentration=selectedAgentPaths.some(pathUsesConcentration)&&!!fieldConcentration,agentRequiresConcentration=', 'selectedAgentPaths=medication.paths.filter(x=>x.agent===selectedAgent),agentNeedsConcentration=selectedAgentPaths.some(pathUsesConcentration),agentHasConcentration=agentNeedsConcentration&&!!fieldConcentration,agentRequiresConcentration='),
('...(agentHasConcentration?["concentration" as Step]:[])', '...(agentNeedsConcentration?["concentration" as Step]:[])'),
('complete:agentHasConcentration&&concConfirmed,notRequired:!agentHasConcentration,active:step==="concentration",available:medConfirmed,onClick:()=>agentHasConcentration&&setStep("concentration")', 'complete:agentNeedsConcentration&&!!fieldConcentration&&concConfirmed,notRequired:!agentNeedsConcentration,active:step==="concentration",available:medConfirmed,onClick:()=>agentNeedsConcentration&&setStep("concentration")'),
('available:medConfirmed&&(!agentHasConcentration||concConfirmed)', 'available:medConfirmed&&(!agentNeedsConcentration||(!!fieldConcentration&&concConfirmed))'),
('available:patientComplete,onClick:()=>setStep("safety")', 'available:patientComplete&&(!agentNeedsConcentration||concConfirmed),onClick:()=>setStep("safety")'),
('available:safetyComplete,onClick:()=>setStep("result")', 'available:safetyComplete&&(!agentNeedsConcentration||concConfirmed),onClick:()=>setStep("result")'),
('calculationComplete={step==="result"&&safetyComplete}', 'calculationComplete={step==="result"&&safetyComplete&&(!agentNeedsConcentration||concConfirmed)}'),
('onClick={()=>setStep(agentHasConcentration?"concentration":"indication")}>Continue to {agentHasConcentration?"concentration":"indication"}', 'onClick={()=>setStep(agentNeedsConcentration?"concentration":"indication")}>Continue to {agentNeedsConcentration?"concentration":"indication"}')
]
for old,new in repls:
    if old not in s: raise SystemExit(f'missing target: {old[:80]}')
    s=s.replace(old,new,1)
if s==original: raise SystemExit('no changes')
p.write_text(s)
print('guarded missing concentrations')
