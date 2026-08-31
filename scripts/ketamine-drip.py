from pathlib import Path

# Field runtime definition
p=Path('src/fieldMedicationDefinitions.ts')
s=p.read_text()
old='''{id:"adult-analgesia",label:"Moderate to severe pain — adult analgesia waiver",agent:"Ketamine",patient:"adult",route:"IV/IO",formula:kg(.25,"mg"),repeat:"One standing-order repeat after reassessment; Base contact for subsequent doses.",administration:"Mix in 50–100 mL NS and administer over 5–10 minutes when conditions allow. Slow IV push may be used when mixing is not possible but may cause more dysphoria.",protocol:"Ketamine Waiver: Analgesia",volumeRequired:true,maxAdministrations:2,monitoring:["Continuous cardiac monitoring","Pulse oximetry","Continuous waveform capnography","BVM ventilation and suction immediately available"]}'''
new='''{id:"adult-analgesia",label:"Moderate to severe pain — adult analgesia waiver",agent:"Ketamine",patient:"adult",route:"IV/IO drip",formula:kg(.25,"mg"),repeat:"One standing-order repeat after reassessment; Base contact for subsequent doses.",administration:"IV/IO drip/infusion: mix in 50–100 mL NS and administer over 5–10 minutes when conditions allow. Slow IV push may be used when mixing is not possible but may cause more dysphoria.",protocol:"Ketamine Waiver: Analgesia",volumeRequired:true,maxAdministrations:2,monitoring:["Continuous cardiac monitoring","Pulse oximetry","Continuous waveform capnography","BVM ventilation and suction immediately available"]}'''
if old not in s:
    raise SystemExit('Ketamine runtime pathway anchor not found')
s=s.replace(old,new,1)
p.write_text(s)

# Admin/default definition
p=Path('src/AdminMedicationManager.tsx')
s=p.read_text()
old='''ketamine:{id:"ketamine",name:"Ketamine",protocolId:"500:62",page:1,category:"Adult analgesia waiver",indications:["Moderate to severe pain in an adult"],routes:["IV/IO"],concentrations:[{label:"200 mg / 20 mL",amount:200,amountUnit:"mg",volume:20,volumeUnit:"mL",concentration:10,concentrationUnit:"mg/mL"}],doseRules:{adult:"0.25 mg/kg",rounding:"Waiver chart uses whole-mg dose",repeat:"One standing-order repeat after reassessment; Base contact for subsequent doses"},contraindications:["Pediatric patient","Penetrating eye trauma"],monitoring:["Continuous cardiac monitoring","Pulse oximetry","Continuous waveform capnography","BVM ventilation and suction immediately available"],administration:["Mix in 50–100 mL NS","Administer over 5–10 minutes when conditions allow","Slow IV push permitted when mixing is not possible but may cause more dysphoria"]}'''
new='''ketamine:{id:"ketamine",name:"Ketamine",protocolId:"500:62",page:1,category:"Adult analgesia waiver",indications:["Moderate to severe pain in an adult"],routes:["IV/IO drip"],concentrations:[{label:"200 mg / 20 mL",amount:200,amountUnit:"mg",volume:20,volumeUnit:"mL",concentration:10,concentrationUnit:"mg/mL"}],doseRules:{adult:"0.25 mg/kg",rounding:"Waiver chart uses whole-mg dose",repeat:"One standing-order repeat after reassessment; Base contact for subsequent doses"},contraindications:["Pediatric patient","Penetrating eye trauma"],monitoring:["Continuous cardiac monitoring","Pulse oximetry","Continuous waveform capnography","BVM ventilation and suction immediately available"],administration:["IV/IO drip/infusion","Mix in 50–100 mL NS","Administer over 5–10 minutes when conditions allow","Slow IV push permitted when mixing is not possible but may cause more dysphoria"]}'''
if old not in s:
    raise SystemExit('Ketamine admin default anchor not found')
s=s.replace(old,new,1)
p.write_text(s)

print('Ketamine drip/infusion pathway enabled')
