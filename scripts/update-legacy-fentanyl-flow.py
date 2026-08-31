from pathlib import Path
p=Path('src/App.tsx')
s=p.read_text(); original=s

def once(old,new,label):
    global s
    if old not in s: raise SystemExit(f'missing {label}')
    s=s.replace(old,new,1)

once('import {DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";\n', 'import {DEFAULT_FIELD_MEDICATION_IDS} from "./medicationReleaseConfig";\nimport {commonEmsConcentrationsFor} from "./emsMedicationDefaults";\nimport {loadClinicalOverrides} from "./adminMedicationStore";\n', 'legacy concentration imports')

needle='const medicationPhoto = (drug: Drug) =>\n  drug === "adenosine" ? "/medications/adenosine-vial.webp" : undefined;\n'
helper='''const medicationPhoto = (drug: Drug) =>\n  drug === "adenosine" ? "/medications/adenosine-vial.webp" : undefined;\ntype FieldStock={label?:string;amount?:number;amountUnit?:string;volume?:number;volumeUnit?:string;concentration?:number;concentrationUnit?:string};\nfunction fieldStockForLegacyDrug(drug:Drug):FieldStock|null {\n  try {\n    const overrides=loadClinicalOverrides() as Record<string,{concentrations?:FieldStock[]}>;\n    const configured=overrides[drug]?.concentrations?.find(item=>Number(item?.concentration)>0||Number(item?.amount)>0);\n    if(configured)return configured;\n  } catch {}\n  return commonEmsConcentrationsFor(drug).find(item=>Number(item?.concentration)>0||Number(item?.amount)>0)||null;\n}\nfunction stockVialFromFieldDefault(drug:Drug,label:string,photo?:string):StockVial {\n  const stock=fieldStockForLegacyDrug(drug);\n  if(!stock)return {drug,amount:"",volume:"",unit:drug==="magnesium"?"mg":"mg",label,barcode:"admin-missing",photo};\n  const rawUnit=String(stock.amountUnit||stock.concentrationUnit||"mg").split("/")[0];\n  const unit: DoseUnit=rawUnit==="mcg"?"mcg":rawUnit==="g"?"g":"mg";\n  const volume=Number(stock.volume)>0?Number(stock.volume):1;\n  const amount=Number(stock.amount)>0?Number(stock.amount):Number(stock.concentration||0)*volume;\n  return {drug,amount:String(amount),volume:String(volume),unit,label:stock.label||label,barcode:"admin-default",photo};\n}\n'''
once(needle,helper,'legacy field-stock helper')

old='''      setAmt("");\n      setMl("");\n      setDosesGiven([]);\n      setScanMedOk(false);\n      setScanConcOk(false);'''
new='''      setDosesGiven([]);\n      setScanMedOk(false);\n      setScanConcOk(false);'''
once(old,new,'remove blank concentration reset')

old='''      const selected=meds.find(x=>x.id===selectedDrug);\n      setScannedVial({drug:selectedDrug,amount:"",volume:"",unit:selectedDrug==="magnesium"?"g":"mg",label:selected?.brand||selectedDrug,barcode:"",photo:medicationPhoto(selectedDrug)});\n      setStep("scanConfirm");'''
new='''      const selected=meds.find(x=>x.id===selectedDrug);\n      const fieldVial=stockVialFromFieldDefault(selectedDrug,selected?.brand||selectedDrug,medicationPhoto(selectedDrug));\n      setScannedVial(fieldVial);\n      setAmt(normalizedVialAmount(fieldVial.amount,fieldVial.unit,selectedDrug));\n      setMl(fieldVial.volume);\n      setStep("scanConfirm");'''
once(old,new,'legacy begin medication stock')

once('<div className="scan-med-identity"><small>{scannedVial.barcode?"BARCODE MATCH":"MANUAL SELECTION"}</small>', '<div className="scan-med-identity"><small>{scannedVial.barcode==="admin-default"?"ADMIN / FIELD DEFAULT":scannedVial.barcode==="admin-missing"?"ADMIN SETUP REQUIRED":scannedVial.barcode?"BARCODE MATCH":"MANUAL SELECTION"}</small>', 'legacy source label')
once('<span className="manual-vial-note">Enter the concentration from the physical vial below.</span>', '<span className="manual-vial-note">No field concentration is configured. Admin must set the department stock concentration before this calculator can be used.</span>', 'legacy missing concentration copy')

# Prevent normal field users from typing stock values. Barcode/manual scanner paths can still populate a concrete scanned vial elsewhere.
start=s.find('            {!scannedVial.barcode&&<>')
if start<0: raise SystemExit('manual vial block start missing')
end=s.find('            </>}\n            {scannedVial.drug==="magnesium"',start)
if end<0: raise SystemExit('manual vial block end missing')
s=s[:start]+s[end+len('            </>}\n'):]

once('<Next ok={scanMedOk&&scanConcOk} go={()=>setStep("age")} text="Continue to patient information"/>', '<Next ok={scanMedOk&&scanConcOk} go={()=>setStep(reasons[drug].length===1?"age":"reason")} text={reasons[drug].length===1?"Continue to patient information":"Continue to indication"}/>', 'legacy next after concentration')
once('setTimeout(() => setStep("age"), 60);', 'setTimeout(() => setStep("age"), 60);', 'reason continuation')

# The legacy Screen must use the same direct stage container as Fentanyl, not its old wizard card.
once('<section className="wizard-card">\n      <small className="eyebrow">{e}</small>', '<section className="builder-stage-form">\n      <small className="eyebrow">{e}</small>', 'Screen class')

# Remove duplicated legacy chrome inside the shared Fentanyl frame.
once('''          <div className="progress legacy-medication-progress">\n            <i style={{ width: `${((pos + 1) / visible.length) * 100}%` }} />\n          </div>\n          <div className="clinical-banner">\n            <b>DMP verified</b>\n            <span>July 2026 • Approved July 1, 2026 • Next review January 2027</span>\n          </div>\n''','', 'legacy duplicated chrome')

# Make the board open the explicit indication step when an indication is still needed.
once('{id:"indication",label:"INDICATION",value:reason,detail:reason?"DMP pathway selected":"Select reason for use",complete:!!reason,active:step==="age"&&!ageClass,available:scanMedOk&&scanConcOk,onClick:()=>setStep("age")},', '{id:"indication",label:"INDICATION",value:reason,detail:reason?"DMP pathway selected":"Select reason for use",complete:!!reason,active:step==="reason",available:scanMedOk&&scanConcOk,onClick:()=>setStep(reasons[drug].length===1?"age":"reason")},', 'legacy indication board')

if s==original: raise SystemExit('no changes')
p.write_text(s)
print('updated legacy field flow')
