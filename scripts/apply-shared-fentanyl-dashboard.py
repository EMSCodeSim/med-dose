from pathlib import Path
import re

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing {label}")
    return text.replace(old,new,1)

# Fentanyl: replace the inline dashboard with the shared renderer.
p=Path('src/FentanylBuilder.tsx'); s=p.read_text()
s=replace_once(s,'import DoseSyringe from "./DoseSyringe";\n','import DoseSyringe from "./DoseSyringe";\nimport FentanylDoseDashboard from "./FentanylDoseDashboard";\n','Fentanyl import')
pat=r'      \{stage==="result"&&hasStarted&&<section className="versed-dashboard".*?</section>\}\n      \{stage!=="result"'
m=re.search(pat,s,re.S)
if not m: raise SystemExit('missing Fentanyl inline dashboard')
new='''      {stage==="result"&&hasStarted&&<FentanylDoseDashboard
        medication="Fentanyl"
        route={route}
        ready={calculationReady}
        previewReady={dosePreviewReady&&protocolDose>0}
        dose={selectedDoseValid?`${fmt(selectedDose)} mcg`:"—"}
        volume={volume>0?`${fmt(volume)} mL`:"—"}
        secondaryDetail={route==="IN"&&volume>0?`${fmt(volume/2)} mL per nostril`:undefined}
        doseDetail={`Protocol-calculated dose: ${fmt(protocolDose)} mcg • cumulative maximum ${fmt(maxTotal)} mcg`}
        math={doseMath}
        mathDetails={[`Cumulative ceiling: ${fmt(weightKg)} kg × ${route==="IN"?4:3} mcg/kg = ${fmt(maxTotal)} mcg`,...(route==="IN"?[`${fmt(volume)} mL ÷ 2 nostrils = ${fmt(volume/2)} mL per nostril`]:[])]}
        showMath={showMath}
        setShowMath={setShowMath}
        syringeVolume={volume}
        instructions={[{label:"Route",value:route},{label:"How to give",value:route==="IN"?"Divide equally between nostrils.":route==="IM"?"Administer IM; IV is preferred for accurate titration.":"Administer slowly and titrate to tolerable pain."},...(route==="IN"?[{label:"Intranasal volume",value:`${fmt(volume/2)} mL per nostril • ${fmt(volume)} mL total • maximum 1 mL per nostril`,wide:true}]:[]),{label:"Dose ceiling",value:`${fmt(maxTotal)} mcg cumulative maximum • ${repeatMinutes}-minute reassessment before repeat`,wide:true}]}
        correction={inVolumeBlocked?{title:"IN volume exceeds 1 mL per nostril",detail:"Choose another route or confirm an appropriate higher concentration.",action:"Correct",onClick:()=>setStage("concentration")} : !calculationReady?{title:"Choose any red box",detail:"Complete checks in the order that is fastest for you.",action:"Open next check",onClick:()=>setStage(board.find(item=>!item.complete)?.id as Stage||"concentration")} : null}
        giveLabel={recorded?"GIVE NEXT DOSE NOW":"GIVE NOW"}
        giveText={selectedDoseValid?`${fmt(selectedDose)} mcg • ${fmt(volume)} mL`:"Complete dose"}
        giveDetail={`${route||"Route pending"} • records administration and starts timer`}
        giveDisabled={!calculationReady||!selectedDoseValid||(!repeatAvailable&&recorded)}
        onGive={giveNow}
        repeat={recorded&&remaining<=0?{label:"NO REPEAT AVAILABLE",value:"LIMIT",detail:"Cumulative protocol maximum recorded",state:"unavailable"}:!recorded?{label:"REPEAT DOSE",value:`${String(repeatMinutes).padStart(2,"0")}:00`,detail:"Available after reassessment following the first dose"}:secondsLeft>0?{label:"REPEAT DOSE AVAILABLE IN",value:timerText,detail:"Reassess pain, ventilation and perfusion first",nextDose:`Up to ${fmt(nextDoseMaximum)} mcg • ${concentration?fmt(nextDoseMaximum/concentration):"—"} mL`,state:"running"}:{label:"REPEAT DOSE",value:"AVAILABLE NOW",detail:"Give only if reassessment confirms it remains indicated",nextDose:`Up to ${fmt(nextDoseMaximum)} mcg • ${concentration?fmt(nextDoseMaximum/concentration):"—"} mL`,state:"ready"}}
        recorded={recorded?{count:administrations.length,detail:`${fmt(totalGiven)} of ${fmt(maxTotal)} mcg cumulative maximum`}:null}
      />}
      {stage!=="result"'''
s=s[:m.start()]+new+s[m.end():]
p.write_text(s)

# Generic: use the same dashboard as the primary result display; retain medication-specific controls beneath it.
p=Path('src/DmpMedicationCalculator.tsx'); s=p.read_text()
s=replace_once(s,'import MedicationBuilderShell from "./MedicationBuilderShell";\n','import MedicationBuilderShell from "./MedicationBuilderShell";\nimport FentanylDoseDashboard from "./FentanylDoseDashboard";\n','generic dashboard import')
old='''        <small className="eyebrow">FINAL DOSE</small><h1>{administrations.length?"Administration tracker":"Dose ready"}</h1>
        <div className="final-dose-answer" aria-label="Final medication dose"><div><small>MEDICATION</small><b>{path.agent}</b></div><div><small>ROUTE</small><b>{selectedRoute}</b></div><div className="final-give"><small>GIVE DOSE</small><strong>{finalGiveText}</strong></div><div className="final-draw"><small>{isDopamine?"INFUSION RATE":"DRAW VOLUME"}</small><strong>{finalVolumeText}</strong></div></div>'''
new='''        <FentanylDoseDashboard
          medication={path.agent}
          route={selectedRoute}
          ready={safetyComplete}
          previewReady={!!result}
          dose={finalGiveText}
          volume={finalVolumeText}
          doseDetail={patientText?`${patientText} • ${path.label}`:path.label}
          math={result.numeric?(isDopamine?`${fmt(kg)} kg × ${dopamineRate} mcg/kg/min = ${fmt(dopamineTotal)} mcg/min`:`Protocol dose ${result.text}${needsConcentration?` • ${fmt(result.dose)} ${result.unit} ÷ ${fmt(conc)} ${result.unit}/mL = ${fmt(result.dose/conc)} mL`:""}`):undefined}
          showMath={false}
          setShowMath={()=>{}}
          syringeVolume={!isDopamine&&needsConcentration&&result.numeric?result.dose/conc:undefined}
          instructions={[{label:"Route",value:selectedRoute},{label:"How to give",value:path.administration,wide:true},{label:"Repeat",value:path.repeat,wide:true}]}
          giveLabel={administrations.length?"GIVE NEXT DOSE NOW":"GIVE NOW"}
          giveText={`${finalGiveText}${finalVolumeText?` • ${finalVolumeText}`:""}`}
          giveDetail="Records administration using the medication-specific rule set"
          giveDisabled={!safetyComplete||!result||isDopamine||!!linkedDose}
          onGive={()=>result&&result.numeric&&recordAmount(result.dose)}
          repeat={{label:"REPEAT / REASSESS",value:secondsLeft?`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`:repeatRemaining>0&&administrations.length?"AVAILABLE NOW":administrations.length?"LIMIT":"AFTER FIRST DOSE",detail:path.repeat,nextDose:repeatRemaining>0&&doseMaximum>0?`Up to ${fmt(doseMaximum)} ${result.unit}`:undefined,state:secondsLeft?"running":repeatRemaining===0&&administrations.length?"unavailable":"ready"}}
          recorded={administrations.length?{count:administrations.length,detail:`${fmt(totalDose)} ${result.numeric?result.unit:"treatments"} recorded`}:null}
        />'''
s=replace_once(s,old,new,'generic final dose block')
p.write_text(s)

# Legacy-rule controller: remove the old final-cross-check presentation and render the shared Fentanyl dashboard.
p=Path('src/App.tsx'); s=p.read_text()
s=replace_once(s,'import MedicationBuilderShell from "./MedicationBuilderShell";\n','import MedicationBuilderShell from "./MedicationBuilderShell";\nimport FentanylDoseDashboard from "./FentanylDoseDashboard";\n','App dashboard import')
pat=r'        \{step === "review" && drug && r && \(\n          <Screen.*?\n          </Screen>\n        \)\}\n            </MedicationBuilderShell>'
m=re.search(pat,s,re.S)
if not m: raise SystemExit('missing legacy review block')
replacement='''        {step === "review" && drug && r && (
          <div className="legacy-dashboard-stage">
            <FentanylDoseDashboard
              medication={medName(drug)}
              route={administrationRoute||""}
              ready={safetyComplete&&rate!==null&&epiEnteredDoseValid&&!volumeBlocked}
              previewReady={rate!==null&&epiEnteredDoseValid}
              dose={doseText}
              volume={epiInfusion?`${fmt(vol)} mL/min`: `${fmt(vol)} mL`}
              secondaryDetail={isIntranasal?`${fmt(vol/2)} mL per nostril`:undefined}
              doseDetail={`${reason}${needWeight?` • ${fmt(kg)} kg`:""}`}
              math={epiWeightBandDose?`${fmt(kg)} kg ${kg<25?"<":"≥"} 25 kg = ${formatDose(drug,dose,unit)}`:r.perKg?`${fmt(kg)} kg × ${rate||0} ${unit}/kg${doseModifier!==1?" × ½ adjustment":""} = ${fmt(dose)} ${unit}`:`${rate||0} ${unit}${epiInfusion?"/min":""} fixed protocol dose`}
              mathDetails={[epiInfusion?`${fmt(dose)} mg/min ÷ 0.001 mg/mL = ${fmt(vol)} mL/min`:epiPediatricDilution?`${fmt(dose)} mg ÷ 0.01 mg/mL = ${fmt(vol)} mL`:`${fmt(dose)} ${unit} ÷ ${fmt(administrationConcentration)} ${unit}/mL = ${fmt(vol)} mL`]}
              showMath={true}
              setShowMath={()=>{}}
              syringeVolume={!epiInfusion?vol:undefined}
              instructions={[{label:"Route",value:administrationRoute||""},{label:"How to give",value:r.note||"Follow DMP administration instructions",wide:true},{label:"Repeat",value:r.repeatText,wide:true}]}
              correction={volumeBlocked?{title:"Administration blocked",detail:epiConcentrationMismatch?"Confirmed Epinephrine concentration does not match this pathway.":magImTooHigh?"Calculated IM volume exceeds the site limit.":"Calculated administration volume exceeds the route limit.",action:"Correct",onClick:()=>setStep(epiConcentrationMismatch?"scanConfirm":"age")} : rate===null?{title:"Dose selection required",detail:"Select the ordered DMP dose before administration.",action:"Select dose",onClick:()=>setStep("age")} : null}
              giveLabel={dosesGiven.length?"GIVE NEXT DOSE NOW":"GIVE NOW"}
              giveText={`${doseText} • ${epiInfusion?`${fmt(vol)} mL/min`:`${fmt(vol)} mL`}`}
              giveDetail={`${administrationRoute||"Route pending"} • records administration and starts reassessment timer`}
              giveDisabled={!safetyComplete||rate===null||!epiEnteredDoseValid||volumeBlocked||(dosesGiven.length>0&&secondsLeft>0)||repeatsLeft<=0}
              onGive={()=>recordDose(dose)}
              repeat={!dosesGiven.length?{label:"REPEAT / REASSESS",value:r.repeat>0?`${String(r.repeat).padStart(2,"0")}:00`:"PER PROTOCOL",detail:r.repeatText}:repeatsLeft<=0?{label:"NO REPEAT AVAILABLE",value:"LIMIT",detail:r.repeatText,state:"unavailable"}:secondsLeft>0?{label:"REPEAT DOSE AVAILABLE IN",value:`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`,detail:r.repeatText,nextDose:`Up to ${fmt(nextRepeat)} ${unit}`,state:"running"}:{label:"REPEAT DOSE",value:"AVAILABLE NOW",detail:r.repeatText,nextDose:`Up to ${fmt(nextRepeat)} ${unit}`,state:"ready"}}
              recorded={dosesGiven.length?{count:dosesGiven.length,detail:`${fmt(totalGiven)} ${unit} recorded`}:null}
            />
            <MedicationReport
              drug={medName(drug)} reason={reason} route={administrationRoute||""} age={ageText}
              patientClass={adult?"Adult":"Pediatric"} weight={needWeight?`${fmt(kg)} kg`:undefined}
              weightSource={ws==="age"?"age-based estimate":ws==="tape"?`${tapeColor} length-based band`:ws}
              protocol={`${protocolId(drug)} • July 2026`}
              doseRule={epiWeightBandDose?`${fmt(kg)} kg ${kg<25?"<":"≥"} 25 kg = ${formatDose(drug,dose,unit)}`:r.perKg?`${fmt(kg)} kg × ${rate} ${unit}/kg`: `${rate} ${unit}${epiInfusion?"/min":""}`}
              concentration={epiInfusion?`${fmt(conc)} mg/mL confirmed stock • prepared bag 0.001 mg/mL`:epiPediatricDilution?`${fmt(conc)} mg/mL confirmed stock • diluted syringe 0.01 mg/mL`:`${fmt(conc)} ${unit}/mL`}
              calculatedDose={doseText} calculatedVolume={epiInfusion?`${fmt(vol)} mL/min`:isIntranasal?`${fmt(vol)} mL total (${fmt(vol/2)} mL per nostril)`:`${fmt(vol)} mL`}
              unit={unit} entries={dosesGiven} encounterEntries={encounterAdministrations} baseApproval={baseApproval||undefined} openSignal={reportSignal} hideLauncher
            />
          </div>
        )}
            </MedicationBuilderShell>'''
s=s[:m.start()]+replacement+s[m.end():]
p.write_text(s)
print('shared Fentanyl dashboard applied')
