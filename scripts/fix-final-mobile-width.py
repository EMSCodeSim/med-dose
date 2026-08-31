from pathlib import Path
p=Path('src/medicationBuilderShell.css')
c=p.read_text()
addon=r'''

/* Final Dose mobile width reset: never inherit desktop/grid horizontal offsets. */
@media(max-width:760px){
  #active-medication-screen-top.calculation-complete-flow,
  #active-medication-screen-top.calculation-complete-flow .streamlined-medication-layout,
  #active-medication-screen-top.calculation-complete-flow .streamlined-choice-workspace,
  #active-medication-screen-top.calculation-complete-flow .builder-stage-form,
  #active-medication-screen-top.calculation-complete-flow .generic-body {
    box-sizing:border-box !important;
    width:100% !important;
    min-width:0 !important;
    max-width:100% !important;
    margin-left:0 !important;
    margin-right:0 !important;
    left:0 !important;
    right:auto !important;
    transform:none !important;
    translate:none !important;
    grid-column:1 / -1 !important;
  }
  #active-medication-screen-top.calculation-complete-flow {
    inset:0 !important;
    overflow-x:hidden !important;
  }
  #active-medication-screen-top.calculation-complete-flow .streamlined-medication-layout {
    display:block !important;
    padding-left:0 !important;
    padding-right:0 !important;
  }
  #active-medication-screen-top.calculation-complete-flow .streamlined-choice-workspace {
    display:block !important;
    padding-left:8px !important;
    padding-right:8px !important;
  }
  #active-medication-screen-top.calculation-complete-flow .builder-stage-form,
  #active-medication-screen-top.calculation-complete-flow .generic-body {
    display:block !important;
    padding-left:0 !important;
    padding-right:0 !important;
  }
  #active-medication-screen-top.calculation-complete-flow .final-selection-review,
  #active-medication-screen-top.calculation-complete-flow .final-dose-card,
  #active-medication-screen-top.calculation-complete-flow .final-next-dose,
  #active-medication-screen-top.calculation-complete-flow .final-action-row,
  #active-medication-screen-top.calculation-complete-flow .final-math-line,
  #active-medication-screen-top.calculation-complete-flow .final-all-details {
    box-sizing:border-box !important;
    width:100% !important;
    max-width:100% !important;
    margin-left:0 !important;
    margin-right:0 !important;
    transform:none !important;
  }
}
'''
if 'Final Dose mobile width reset: never inherit desktop/grid horizontal offsets.' not in c:
    c+=addon
p.write_text(c)
print('final mobile width reset applied')
