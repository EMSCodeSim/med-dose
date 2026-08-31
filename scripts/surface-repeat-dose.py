from pathlib import Path
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
needle='''        <div className="final-action-row">\n'''
block='''        {result.numeric&&!isDopamine&&!linkedDose&&administrations.length>0&&<div className="final-repeat-dose-action">\n          <DoseTracker entries={administrations} unit={result.unit} total={totalDose} totalVolume={totalVolume} maxTotal={protocolMaxTotal} repeatsLeft={path.openEndedRepeats?1:repeatRemaining} repeatMinutes={path.repeatAfterMinutes||0} secondsLeft={secondsLeft} nextDose={doseMaximum} initialDose={result.minDose||result.dose} concentration={needsConcentration?conc:1} drug={medication.id} reason={path.label} route={selectedRoute} intranasal={selectedRoute==="IN"} record={recordAmount} openEndedRepeats={!!path.openEndedRepeats} volumeEnabled={needsConcentration||result.unit==="mL"} hideInitialAction/>\n        </div>}\n        <div className="final-action-row">\n'''
if needle not in s:
    if 'final-repeat-dose-action' not in s:
        raise SystemExit('final action row anchor not found')
else:
    s=s.replace(needle,block,1)
old='''        {result.numeric?(isDopamine?<div className="generic-summary dopamine-infusion">'''
# Remove only the normal DoseTracker branch inside More Details, preserving dopamine and linked-dose branches.
normal='''</div>:<DoseTracker entries={administrations} unit={result.unit} total={totalDose} totalVolume={totalVolume} maxTotal={protocolMaxTotal} repeatsLeft={path.openEndedRepeats?1:repeatRemaining} repeatMinutes={path.repeatAfterMinutes||0} secondsLeft={secondsLeft} nextDose={doseMaximum} initialDose={result.minDose||result.dose} concentration={needsConcentration?conc:1} drug={medication.id} reason={path.label} route={selectedRoute} intranasal={selectedRoute==="IN"} record={recordAmount} openEndedRepeats={!!path.openEndedRepeats} volumeEnabled={needsConcentration||result.unit==="mL"} hideInitialAction/>):<button className="initial-record-dose"'''
replacement='''</div>:null):<button className="initial-record-dose"'''
if normal in s:
    s=s.replace(normal,replacement,1)
elif s.count('final-repeat-dose-action') and s.count('hideInitialAction/>')==1:
    pass
else:
    raise SystemExit('nested DoseTracker branch anchor not found')
p.write_text(s)

p=Path('src/genericMedication.css')
c=p.read_text()
addon=r'''

/* Repeat-dose action stays visible on Final Dose after the first administration. */
.final-repeat-dose-action { margin:12px 0; }
.final-repeat-dose-action .dose-tracker { margin:0; }
.final-repeat-dose-action .tracker-head { border-radius:12px 12px 0 0; }
.final-repeat-dose-action .repeat-panel { margin-top:0; }
.final-repeat-dose-action .record-dose { min-height:68px; font-size:16px; font-weight:900; }
@media(max-width:780px){
  .final-repeat-dose-action { margin:10px 0; }
  .final-repeat-dose-action .record-dose { min-height:64px; }
}
'''
if 'Repeat-dose action stays visible on Final Dose' not in c:
    c+=addon
p.write_text(c)
print('surfaced existing repeat DoseTracker on Final Dose')
