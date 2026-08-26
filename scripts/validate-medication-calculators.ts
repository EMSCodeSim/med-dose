import {genericMedications} from "../src/dmpMedicationData";
import {calculateGenericDose,genericEligibilityReason} from "../src/DmpMedicationCalculator";
const failures:string[]=[];
function expect(med:string,path:string,age:number,kg:number,dose:number,minDose=0){const p=genericMedications[med]?.paths.find(x=>x.id===path);if(!p)return failures.push(`Missing ${med}/${path}`);const r=calculateGenericDose(p,age,kg,med);if(!r.numeric||Math.abs(r.dose-dose)>.0001||Math.abs(r.minDose-minDose)>.0001)failures.push(`${med}/${path}: expected ${minDose?`${minDose}-`:""}${dose}, received ${r.text}`)}
expect("amiodarone","adult-arrest",40,80,300);
expect("amiodarone","ped-arrest",8,20,100);
expect("antiemetics","prom-ped",8,20,12.5);
expect("antipsychotics","drop-ped",9,30,.75);
expect("antipsychotics","olan-ped",9,30,2.5);
expect("antipsychotics","olan-ped",10,35,5);
expect("antipsychotics","drop-adult",70,80,2.5);
expect("atropine","brady-ped",2,5,.1);
expect("calcium","gluconate-ccb-ped",8,20,1000);
expect("dextrose","ped-d10",8,20,10);
expect("diltiazem","sequence",50,80,20);
expect("diltiazem","sequence",70,80,10);
expect("dopamine","infusion",50,80,400);
expect("hydroxocobalamin","ped",8,20,1400);
expect("lorazepam","ped-seizure",8,30,3);
expect("diazepam","adult-seizure",40,45,2.5);
expect("lorazepam","adult-seizure",70,80,2);
expect("morphine","adult",40,80,10,5);
expect("morphine","adult",70,80,10,5);
expect("hydromorphone","adult",70,80,.5);
expect("morphine","ped",8,80,6);
expect("sodium-bicarbonate","hyperk",8,20,20);
const ket=genericMedications.nsaids.paths.find(x=>x.id==="ket-adult")!;
if(!genericEligibilityReason(ket,66,80))failures.push("Ketorolac over-65 hard stop missing");
const atropinePoison=genericMedications.atropine.paths.find(x=>x.id==="poison-adult")!;
if(!genericEligibilityReason(atropinePoison,40,39))failures.push("Adult organophosphate under-40 kg hard stop missing");
const amiodaroneSequence=genericMedications.amiodarone.paths.find(x=>x.id==="adult-arrest")!;
if(amiodaroneSequence.linkedDose?.amount!==150||amiodaroneSequence.linkedDose.afterMinutes!==3)failures.push("Amiodarone linked 150 mg dose is not configured");
const diltiazemSequence=genericMedications.diltiazem.paths.find(x=>x.id==="sequence")!;
if(diltiazemSequence.linkedDose?.perKg!==.35||diltiazemSequence.linkedDose.afterMinutes!==10)failures.push("Diltiazem linked second dose is not configured");
const dopamineInfusion=genericMedications.dopamine.paths.find(x=>x.id==="infusion")!;
if(dopamineInfusion.titrationRates?.join(",")!=="5,10,15,20"||dopamineInfusion.titrationStepMinutes!==5)failures.push("Dopamine titration sequence is not configured");
const all=Object.values(genericMedications);if(all.length!==29)failures.push(`Expected 29 generic medication calculators, found ${all.length}`);
for(const med of all){if(!med.paths.length)failures.push(`${med.id} has no pathways`);for(const p of med.paths){const f=p.formula;if(f.kind==="fixed"&&f.amount<=0)failures.push(`${med.id}/${p.id} fixed dose invalid`);if(f.kind==="perKg"&&f.amount<=0)failures.push(`${med.id}/${p.id} weight dose invalid`);if(p.repeatAfterMinutes&&!(p.maxAdministrations&&p.maxAdministrations>1)&&!p.openEndedRepeats)failures.push(`${med.id}/${p.id} repeat timer lacks repeat allowance`);if(p.maxAdministrations!==undefined&&p.maxAdministrations<1)failures.push(`${med.id}/${p.id} administration limit invalid`);if(p.maxCumulative!==undefined&&p.maxCumulative<=0)failures.push(`${med.id}/${p.id} cumulative ceiling invalid`)}}
const requiredRepeatConfigs:[[string,string,number],...[string,string,number][]]=[["atropine","brady-adult",3],["naloxone","titrate",4],["morphine","adult",2],["hydromorphone","adult",3],["nitroglycerin","chest",3],["sodium-bicarbonate","hyperk",3]];
for(const [med,path,count] of requiredRepeatConfigs){const p=genericMedications[med].paths.find(x=>x.id===path);if(p?.maxAdministrations!==count)failures.push(`${med}/${path} repeat limit expected ${count}`)}
if(failures.length){console.error(failures.join("\n"));process.exit(1)}
console.log(`Validated ${all.length} generic medications and ${all.reduce((n,x)=>n+x.paths.length,0)} dose pathways.`);
