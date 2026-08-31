from pathlib import Path

# Simplify the shared shell: no duplicate vial/reference banners after drug selection.
p=Path('src/MedicationBuilderShell.tsx')
s=p.read_text()
old='''  const reference=<aside className="versed-medication-reference fentanyl-medication-reference unified-medication-reference" aria-label={`${medication.name} reference`}>
    <div className="versed-reference-vial fentanyl-reference-vial unified-reference-vial"><small>{(medication.vialLabel||medication.name).toUpperCase()}</small><b>Rx</b><span>MEDICATION</span></div>
    <span><small>SELECTED MEDICATION</small><b>{medication.name}</b>{medication.subtitle&&<em>{medication.subtitle}</em>}{medication.protocolId&&<em>DMP {medication.protocolId}</em>}</span>
  </aside>;

  return <main className="versed-builder fentanyl-builder unified-medication-builder" aria-label={ariaLabel||`${medication.name} calculator`}>
    <div className="versed-builder-top"><button className="drug-back-button" onClick={close}>‹ Back to medications</button><span>{medication.name.toUpperCase()} FORMAT</span><button onClick={reset||close}>Start over</button></div>
    <div className={`versed-layout${calculationComplete?" calculation-complete":""}`}>
      <header className="builder-medication-banner">{reference}</header>
      <aside className="versed-left-column unified-left-column" aria-label="Calculation controls"><CalculationBoard boxes={boxes} className="versed-status-board"/>{leftTools&&<div className="versed-left-tools">{leftTools}</div>}</aside>
      <section className="builder-workspace versed-inline-workspace unified-medication-workspace" aria-label={`${medication.name} selection workspace`}>{reference}{children}</section>
    </div>
  </main>;'''
new='''  return <main className="versed-builder fentanyl-builder unified-medication-builder streamlined-medication-flow" aria-label={ariaLabel||`${medication.name} calculator`}>
    <div className="versed-builder-top streamlined-medication-top"><button className="drug-back-button" onClick={close}>‹ Medications</button><strong>{medication.name}</strong><button onClick={reset||close}>Start over</button></div>
    <div className={`versed-layout streamlined-medication-layout${calculationComplete?" calculation-complete":""}`}>
      <aside className="versed-left-column unified-left-column streamlined-progress-column" aria-label="Calculation controls"><CalculationBoard boxes={boxes} className="versed-status-board"/>{leftTools&&<div className="versed-left-tools">{leftTools}</div>}</aside>
      <section className="builder-workspace versed-inline-workspace unified-medication-workspace streamlined-choice-workspace" aria-label={`${medication.name} selection workspace`}>{children}</section>
    </div>
  </main>;'''
if old not in s: raise SystemExit('shared shell anchor not found')
s=s.replace(old,new,1)
p.write_text(s)

# Remove repeated instructional/background copy from active choice steps.
p=Path('src/MedicationEngine.tsx')
s=p.read_text(); original=s
repls={
'<p className="screen-help">The medication was already selected on the main screen. Choose the specific agent only when this grouped DMP entry contains more than one medication.</p>':'',
'<p className="screen-help">Select the DMP indication. Route is confirmed separately on the next screen.</p>':'',
'<p className="screen-help">Only routes allowed for the selected DMP pathway are shown.</p>':'',
'<p className="screen-help">Use quick selections whenever possible. Manual entry remains available when a better weight is known.</p>':'',
'<p className="screen-help">Tap the department concentration if it matches the medication in your hand. Use Custom only when the physical label is different.</p>':'',
}
for old,new in repls.items(): s=s.replace(old,new)
# Patient page already knows the selected indication from the status/navigation; remove the duplicate selected path strip.
import re
s=re.sub(r'<div className="selected-generic-path"><span><small>INDICATION</small><b>\{path\.label\}</b></span><button onClick=\{\(\)=>\{setPath\(null\);setAge\(""\);setWeight\(""\);setWeightSource\(""\);setStep\("indication"\)\}\}>Change</button></div>','',s,count=1)
if s==original: raise SystemExit('no MedicationEngine cleanup applied')
p.write_text(s)

# Override old layout CSS so quick picks own the viewport.
p=Path('src/medicationBuilderShell.css')
c=p.read_text()
addon=r'''

/* Streamlined active workflow: selected medication is already known; choices own the screen. */
.streamlined-medication-flow .builder-medication-banner,
.streamlined-medication-flow .unified-medication-reference { display:none !important; }
.streamlined-medication-top { min-height:52px; }
.streamlined-medication-top>span { display:none; }
.streamlined-medication-top>strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:16px; text-transform:none; }
.streamlined-medication-layout { grid-template-columns:minmax(180px,220px) minmax(0,1fr) !important; gap:10px !important; padding:10px !important; }
.streamlined-progress-column { grid-column:1 !important; }
.streamlined-choice-workspace { grid-column:2 !important; min-height:calc(100dvh - 76px); padding:0 !important; overflow:hidden; }
.streamlined-choice-workspace>.builder-stage-form { display:flex; min-height:calc(100dvh - 76px); flex-direction:column; padding:8px 10px 10px !important; overflow:hidden; }
.streamlined-choice-workspace .eyebrow { flex:0 0 auto; margin:0 0 3px; font-size:9px; }
.streamlined-choice-workspace h1 { flex:0 0 auto; margin:0 0 10px; font-size:25px; line-height:1.08; }
.streamlined-choice-workspace .screen-help,
.streamlined-choice-workspace .selected-generic-path { display:none !important; }
.streamlined-choice-workspace .builder-options { display:grid !important; flex:1 1 auto; min-height:0; width:100%; margin:0 !important; grid-template-columns:repeat(2,minmax(0,1fr)); grid-auto-rows:minmax(0,1fr); gap:10px !important; align-content:stretch; overflow:hidden; }
.streamlined-choice-workspace .builder-options>button { display:flex; min-width:0; min-height:0 !important; height:100%; margin:0 !important; padding:14px !important; flex-direction:column; align-items:flex-start; justify-content:center; border-width:3px !important; border-radius:14px !important; text-align:left; }
.streamlined-choice-workspace .builder-options>button b { font-size:clamp(16px,2.1vw,24px) !important; line-height:1.08; }
.streamlined-choice-workspace .builder-options>button span { margin-top:7px; font-size:clamp(10px,1.1vw,13px) !important; line-height:1.25; }
.streamlined-choice-workspace .concentration-options { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
.streamlined-choice-workspace .route-options { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
.streamlined-choice-workspace .builder-custom { flex:1 1 auto; min-height:0; overflow:auto; }

@media(max-width:760px){
  .streamlined-medication-top { min-height:48px; padding:5px 8px !important; }
  .streamlined-medication-top>strong { font-size:15px; }
  .streamlined-medication-top button { min-height:38px; padding:0 9px !important; font-size:11px; }
  .streamlined-medication-layout { display:block !important; padding:0 !important; }
  .streamlined-progress-column { display:none !important; }
  .streamlined-choice-workspace { display:block !important; width:100% !important; min-height:calc(100dvh - 48px); max-height:calc(100dvh - 48px); overflow:hidden !important; }
  .streamlined-choice-workspace>.builder-stage-form { min-height:calc(100dvh - 48px); max-height:calc(100dvh - 48px); padding:10px !important; overflow:hidden !important; }
  .streamlined-choice-workspace .eyebrow { font-size:8px; }
  .streamlined-choice-workspace h1 { margin-bottom:8px; font-size:21px !important; }
  .streamlined-choice-workspace .builder-options { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:8px !important; }
  .streamlined-choice-workspace .builder-options>button { padding:11px !important; border-radius:13px !important; }
  .streamlined-choice-workspace .builder-options>button b { font-size:clamp(15px,4.3vw,20px) !important; }
  .streamlined-choice-workspace .builder-options>button span { margin-top:5px; font-size:clamp(9px,2.5vw,11px) !important; }
}

@media(max-width:390px) and (max-height:700px){
  .streamlined-choice-workspace h1 { font-size:18px !important; margin-bottom:6px; }
  .streamlined-choice-workspace>.builder-stage-form { padding:7px !important; }
  .streamlined-choice-workspace .builder-options { gap:6px !important; }
  .streamlined-choice-workspace .builder-options>button { padding:8px !important; }
  .streamlined-choice-workspace .builder-options>button b { font-size:14px !important; }
  .streamlined-choice-workspace .builder-options>button span { font-size:8px !important; }
}
'''
if 'Streamlined active workflow: selected medication is already known' not in c: c+=addon
p.write_text(c)
print('active medication workflow cleaned and quick picks expanded')
