from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text(); original=s

def once(old,new,label):
    global s
    if old not in s: raise SystemExit(f'missing {label}')
    s=s.replace(old,new,1)

once('needsWeight=!!path&&(path.formula.kind==="perKg"||path.requiresWeight),ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id)),needsPatientInfo=needsWeight||ageChangesDose,routeChoices=',
     'needsWeight=!!path&&(path.formula.kind==="perKg"||path.requiresWeight),ageChangesDose=!!path&&(path.formula.kind==="ageBands"||path.minAge!==undefined||path.maxAge!==undefined||["antipsychotics","haloperidol","diazepam","lorazepam","diltiazem"].includes(medication.id)),ageRequired=ageChangesDose&&path?.patient!=="adult",effectiveAgeYears=age!==""?ageYears:path?.patient==="adult"?40:ageYears,needsPatientInfo=needsWeight||ageRequired,routeChoices=', 'adult age optional state')
once('eligibilityAge=ageChangesDose?ageYears:path?.patient==="pediatric"?8:40,eligibility=path&&needsPatientInfo?genericEligibilityReason(path,eligibilityAge,kg):"",\n    result=useMemo(()=>path?calculateGenericDose(path,ageYears,kg,medication.id):null,[path,ageYears,kg,medication.id])',
     'eligibilityAge=ageRequired?effectiveAgeYears:path?.patient==="pediatric"?8:40,eligibility=path&&needsPatientInfo?genericEligibilityReason(path,eligibilityAge,kg):"",\n    result=useMemo(()=>path?calculateGenericDose(path,effectiveAgeYears,kg,medication.id):null,[path,effectiveAgeYears,kg,medication.id])', 'effective adult age')
once('additionalAdjustment=(medication.id==="diazepam"||medication.id==="lorazepam")&&path?.patient==="adult"&&(ageYears>65||kg<50)',
     'additionalAdjustment=(medication.id==="diazepam"||medication.id==="lorazepam")&&path?.patient==="adult"&&(effectiveAgeYears>65||kg<50)', 'diazepam adult adjustment')
once('(medication.id==="antipsychotics"||medication.id==="haloperidol")&&ageYears>=65?',
     '(medication.id==="antipsychotics"||medication.id==="haloperidol")&&effectiveAgeYears>=65?', 'haloperidol adult adjustment')
once('medication.id==="diltiazem"&&ageYears>65?',
     'medication.id==="diltiazem"&&effectiveAgeYears>65?', 'diltiazem adult adjustment text')
once('(medication.id==="diltiazem"&&ageYears>65?.5:1)',
     '(medication.id==="diltiazem"&&effectiveAgeYears>65?.5:1)', 'diltiazem linked dose')
once('dose:ageChangesDose&&age===""?"Age required":needsWeight&&!(kg>0)?"Weight required":finalGiveText',
     'dose:ageRequired&&age===""?"Age required":needsWeight&&!(kg>0)?"Weight required":finalGiveText', 'context age required')
once('const finishPatient=()=>{if(path&&!eligibility&&(!ageChangesDose||age!=="")&&(!needsWeight||kg>0))',
     'const finishPatient=()=>{if(path&&!eligibility&&(!ageRequired||age!=="")&&(!needsWeight||kg>0))', 'finish patient age rule')
once('const patientComplete=!!path&&(!needsPatientInfo||((!ageChangesDose||age!=="")&&(!needsWeight||kg>0)&&!eligibility));',
     'const patientComplete=!!path&&(!needsPatientInfo||((!ageRequired||age!=="")&&(!needsWeight||kg>0)&&!eligibility));', 'patient complete age rule')
once('const nextEligibility=path?genericEligibilityReason(path,ageChangesDose?ageYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageChangesDose||age!=="")&&!nextEligibility)setStep("safety")',
     'const nextEligibility=path?genericEligibilityReason(path,ageRequired?effectiveAgeYears:path.patient==="pediatric"?8:40,nextKg):"";if((!ageRequired||age!=="")&&!nextEligibility)setStep("safety")', 'weight quick pick age rule')
once('{ageChangesDose&&<><label className="giant-input"><span>Patient age</span>',
     '{ageRequired&&<><label className="giant-input"><span>Patient age</span>', 'hide required adult age input')
once('{ageChangesDose&&age!==""&&<div className="classification">',
     '{ageRequired&&age!==""&&<div className="classification">', 'classification age rule')
once('{eligibility&&(ageChangesDose?age!=="":weight!=="")&&<div className="hard-stop"',
     '{eligibility&&(ageRequired?age!=="":weight!=="")&&<div className="hard-stop"', 'eligibility visibility')
once('disabled={(ageChangesDose&&!age)||(needsWeight&&!(kg>0))||!!eligibility}',
     'disabled={(ageRequired&&!age)||(needsWeight&&!(kg>0))||!!eligibility}', 'patient continue age rule')

if s==original: raise SystemExit('no changes')
p.write_text(s)
print('adult pathways no longer require age; known age remains usable for adjustments')
