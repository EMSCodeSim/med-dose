from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
imp='import DoseSyringe from "./DoseSyringe";'
if 'import GravityDripCalculator from "./GravityDripCalculator";' not in s:
    s=s.replace(imp,imp+'\nimport GravityDripCalculator from "./GravityDripCalculator";',1)
anchor='''    finalVolumeText=isDopamine?`${fmt(dopamineMlHr)} mL/hr`:showingLinkedDose&&needsConcentration?`${fmt(linkedAmount/conc)} mL`:result?.unit==="mL"?`${fmt(result.dose)} mL`:needsConcentration&&result?`${fmt(result.dose/conc)} mL`:"No volume calculation required",needsConcentrationStep=needsConcentration&&!concConfirmed;'''
replacement='''    finalVolumeText=isDopamine?`${fmt(dopamineMlHr)} mL/hr`:showingLinkedDose&&needsConcentration?`${fmt(linkedAmount/conc)} mL`:result?.unit==="mL"?`${fmt(result.dose)} mL`:needsConcentration&&result?`${fmt(result.dose/conc)} mL`:"No volume calculation required",needsConcentrationStep=needsConcentration&&!concConfirmed,\n    infusionLike=!!path&&(isDopamine||/infusion|drip/i.test(`${selectedRoute} ${path.administration}`));'''
if anchor in s:
    s=s.replace(anchor,replacement,1)
elif 'infusionLike=!!path&&' not in s:
    raise SystemExit('engine derived-state anchor not found')
render_anchor='''        />\n        {result.numeric&&!isDopamine&&!linkedDose&&administrations.length>0&&<div className="final-repeat-dose-action">'''
render='''        />\n        {infusionLike&&<GravityDripCalculator administration={path.administration} route={selectedRoute} calculatedMlHr={isDopamine?dopamineMlHr:undefined}/>}\n        {result.numeric&&!isDopamine&&!linkedDose&&administrations.length>0&&<div className="final-repeat-dose-action">'''
if render_anchor in s:
    s=s.replace(render_anchor,render,1)
elif '<GravityDripCalculator' not in s:
    raise SystemExit('final dashboard render anchor not found')
p.write_text(s)
print('gravity drip UI wired into shared medication engine')
