from pathlib import Path

src=Path('src/DmpMedicationCalculator.tsx').read_text()
src=src.replace('export default function DmpMedicationCalculator(', 'export default function MedicationEngine(', 1)
Path('src/MedicationEngine.tsx').write_text(src)

p=Path('src/FieldToolbar.tsx')
s=p.read_text().replace('import type { GenericTreatmentContext } from "./DmpMedicationCalculator";','import type { GenericTreatmentContext } from "./MedicationEngine";')
p.write_text(s)

p=Path('src/main.tsx')
s=p.read_text().replace('import Home from "./App";','import Home from "./UnifiedApp";')
p.write_text(s)

print('installed one medication engine runtime')
