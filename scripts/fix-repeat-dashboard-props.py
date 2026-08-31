from pathlib import Path
p=Path('src/FentanylDoseDashboard.tsx')
s=p.read_text()
old='''export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive}:Props){'''
new='''export default function FentanylDoseDashboard({medication,ready,previewReady,dose,volume,doseDetail,giveLabel="GIVE NOW",giveText,giveDetail,giveDisabled,showGiveAction=true,onGive,repeat,recorded}:Props){'''
if old not in s:
    if 'onGive,repeat,recorded}:Props)' in s:
        print('repeat props already restored')
    else:
        raise SystemExit('dashboard signature anchor not found')
else:
    p.write_text(s.replace(old,new,1))
    print('repeat and recorded props restored to dashboard signature')
