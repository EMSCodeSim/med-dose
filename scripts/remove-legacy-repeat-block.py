from pathlib import Path
import re
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
pattern=r'''\n\s*\{false&&result\.numeric&&!isDopamine&&!linkedDose&&administrations\.length>0&&<div className="final-repeat-dose-action">\s*\n\s*<DoseTracker[^\n]+hideInitialAction/>\s*\n\s*</div>\}'''
s2,n=re.subn(pattern,'',s,count=1)
if n!=1:
    raise SystemExit(f'legacy repeat block removal count={n}')
p.write_text(s2)
print('legacy repeat block removed')
