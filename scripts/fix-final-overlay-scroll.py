from pathlib import Path

p=Path('src/medicationBuilderShell.css')
c=p.read_text()
addon=r'''

/* Final Dose is its own scroll surface so iOS Safari cannot strand it at an inherited page offset. */
#active-medication-screen-top.calculation-complete-flow {
  position:fixed !important;
  inset:0 !important;
  z-index:60 !important;
  width:100% !important;
  max-width:none !important;
  height:100dvh !important;
  min-height:100dvh !important;
  max-height:100dvh !important;
  margin:0 !important;
  padding:0 0 calc(130px + env(safe-area-inset-bottom)) !important;
  overflow-x:hidden !important;
  overflow-y:auto !important;
  -webkit-overflow-scrolling:touch !important;
  overscroll-behavior-y:contain !important;
  background:#edf2f5 !important;
}
#active-medication-screen-top.calculation-complete-flow .streamlined-medication-top {
  position:sticky !important;
  top:0 !important;
  z-index:4 !important;
  margin:0 !important;
  background:#10263b !important;
  color:#fff !important;
  border-bottom:1px solid #28465d !important;
}
#active-medication-screen-top.calculation-complete-flow .streamlined-medication-top button,
#active-medication-screen-top.calculation-complete-flow .streamlined-medication-top strong {
  color:#fff !important;
}
#active-medication-screen-top.calculation-complete-flow .streamlined-medication-layout,
#active-medication-screen-top.calculation-complete-flow .streamlined-choice-workspace,
#active-medication-screen-top.calculation-complete-flow .builder-stage-form {
  position:static !important;
  min-height:0 !important;
  max-height:none !important;
  height:auto !important;
  overflow:visible !important;
}
#active-medication-screen-top.calculation-complete-flow .streamlined-medication-layout {
  display:block !important;
  width:100% !important;
  padding:8px 0 0 !important;
}
#active-medication-screen-top.calculation-complete-flow .streamlined-choice-workspace {
  width:min(780px,100%) !important;
  margin:0 auto !important;
  padding:0 10px 24px !important;
}
body:has(#active-medication-screen-top.calculation-complete-flow) {
  overflow:hidden !important;
}
@media(max-width:760px){
  #active-medication-screen-top.calculation-complete-flow {
    height:100dvh !important;
    max-height:100dvh !important;
    padding-bottom:calc(125px + env(safe-area-inset-bottom)) !important;
  }
  #active-medication-screen-top.calculation-complete-flow .streamlined-medication-top {
    min-height:50px !important;
    padding-top:max(5px,env(safe-area-inset-top)) !important;
  }
  #active-medication-screen-top.calculation-complete-flow .streamlined-choice-workspace {
    padding:6px 8px 28px !important;
  }
}
'''
if 'Final Dose is its own scroll surface so iOS Safari cannot strand it' not in c:
    c+=addon
p.write_text(c)

p=Path('src/MedicationEngine.tsx')
s=p.read_text()
old='''      const shell=document.getElementById("active-medication-screen-top");
      if(shell instanceof HTMLElement){shell.scrollTop=0;shell.scrollIntoView({block:"start",behavior:"auto"})}'''
new='''      const shell=document.getElementById("active-medication-screen-top");
      if(shell instanceof HTMLElement){
        shell.scrollTop=0;
        shell.scrollTo({top:0,left:0,behavior:"auto"});
      }'''
if old in s:
    s=s.replace(old,new,1)
elif 'shell.scrollTo({top:0,left:0,behavior:"auto"})' not in s:
    raise SystemExit('final top reset anchor not found')
p.write_text(s)
print('dedicated Final Dose overlay scrolling applied')
