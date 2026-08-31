from pathlib import Path

p=Path('src/MedicationEngine.tsx')
s=p.read_text()

old_selected='''needsWeight=!!path&&(path.formula.kind==="perKg"||path.requiresWeight),ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id)),ageRequired=ageChangesDose&&path?.patient!=="adult",effectiveAgeYears=age!==""?ageYears:path?.patient==="adult"?40:ageYears,needsPatientInfo=needsWeight||ageRequired,routeChoices=path?routesFor(path.route):[],selectedRoute=route||routeChoices[0]||"",'''
new_selected='''needsWeight=!!path&&(path.formula.kind==="perKg"||path.requiresWeight),ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id)),ageRequired=ageChangesDose&&path?.patient!=="adult",effectiveAgeYears=age!==""?ageYears:path?.patient==="adult"?40:ageYears,needsPatientInfo=needsWeight||ageRequired,routeChoices=path?routesFor(path.route):[],selectedRoute=route,'''
if old_selected not in s:
    raise SystemExit('selectedRoute fallback anchor not found')
s=s.replace(old_selected,new_selected,1)

start=s.index('  const choosePath=(next:GenericDosePath)=>{')
end=s.index('  const finishPatient=',start)
old=s[start:end]
new='''  const choosePath=(next:GenericDosePath)=>{\n    setPath(next);setRoute("");setContraChecks([]);setSpecialChecks([]);setBaseApproved(false);setBasePhysician("");setAdministrations([]);setReadyForAnother(false);setDopamineRate(next.titrationRates?.[0]||5);\n    // Route is always an explicit quick-pick step. Do not auto-select even a single approved route.\n    setStep("route");\n  };\n'''
s=s[:start]+new+s[end:]

old_detail='''{id:"route",label:"ROUTE",value:selectedRoute,detail:path&&routeChoices.length===1?"Approved route":"Select approved route",complete:!!path&&!!selectedRoute,active:step==="route",available:!!path,onClick:()=>setStep("route")},'''
new_detail='''{id:"route",label:"ROUTE",value:selectedRoute,detail:selectedRoute?"Route selected":"Select route",complete:!!path&&!!selectedRoute,active:step==="route",available:!!path,onClick:()=>setStep("route")},'''
if old_detail not in s:
    raise SystemExit('route box anchor not found')
s=s.replace(old_detail,new_detail,1)

old_heading='''{step==="route"&&path&&<><small className="eyebrow">ROUTE</small><h1>Select route</h1><div className="builder-options route-options">'''
new_heading='''{step==="route"&&path&&<><small className="eyebrow">ROUTE</small><h1>Select route</h1><div className="route-quick-pick-label">ROUTE QUICK PICK</div><div className="builder-options route-options">'''
if old_heading not in s:
    raise SystemExit('route screen anchor not found')
s=s.replace(old_heading,new_heading,1)

p.write_text(s)
print('Route is now an explicit quick-pick category')
