from pathlib import Path

p=Path('src/MedicationEngine.tsx')
s=p.read_text().replace('import type {EncounterPatient} from "./VersedBuilder";','import type {EncounterPatient} from "./encounterTypes";')
p.write_text(s)

for name in ['src/App.tsx','src/DmpMedicationCalculator.tsx','src/FentanylBuilder.tsx','src/VersedBuilder.tsx','src/KetamineBuilder.tsx']:
    path=Path(name)
    if path.exists(): path.unlink()
print('legacy medication engines removed')
