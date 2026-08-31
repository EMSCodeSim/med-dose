from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
# Locate the action block currently inside MORE DETAILS, from numeric handling through nonnumeric treatment.
start='''        {result.numeric?(isDopamine?<div className="generic-summary dopamine-infusion">'''
end='''</button>}\n        {result.numeric&&<details className="calculation-details" open>'''
si=s.find(start)
ei=s.find(end,si)
if si<0 or ei<0:
    raise SystemExit('administration action block not found')
block=s[si:ei+len('</button>}')]
# Remove it from MORE DETAILS.
s=s[:si]+s[ei+len('</button>}'):]
# Insert immediately after shared dashboard, before Change Dose / Math row.
anchor='''        />\n        <div className="final-action-row">'''
if anchor not in s:
    raise SystemExit('dashboard insertion anchor not found')
s=s.replace(anchor,'''        />\n        <section className="final-primary-administration-actions" aria-label="Medication administration actions">\n'''+block+'''\n        </section>\n        <div className="final-action-row">''',1)
p.write_text(s)

p=Path('src/genericMedication.css')
c=p.read_text()
addon='''\n\n/* Medication administration controls are never hidden in More Details. */\n.final-primary-administration-actions { width:100%; margin:8px 0 10px; }\n.final-primary-administration-actions:empty { display:none; }\n.final-primary-administration-actions .generic-summary { margin:0; }\n.final-primary-administration-actions .initial-record-dose { width:100%; min-height:74px; }\n@media(max-width:760px){\n  .final-primary-administration-actions { margin:6px 0 8px; }\n  .final-primary-administration-actions .initial-record-dose { min-height:68px; }\n}\n'''
if 'Medication administration controls are never hidden in More Details.' not in c:
    c+=addon
p.write_text(c)
print('all give/record administration actions moved above More Details')
