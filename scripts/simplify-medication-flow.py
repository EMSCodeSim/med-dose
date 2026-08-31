from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text(); original=s

def once(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing {label}')
    s=s.replace(old,new,1)

# Track whether a field was opened from Final Cross-Check.
once('[dopamineRate,setDopamineRate]=useState(5),[dropFactor,setDropFactor]=useState(60);',
     '[dopamineRate,setDopamineRate]=useState(5),[dropFactor,setDropFactor]=useState(60),[returnToResult,setReturnToResult]=useState(false);',
     'return-to-result state')

# Replace path chooser with a smart advancement function. Preserve valid route/patient data when editing indication.
old='const choosePath=(next:GenericDosePath)=>{setPath(next);setRoute("");setAge(initialPatient?.ageYears!==undefined?String(initialPatient.ageYears):"");setWeight(initialPatient?.weightKg!==undefined?String(initialPatient.weightKg):"");setWeightSource(initialPatient?.weightKg?"carried from current patient":"");setContraChecks([]);setSpecialChecks([]);setBaseApproved(false);setBasePhysician("");setAdministrations([]);setReadyForAnother(false);setDopamineRate(next.titrationRates?.[0]||5)};'
new='''const choosePath=(next:GenericDosePath)=>{\n    const nextRoutes=routesFor(next.route),preservedRoute=nextRoutes.includes(selectedRoute)?selectedRoute:(nextRoutes.length===1?nextRoutes[0]:\"\"),\n      nextNeedsWeight=next.formula.kind===\"perKg\"||!!next.requiresWeight,\n      nextAgeChanges=next.formula.kind===\"ageBands\"||next.minAge!==undefined||next.maxAge!==undefined||[\"antipsychotics\",\"haloperidol\",\"diazepam\",\"lorazepam\",\"diltiazem\"].includes(medication.id),\n      nextAgeRequired=nextAgeChanges&&next.patient!==\"adult\",nextNeedsPatient=nextNeedsWeight||nextAgeRequired,\n      nextPatientReady=(!nextAgeRequired||age!==\"\")&&(!nextNeedsWeight||kg>0),\n      nextContra=applicableContraindications(medication,next),nextSpecial=applicableSpecialChecks(next),nextNeedsSafety=nextContra.length>0||nextSpecial.length>0||!!next.baseContact;\n    setPath(next);setRoute(preservedRoute);setContraChecks([]);setSpecialChecks([]);setBaseApproved(false);setBasePhysician(\"\");setAdministrations([]);setReadyForAnother(false);setDopamineRate(next.titrationRates?.[0]||5);\n    if(!preservedRoute){setStep(\"route\");return}\n    if(nextNeedsPatient&&!nextPatientReady){setStep(\"patient\");return}\n    if(nextNeedsSafety){setStep(\"safety\");return}\n    setReturnToResult(false);setStep(\"result\");\n  };'''
once(old,new,'smart choosePath')

# Route selection: one tap. If editing from final, return directly when patient/safety are still satisfied.
old='onClick={()=>{setRoute(x);setStep(needsPatientInfo?"patient":"safety")}}><b>{x}</b><span>Approved route</span></button>)}</div>'
new='onClick={()=>{setRoute(x);if(returnToResult&&patientComplete&&safetyComplete){setReturnToResult(false);setStep("result")}else if(needsPatientInfo&&!patientComplete)setStep("patient");else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}}><b>{x}</b><span>Approved route</span></button>)}</div>'
once(old,new,'smart route quick pick')

# Patient finish should return to final if it was an edit and safety remains valid; otherwise skip empty safety.
old='const finishPatient=()=>{if(path&&!eligibility&&(!ageRequired||age!=="")&&(!needsWeight||kg>0)){if(result)setActual(String(result.minDose||result.dose));setStep("safety")}};'
new='const finishPatient=()=>{if(path&&!eligibility&&(!ageRequired||age!=="")&&(!needsWeight||kg>0)){if(result)setActual(String(result.minDose||result.dose));if(returnToResult&&safetyComplete){setReturnToResult(false);setStep("result")}else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}};'
once(old,new,'smart finish patient')

# Weight quick pick gets the same smart return/skip behavior.
old='if((!ageRequired||age!=="")&&!nextEligibility)setStep("safety")'
new='if((!ageRequired||age!=="")&&!nextEligibility){if(returnToResult&&safetyComplete){setReturnToResult(false);setStep("result")}else if(contraindications.length||specialChecksText.length||path.baseContact)setStep("safety");else{setReturnToResult(false);setStep("result")}}'
once(old,new,'smart weight quick pick')

# Department concentration quick-pick returns directly to final when editing; otherwise auto-select the only indication.
old='onClick={()=>{setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);setStep("indication")}}'
new='onClick={()=>{setCustomConcentrationMode(false);setCustomConcentration("");setConcConfirmed(true);if(returnToResult&&path){setReturnToResult(false);setStep("result")}else if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}}'
once(old,new,'smart admin concentration')

# Custom concentration confirmation gets identical behavior.
old='if(checked&&Number(customConcentration)>0)setStep("indication")'
new='if(checked&&Number(customConcentration)>0){if(returnToResult&&path){setReturnToResult(false);setStep("result")}else if(agentPaths.length===1)choosePath(agentPaths[0]);else setStep("indication")}'
once(old,new,'smart custom concentration')

# Agent selection: if there is no concentration and only one indication, choose it immediately.
old='const paths=medication.paths.filter(p=>p.agent===x);setStep(paths.some(pathUsesConcentration)?"concentration":"indication")'
new='const paths=medication.paths.filter(p=>p.agent===x);if(paths.some(pathUsesConcentration))setStep("concentration");else if(paths.length===1)choosePath(paths[0]);else setStep("indication")'
once(old,new,'smart agent selection')

# Final cross-check buttons mark edit mode before navigating.
repls={
'onClick={()=>agentNeedsConcentration&&setStep("concentration")}':'onClick={()=>{if(agentNeedsConcentration){setReturnToResult(true);setStep("concentration")}}}',
'onClick={()=>setStep("indication")}><small>INDICATION</small>':'onClick={()=>{setReturnToResult(true);setStep("indication")}}><small>INDICATION</small>',
'onClick={()=>setStep("route")}><small>ROUTE</small>':'onClick={()=>{setReturnToResult(true);setStep("route")}}><small>ROUTE</small>',
'onClick={()=>needsPatientInfo&&setStep("patient")}':'onClick={()=>{if(needsPatientInfo){setReturnToResult(true);setStep("patient")}}}',
'onClick={()=>setStep("safety")}><small>SAFETY</small>':'onClick={()=>{setReturnToResult(true);setStep("safety")}}><small>SAFETY</small>'
}
for i,(old,new) in enumerate(repls.items(),1):
    once(old,new,f'final edit button {i}')

# Safety confirmation already advances; clear edit mode as it returns to final.
old='if(confirmed&&!path.baseContact)showResult()'
new='if(confirmed&&!path.baseContact){setReturnToResult(false);showResult()}'
once(old,new,'safety edit return')
old='if(checked&&basePhysician.trim())showResult()'
new='if(checked&&basePhysician.trim()){setReturnToResult(false);showResult()}'
once(old,new,'base edit return')

# Single indication choice is still one tap, now smart-skips route/patient/safety when possible via choosePath.
# No additional Continue buttons are introduced.

if s==original:
    raise SystemExit('no changes')
p.write_text(s)
print('smart medication flow installed')
