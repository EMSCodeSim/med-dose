from pathlib import Path

path=Path('src/AdminMedicationManager.tsx')
s=path.read_text()

def replace(old,new):
    global s
    if old not in s:
        raise SystemExit(f'Expected source block not found: {old[:80]!r}')
    s=s.replace(old,new,1)

replace(
'''  const beginReview = (id: string) => {
    const signatures = reviews[id] || {};
    updateRecord(id, (r) => ({ ...r, reviewStartedAt: Date.now(),validation:undefined }));''',
'''  const beginReview = (id: string) => {
    const signatures = reviews[id] || {};
    updateRecord(id, (r) => {
      const previousValidation=r.validation?deepClone(r.validation):undefined;
      return {
        ...r,
        reviewStartedAt: Date.now(),
        validation: undefined,
        validationResetHistory: previousValidation ? [{
          id:`${id}-validation-reset-${Date.now()}`,
          clearedAt:Date.now(),
          reason:"New review started",
          changeSummary:["A new formal review was started; prior validation was archived before checks were reset."],
          previousValidation,
        },...(r.validationResetHistory||[])] : (r.validationResetHistory||[]),
      };
    });''')

replace(
'''      updateRecord(selected.id, (r) => ({
        ...r,
        protocolRevision:
          protocolRevision.trim() || CURRENT_DMP_PROTOCOL_REVISION,
        reviewStartedAt: r.reviewStartedAt || Date.now(),
        draft: nextData,
        draftCreatedAt: Date.now(),
        validation: undefined,
      }));''',
'''      updateRecord(selected.id, (r) => {
        const nextProtocolRevision=protocolRevision.trim() || CURRENT_DMP_PROTOCOL_REVISION;
        const previousValidation=r.validation?deepClone(r.validation):undefined;
        const resetChanges=[...changes];
        if(r.protocolRevision!==nextProtocolRevision) resetChanges.unshift(`protocolRevision: ${r.protocolRevision} → ${nextProtocolRevision}`);
        return {
          ...r,
          protocolRevision:nextProtocolRevision,
          reviewStartedAt: r.reviewStartedAt || Date.now(),
          draft: nextData,
          draftCreatedAt: Date.now(),
          validation: undefined,
          validationResetHistory: previousValidation ? [{
            id:`${selected.id}-validation-reset-${Date.now()}`,
            clearedAt:Date.now(),
            reason:"Clinical medication record changed",
            changeSummary:resetChanges.length?resetChanges:["Medication draft was saved after validation; prior validation was archived."],
            previousValidation,
          },...(r.validationResetHistory||[])] : (r.validationResetHistory||[]),
        };
      });''')

marker='''            <section className="admin-med-history">
              <h3>Review history</h3>'''
insert='''            <section className="admin-med-history admin-validation-history">
              <h3>Validation history</h3>
              <p>Cleared validations are retained here so reviewer identity, timestamps, and the reason for revalidation remain auditable.</p>
              {record.validationResetHistory?.length ? record.validationResetHistory.map((entry)=><details key={entry.id}>
                <summary><b>{new Date(entry.clearedAt).toLocaleString()}</b><span>{entry.reason}</span></summary>
                <p>Previous validation: protocol {entry.previousValidation.protocolRevision} • clinical revision {entry.previousValidation.clinicalRevision}</p>
                {entry.changeSummary.length>0&&<><h4>What changed</h4><ul>{entry.changeSummary.map((change,index)=><li key={`${entry.id}-change-${index}`}>{change}</li>)}</ul></>}
                <h4>Cleared validation checks</h4>
                <ul>{MEDICATION_VALIDATION_KEYS.map((key)=>{
                  const check=entry.previousValidation.checks[key];
                  return check?<li key={key}><b>{MEDICATION_VALIDATION_LABELS[key].label}</b> — {check.validatedBy}{check.title?` • ${check.title}`:""} • {new Date(check.validatedAt).toLocaleString()}</li>:null;
                })}</ul>
              </details>) : <p>No cleared validations recorded yet.</p>}
            </section>
            <section className="admin-med-history">
              <h3>Review history</h3>'''
replace(marker,insert)
path.write_text(s)
print('Applied validation audit trail to AdminMedicationManager.tsx')
