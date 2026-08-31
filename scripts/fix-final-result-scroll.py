from pathlib import Path

# Final result must open at top and use normal document scrolling.
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
anchor='''  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);'''
insert='''  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);\n  useEffect(()=>{if(step!=="result")return;window.requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}))},[step]);'''
if anchor not in s:
    if 'window.scrollTo({top:0,left:0,behavior:"auto"})' not in s:
        raise SystemExit('timer effect anchor not found')
else:
    s=s.replace(anchor,insert,1)
p.write_text(s)

p=Path('src/medicationBuilderShell.css')
c=p.read_text()
addon=r'''

/* Final result is a normal page, never a clipped wizard viewport. */
.streamlined-medication-flow.calculation-complete-flow,
.streamlined-medication-flow.calculation-complete-flow .streamlined-medication-layout,
.streamlined-medication-flow.calculation-complete-flow .streamlined-choice-workspace,
.streamlined-medication-flow.calculation-complete-flow .streamlined-choice-workspace > .builder-stage-form {
  min-height:0 !important;
  max-height:none !important;
  height:auto !important;
  overflow:visible !important;
}
.streamlined-medication-flow.calculation-complete-flow {
  display:block !important;
  position:relative !important;
  padding-bottom:140px !important;
}
.streamlined-medication-flow.calculation-complete-flow .streamlined-medication-top {
  position:relative !important;
  top:auto !important;
  z-index:1 !important;
}
.streamlined-medication-flow.calculation-complete-flow .streamlined-medication-layout {
  display:block !important;
  width:100% !important;
  padding-top:8px !important;
}
.streamlined-medication-flow.calculation-complete-flow .streamlined-progress-column {
  display:none !important;
}
.streamlined-medication-flow.calculation-complete-flow .streamlined-choice-workspace {
  display:block !important;
  width:min(780px,100%) !important;
  margin:0 auto !important;
  padding:0 10px 20px !important;
}
.streamlined-medication-flow.calculation-complete-flow .final-selection-review {
  scroll-margin-top:12px;
}
html, body, #root, .wizard-app.unified-runtime {
  overflow-y:auto !important;
  max-height:none !important;
}
@media(max-width:760px){
  .streamlined-medication-flow.calculation-complete-flow {
    min-height:100dvh !important;
    padding-bottom:calc(150px + env(safe-area-inset-bottom)) !important;
    overflow:visible !important;
  }
  .streamlined-medication-flow.calculation-complete-flow .streamlined-choice-workspace,
  .streamlined-medication-flow.calculation-complete-flow .streamlined-choice-workspace > .builder-stage-form {
    min-height:0 !important;
    max-height:none !important;
    height:auto !important;
    overflow:visible !important;
  }
  .streamlined-medication-flow.calculation-complete-flow .streamlined-choice-workspace {
    padding:4px 8px 24px !important;
  }
}
'''
if 'Final result is a normal page, never a clipped wizard viewport.' not in c:
    c+=addon
p.write_text(c)
print('final result scroll and top positioning fixed')
