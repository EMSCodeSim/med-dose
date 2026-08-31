from pathlib import Path
p=Path('src/DmpMedicationCalculator.tsx')
s=p.read_text()
old='concentrationUnit=agentConcentrationPath?.formula.kind!=="instruction"?agentConcentrationPath?.formula.unit:"mg",\n    conc=fieldConcentration?concentrationInUnit(fieldConcentration,concentrationUnit):0'
new='concentrationUnit=(agentConcentrationPath?.formula.kind!=="instruction"?agentConcentrationPath?.formula.unit:"mg")||"mg",\n    conc=fieldConcentration?concentrationInUnit(fieldConcentration,concentrationUnit):0'
if old not in s: raise SystemExit('unit fallback target missing')
p.write_text(s.replace(old,new,1))
print('added concentration unit fallback')
