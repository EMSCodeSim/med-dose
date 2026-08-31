from pathlib import Path

# Give the active medication screen a stable top anchor.
p=Path('src/MedicationBuilderShell.tsx')
s=p.read_text()
old='''  return <main className={`versed-builder fentanyl-builder unified-medication-builder streamlined-medication-flow${calculationComplete?" calculation-complete-flow":""}`} aria-label={ariaLabel||`${medication.name} calculator`}>'''
new='''  return <main id="active-medication-screen-top" className={`versed-builder fentanyl-builder unified-medication-builder streamlined-medication-flow${calculationComplete?" calculation-complete-flow":""}`} aria-label={ariaLabel||`${medication.name} calculator`}>'''
if old in s:
    s=s.replace(old,new,1)
elif 'id="active-medication-screen-top"' not in s:
    raise SystemExit('MedicationBuilderShell main anchor not found')
p.write_text(s)

# Replace window-only scroll reset with a Safari-safe reset of every possible scrolling ancestor.
p=Path('src/MedicationEngine.tsx')
s=p.read_text()
old='''  useEffect(()=>{if(step!=="result")return;window.requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}))},[step]);'''
new='''  useEffect(()=>{\n    if(step!=="result")return;\n    const resetFinalTop=()=>{\n      if("scrollRestoration" in history)history.scrollRestoration="manual";\n      const doc=document.scrollingElement;\n      if(doc)doc.scrollTop=0;\n      document.documentElement.scrollTop=0;\n      document.body.scrollTop=0;\n      const host=document.querySelector(".generic-calculator-host");\n      if(host instanceof HTMLElement)host.scrollTop=0;\n      const shell=document.getElementById("active-medication-screen-top");\n      if(shell instanceof HTMLElement){shell.scrollTop=0;shell.scrollIntoView({block:"start",behavior:"auto"})}\n    };\n    resetFinalTop();\n    const frame=window.requestAnimationFrame(resetFinalTop);\n    const shortTimer=window.setTimeout(resetFinalTop,60);\n    const safariTimer=window.setTimeout(resetFinalTop,260);\n    return()=>{window.cancelAnimationFrame(frame);window.clearTimeout(shortTimer);window.clearTimeout(safariTimer)};\n  },[step]);'''
if old in s:
    s=s.replace(old,new,1)
elif 'const resetFinalTop=()=>{' not in s:
    raise SystemExit('existing final scroll effect not found')
p.write_text(s)

# Final result must never create a nested scroll container and needs a little top breathing room.
p=Path('src/medicationBuilderShell.css')
c=p.read_text()
addon=r'''

/* iOS Safari: final screen uses the document as the only scroll container. */
#active-medication-screen-top.calculation-complete-flow {
  overflow:visible !important;
  overscroll-behavior:auto !important;
  scroll-margin-top:0 !important;
}
#active-medication-screen-top.calculation-complete-flow .streamlined-medication-layout,
#active-medication-screen-top.calculation-complete-flow .streamlined-choice-workspace,
#active-medication-screen-top.calculation-complete-flow .builder-stage-form,
.generic-calculator-host:has(#active-medication-screen-top.calculation-complete-flow) {
  overflow:visible !important;
  max-height:none !important;
  height:auto !important;
}
.generic-calculator-host:has(#active-medication-screen-top.calculation-complete-flow) {
  position:static !important;
}
#active-medication-screen-top.calculation-complete-flow .final-selection-review {
  margin-top:8px !important;
}
@media(max-width:760px){
  #active-medication-screen-top.calculation-complete-flow {
    padding-top:0 !important;
  }
  #active-medication-screen-top.calculation-complete-flow .streamlined-medication-top {
    margin-top:0 !important;
  }
}
'''
if 'iOS Safari: final screen uses the document as the only scroll container.' not in c:
    c+=addon
p.write_text(c)
print('iOS final-screen top reset and single-scroll-container fix applied')
