from pathlib import Path

# Restore the already-calculated repeat/next-dose status to the clean final card.
p=Path('src/FentanylDoseDashboard.tsx')
s=p.read_text()
old='''        {showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}\n      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}\n    </section>\n  </section>;'''
new='''        {showGiveAction&&<button type="button" className="dashboard-give-now dashboard-give-now-inline" disabled={giveDisabled} onClick={onGive} aria-label={`${giveLabel}: ${giveText}`}><small>{giveLabel}</small><strong>{giveText}</strong>{giveDetail&&<span>{giveDetail}</span>}</button>}\n      </>:<strong className="dashboard-dose-pending">Complete required checks</strong>}\n    </section>\n    {previewReady&&<section className={`final-next-dose repeat-status ${repeat.state==="running"?"running":""} ${repeat.state==="unavailable"?"unavailable":""}`} aria-live="polite">\n      <span><small>NEXT DOSE / REASSESS</small><strong>{repeat.value}</strong></span>\n      {repeat.nextDose&&<span><small>MAX NEXT DOSE</small><b>{repeat.nextDose}</b></span>}\n      <p>{repeat.detail}</p>\n    </section>}\n    {recorded&&<div className="final-recorded-summary"><b>✓ {recorded.count} dose{recorded.count===1?"":"s"} recorded</b><span>{recorded.detail}</span></div>}\n  </section>;'''
if old not in s:
    raise SystemExit('dashboard insertion anchor not found')
s=s.replace(old,new,1)
p.write_text(s)

# Bottom toolbar + spacing + restored timer styling.
p=Path('src/medicationBuilderShell.css')
c=p.read_text()
addon=r'''

/* Field actions live at the bottom; repeat timer is visible on final dose screen. */
.streamlined-medication-flow { padding-bottom:88px; }
.streamlined-medication-flow ~ .field-toolbar,
.unified-runtime > .field-toolbar,
body > .field-toolbar {
  position:fixed !important;
  left:50% !important;
  right:auto !important;
  top:auto !important;
  bottom:12px !important;
  z-index:80 !important;
  display:grid !important;
  width:min(560px,calc(100vw - 24px)) !important;
  grid-template-columns:repeat(3,minmax(0,1fr)) !important;
  margin:0 !important;
  padding:7px !important;
  transform:translateX(-50%) !important;
  border:1px solid #b8c9d2 !important;
  border-radius:15px !important;
  background:#fffffffa !important;
  box-shadow:0 8px 28px #10263b2e !important;
}
.streamlined-medication-flow ~ .field-toolbar button,
.unified-runtime > .field-toolbar button,
body > .field-toolbar button {
  min-height:52px !important;
  padding:6px 8px !important;
  border:0 !important;
  border-radius:10px !important;
  background:transparent !important;
  color:#26495b !important;
}
.streamlined-medication-flow ~ .field-toolbar button:not(:disabled):active,
.unified-runtime > .field-toolbar button:not(:disabled):active,
body > .field-toolbar button:not(:disabled):active { background:#eaf4f8 !important; }
.streamlined-medication-flow ~ .field-toolbar button span,
.unified-runtime > .field-toolbar button span,
body > .field-toolbar button span { display:block; font-size:18px; line-height:1; }
.streamlined-medication-flow ~ .field-toolbar button b,
.unified-runtime > .field-toolbar button b,
body > .field-toolbar button b { display:block; margin-top:4px; font-size:11px; }
.final-next-dose {
  display:grid;
  grid-template-columns:1fr auto;
  gap:8px 14px;
  margin:10px 0 0;
  padding:13px 14px;
  border:2px solid #9fb8c5;
  border-radius:12px;
  background:#f7fafb;
  color:#173f56;
}
.final-next-dose>span { display:flex; flex-direction:column; gap:3px; }
.final-next-dose>span:last-of-type { text-align:right; }
.final-next-dose small { color:#617984; font-size:8px; font-weight:900; letter-spacing:.11em; }
.final-next-dose strong { font-size:22px; line-height:1.05; }
.final-next-dose b { font-size:15px; }
.final-next-dose p { grid-column:1/-1; margin:2px 0 0; color:#5b707b; font-size:10px; line-height:1.35; }
.final-next-dose.running { border-color:#0b79b7; background:#eef8fd; }
.final-next-dose.running strong { color:#086aa1; font-variant-numeric:tabular-nums; }
.final-next-dose.unavailable { opacity:.72; }
.final-recorded-summary { display:flex; justify-content:space-between; gap:8px; margin-top:7px; padding:8px 10px; border-radius:9px; background:#eaf7f3; color:#175949; font-size:10px; }

@media(max-width:760px){
  .streamlined-medication-flow { padding-bottom:calc(86px + env(safe-area-inset-bottom)); }
  .streamlined-medication-flow ~ .field-toolbar,
  .unified-runtime > .field-toolbar,
  body > .field-toolbar {
    width:calc(100vw - 16px) !important;
    bottom:calc(8px + env(safe-area-inset-bottom)) !important;
    padding:5px !important;
    border-radius:13px !important;
  }
  .streamlined-medication-flow ~ .field-toolbar button,
  .unified-runtime > .field-toolbar button,
  body > .field-toolbar button { min-height:50px !important; }
  .final-next-dose { grid-template-columns:1fr auto; padding:11px 12px; }
  .final-next-dose strong { font-size:20px; }
}
'''
if 'Field actions live at the bottom; repeat timer is visible on final dose screen.' not in c:
    c+=addon
p.write_text(c)
print('restored bottom field toolbar and repeat timer')
