from pathlib import Path
p=Path('src/genericMedication.css')
c=p.read_text()
addon=r'''

/* Safety screen: DMP dose preview must stay in normal document flow and never cover contraindications. */
.streamlined-medication-flow:not(.calculation-complete-flow) .builder-stage-form > .action-line {
  position:static !important;
  inset:auto !important;
  top:auto !important;
  right:auto !important;
  bottom:auto !important;
  left:auto !important;
  float:none !important;
  transform:none !important;
  translate:none !important;
  width:100% !important;
  max-width:100% !important;
  margin:12px 0 14px !important;
  z-index:auto !important;
  box-sizing:border-box !important;
}
.streamlined-medication-flow:not(.calculation-complete-flow) .builder-stage-form > .safety-review-list {
  position:relative !important;
  z-index:auto !important;
  clear:both !important;
  margin-top:0 !important;
}
@media(max-width:760px){
  .streamlined-medication-flow:not(.calculation-complete-flow) .builder-stage-form > .action-line {
    margin:10px 0 12px !important;
  }
}
'''
if 'Safety screen: DMP dose preview must stay in normal document flow' not in c:
    c += addon
p.write_text(c)
print('safety dose preview overlap fix applied')
