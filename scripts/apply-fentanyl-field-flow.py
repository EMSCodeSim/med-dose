from pathlib import Path
import re

p=Path('src/DmpMedicationCalculator.tsx')
s=p.read_text()
original=s

def once(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing {label}')
    s=s.replace(old,new,1)

once('import WeightQuickSelect from "./WeightQuickSelect";\n', 'import WeightQuickSelect from "./WeightQuickSelect";\nimport {commonEmsConcentrationsFor} from "./emsMedicationDefaults";\nimport {loadClinicalOverrides} from "./adminMedicationStore";\n', 'imports')
once('type Step="medication"|"indication"|"patient"|"concentration"|"safety"|"result";', 'type Step="medication"|"concentration"|"indication"|"route"|"patient"|"safety"|"result";\ntype FieldConcentration={label?:string;amount?:number;amountUnit?:string;volume?:number;volumeUnit?:string;concentration?:number;concentrationUnit?:string};', 'step type')
once('    [route,setRoute]=useState(""),[vialAmount,setVialAmount]=useState(""),[vialVolume,setVialVolume]=useState(""),[medConfirmed,setMedConfirmed]=useState(false),[concConfirmed,setConcConfirmed]=useState(false),', '    [route,setRoute]=useState(""),[medConfirmed,setMedConfirmed]=useState(false),[concConfirmed,setConcConfirmed]=useState(false),', 'concentration state')
once('  const isDopamine=medication.id==="dopamine",', '  const fieldConcentration=useMemo(()=>fieldConcentrationFor(medication.id),[medication.id]);\n  const isDopamine=medication.id==="dopamine",', 'field concentration memo')
once('    selectedAgentPaths=medication.paths.filter(x=>x.agent===selectedAgent),agentHasConcentration=selectedAgentPaths.some(pathUsesConcentration),agentRequiresConcentration=selectedAgentPaths.length>0&&selectedAgentPaths.every(pathRequiresConcentration),concentrationStarted=vialAmount!==""||vialVolume!=="",', '    selectedAgentPaths=medication.paths.filter(x=>x.agent===selectedAgent),agentHasConcentration=selectedAgentPaths.some(pathUsesConcentration)&&!!fieldConcentration,agentRequiresConcentration=selectedAgentPaths.length>0&&selectedAgentPaths.every(pathRequiresConcentration),', 'agent concentration flags')
once('    concentrationUnit=agentConcentrationPath?.formula.kind!=="instruction"?agentConcentrationPath?.formula.unit:"mg",inputDrugUnit=isDopamine?"mg":concentrationUnit,inputUnitMultiplier=isDopamine?1000:1,\n    conc=Number(vialAmount)*inputUnitMultiplier/Number(vialVolume),eligibilityAge=', '    concentrationUnit=agentConcentrationPath?.formula.kind!=="instruction"?agentConcentrationPath?.formula.unit:"mg",\n    conc=fieldConcentration?concentrationInUnit(fieldConcentration,concentrationUnit):0,eligibilityAge=', 'concentration calculation')

once('  const finishPatient=()=>{if(path&&!eligibility&&(!ageChangesDose||age!=="")&&(!needsWeight||kg>0)){if(result)setActual(String(result.minDose||result.dose));setStep(needsConcentrationStep?"concentration":"safety")}};', '  const finishPatient=()=>{if(path&&!eligibility&&(!ageChangesDose||age!=="")&&(!needsWeight||kg>0)){if(result)setActual(String(result.minDose||result.dose));setStep("safety")}};', 'patient next')
once('  const visibleSteps:Step[]=["medication","indication",...(needsPatientInfo?["patient" as Step]:[]),...(needsConcentrationStep?["concentration" as Step]:[]),"safety","result"],stepNumber=Math.max(1,visibleSteps.indexOf(step)+1),totalSteps=visibleSteps.length;', '  const visibleSteps:Step[]=["medication",...(agentHasConcentration?["concentration" as Step]:[]),"indication","route",...(needsPatientInfo?["patient" as Step]:[]),"safety","result"],stepNumber=Math.max(1,visibleSteps.indexOf(step)+1),totalSteps=visibleSteps.length;', 'step sequence')

once('{id:"concentration",label:"CONCENTRATION",value:conc>0?`${fmt(conc)} ${concentrationUnit}/mL`:"",detail:concConfirmed?"Physical label confirmed":"Confirm physical label",complete:agentHasConcentration&&concConfirmed,notRequired:!agentHasConcentration,active:step==="concentration",available:medConfirmed,onClick:()=>setStep("medication")},', '{id:"concentration",label:"CONCENTRATION",value:fieldConcentration?.label|| (conc>0?`${fmt(conc)} ${concentrationUnit}/mL`:""),detail:concConfirmed?"Admin concentration confirmed":"Confirm admin-set concentration",complete:agentHasConcentration&&concConfirmed,notRequired:!agentHasConcentration,active:step==="concentration",available:medConfirmed,onClick:()=>agentHasConcentration&&setStep("concentration")},', 'concentration board')
once('{id:"indication",label:"INDICATION",value:path?.label||"",detail:path?"DMP pathway selected":"Select reason for use",complete:!!path,active:step==="indication",available:medConfirmed&&(!agentRequiresConcentration||concConfirmed),onClick:()=>setStep("indication")},', '{id:"indication",label:"INDICATION",value:path?.label||"",detail:path?"DMP pathway selected":"Select reason for use",complete:!!path,active:step==="indication",available:medConfirmed&&(!agentHasConcentration||concConfirmed),onClick:()=>setStep("indication")},', 'indication board')
once('{id:"route",label:"ROUTE",value:selectedRoute,detail:path&&routeChoices.length===1?"Auto-filled":"Select approved route",complete:!!path&&!!selectedRoute,active:step==="indication"&&!!path,available:!!path,onClick:()=>setStep("indication")},', '{id:"route",label:"ROUTE",value:selectedRoute,detail:path&&routeChoices.length===1?"Approved route":"Select approved route",complete:!!path&&!!selectedRoute,active:step==="route",available:!!path,onClick:()=>setStep("route")},', 'route board')

# Remove generic wizard chrome; the shared shell already supplies the Fentanyl top bar/reference.
s=re.sub(r'\n    <div className="wizard-top generic-wizard-top">.*?</div>\n    <div className="progress generic-progress".*?</div>\n    <div className="clinical-banner">.*?</div>', '', s, count=1, flags=re.S)
once('    <section className="wizard-card generic-body">', '    <div className="builder-stage-form generic-body">', 'generic body open')
once('    </section>\n  </MedicationBuilderShell>;', '    </div>\n  </MedicationBuilderShell>;', 'generic body close')

# Replace medication screen with Fentanyl-style medication-only confirmation.
pattern=r'      \{step==="medication"&&<>.*?</>\}\n\n      \{step==="indication"'
m=re.search(pattern,s,flags=re.S)
if not m: raise SystemExit('missing medication block')
med='''      {step==="medication"&&<><small className="eyebrow">MEDICATION</small><h1>Confirm the medication in your hand</h1><p className="screen-help">Choose the medication, then confirm that the physical medication matches. Concentration is confirmed on the next screen from the Admin-set value.</p>{medicationAgents.length>1&&<div className="builder-options">{medicationAgents.map(x=><button key={x} className={selectedAgent===x?"selected":""} onClick={()=>{setSelectedAgent(x);setPath(null);setMedConfirmed(false);setConcConfirmed(false)}}><b>{x}</b><span>DMP {medication.protocolId}</span></button>)}</div>}{selectedAgent&&<><div className="versed-med-display"><div className="versed-vial"><span>{selectedAgent}</span><b>Rx</b><small>PHYSICAL MEDICATION</small></div><div><small>SELECTED MEDICATION</small><h2>{selectedAgent}</h2><p>DMP {medication.protocolId}</p></div></div><label className={medConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" checked={medConfirmed} onChange={e=>setMedConfirmed(e.target.checked)}/><span><b>Medication matches</b>{selectedAgent}</span></label><button className="continue" disabled={!medConfirmed||!selectedAgent} onClick={()=>setStep(agentHasConcentration?"concentration":"indication")}>Continue to {agentHasConcentration?"concentration":"indication"} <span>→</span></button></>}</>}\n\n      {step==="indication"'''
s=s[:m.start()]+med+s[m.end():]

# Replace indication+route screen with indication only and add a distinct Fentanyl-style route screen.
pattern=r'      \{step==="indication"&&<>.*?</>\}\n\n      \{step==="patient"'
m=re.search(pattern,s,flags=re.S)
if not m: raise SystemExit('missing indication block')
ind='''      {step==="indication"&&<><small className="eyebrow">INDICATION</small><h1>Why is {selectedAgent} being given?</h1><p className="screen-help">Select the DMP indication. Route is confirmed separately on the next screen.</p><div className="builder-options">{agentPaths.map(x=><button className={path?.id===x.id?"selected":""} key={x.id} onClick={()=>choosePath(x)}><b>{x.label}</b><span>{x.protocol}</span></button>)}</div>{path&&<button className="continue" onClick={()=>setStep("route")}>Continue to route <span>→</span></button>}</>}\n\n      {step==="route"&&path&&<><small className="eyebrow">ROUTE</small><h1>Select route</h1><p className="screen-help">Only routes allowed for the selected DMP pathway are shown.</p><div className="builder-options route-options">{routeChoices.map(x=><button key={x} className={selectedRoute===x?"selected":""} onClick={()=>setRoute(x)}><b>{x}</b><span>Approved route</span></button>)}</div><button className="continue" disabled={!selectedRoute} onClick={()=>setStep(needsPatientInfo?"patient":"safety")}>Continue to {needsPatientInfo?"patient information":"safety checks"} <span>→</span></button></>}\n\n      {step==="patient"'''
s=s[:m.start()]+ind+s[m.end():]

# Replace concentration entry screen with one-tap Admin/common EMS confirmation.
pattern=r'      \{step==="concentration"&&path&&<>.*?</>\}\n\n      \{step==="safety"'
m=re.search(pattern,s,flags=re.S)
if not m: raise SystemExit('missing concentration block')
conc='''      {step==="concentration"&&<><small className="eyebrow">CONCENTRATION</small><h1>Confirm the concentration</h1><p className="screen-help">This concentration is controlled by Admin. Until Admin changes it, the app uses the common EMS stock concentration already defined for this medication.</p>{fieldConcentration?<><div className="builder-options concentration-options fentanyl-concentration-options"><button type="button" className="selected"><b>{fieldConcentration.label||`${fmt(conc)} ${concentrationUnit}/mL`}</b><span>{fmt(conc)} {concentrationUnit}/mL • Admin/default</span></button></div><label className={concConfirmed?"builder-confirm checked":"builder-confirm"}><input type="checkbox" checked={concConfirmed} onChange={e=>setConcConfirmed(e.target.checked)}/><span><b>Concentration matches the physical label</b>{fieldConcentration.label||`${fmt(conc)} ${concentrationUnit}/mL`}</span></label><button className="continue" disabled={!concConfirmed} onClick={()=>setStep("indication")}>Continue to indication <span>→</span></button></>:<div className="hard-stop"><b>ADMIN CONCENTRATION REQUIRED</b><span>No field concentration is configured for this medication. Admin must set one before this calculator can be used.</span></div>}</>}\n\n      {step==="safety"'''
s=s[:m.start()]+conc+s[m.end():]

# Result review should return to the dedicated concentration screen, not medication.
s=s.replace('{needsConcentration&&<button onClick={()=>setStep("medication")}><small>CONCENTRATION</small><b>{fmt(conc)} {result.unit}/mL</b><span>{vialAmount} {inputDrugUnit} in {vialVolume} mL</span></button>}', '{needsConcentration&&<button onClick={()=>setStep("concentration")}><small>CONCENTRATION</small><b>{fieldConcentration?.label||`${fmt(conc)} ${result.unit}/mL`}</b><span>Admin-controlled • field confirmed</span></button>}', 1)

# Old state-dependent text should no longer exist.
for forbidden in ['setVialAmount','setVialVolume','vialAmount','vialVolume','concentrationStarted','inputDrugUnit','inputUnitMultiplier']:
    if forbidden in s:
        raise SystemExit(f'stale manual concentration token remains: {forbidden}')

# Add concentration resolver helpers before routesFor.
needle='function routesFor(route:string)'
if needle not in s: raise SystemExit('missing helper insertion point')
helpers='''function fieldConcentrationFor(id:string):FieldConcentration|null{\n  try{\n    const overrides=loadClinicalOverrides() as Record<string,{concentrations?:FieldConcentration[]}>;\n    const admin=overrides[id]?.concentrations?.find(item=>Number(item?.concentration)>0);\n    if(admin)return admin;\n  }catch{}\n  return commonEmsConcentrationsFor(id).find(item=>Number(item?.concentration)>0)||null;\n}\nfunction concentrationInUnit(item:FieldConcentration,target:string){\n  const value=Number(item.concentration||0);if(!(value>0))return 0;\n  const source=String(item.concentrationUnit||item.amountUnit||target).split('/')[0];\n  if(source===target)return value;\n  const toMg:Record<string,number>={mcg:.001,mg:1,g:1000};\n  if(toMg[source]&&toMg[target])return value*toMg[source]/toMg[target];\n  return value;\n}\n\n'''
s=s.replace(needle,helpers+needle,1)

if s==original: raise SystemExit('no changes')
p.write_text(s)
print('updated',p)
