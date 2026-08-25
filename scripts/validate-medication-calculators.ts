import {genericMedications} from "../src/dmpMedicationData";
import {calculateGenericDose,genericEligibilityReason} from "../src/DmpMedicationCalculator";
const failures:string[]=[];
function expect(med:string,path:string,age:number,kg:number,dose:number,minDose=0){const p=genericMedications[med]?.paths.find(x=>x.id===path);if(!p)return failures.push(`Missing ${med}/${path}`);const r=calculateGenericDose(p,age,kg,med);if(!r.numeric||Math.abs(r.dose-dose)>.0001||Math.abs(r.minDose-minDose)>.0001)failures.push(`${med}/${path}: expected ${minDose?`${minDose}-`:""}${dose}, received ${r.text}`)}
expect("amiodarone","adult-arrest-1",40,80,300);
expect("amiodarone","ped-arrest",8,20,100);
expect("antiemetics","prom-ped",8,20,12.5);
expect("antipsychotics","drop-ped",9,30,.75);
expect("antipsychotics","olan-ped",9,30,2.5);
expect("antipsychotics","olan-ped",10,35,5);
expect("antipsychotics","drop-adult",70,80,2.5);
expect("atropine","brady-ped",2,5,.1);
expect("calcium","gluconate-ccb-ped",8,20,1000);
expect("dextrose","ped-d10",8,20,10);
expect("diltiazem","initial",50,80,20);
expect("diltiazem","initial",70,80,10);
expect("diltiazem","repeat",70,80,14);
expect("dopamine","infusion-5",50,80,400);
expect("dopamine","infusion-20",50,80,1600);
expect("hydroxocobalamin","ped",8,20,1400);
expect("lorazepam","ped-seizure",8,30,3);
expect("diazepam","adult-seizure",40,45,2.5);
expect("lorazepam","adult-seizure",70,80,2);
expect("morphine","adult",40,80,10,5);
expect("morphine","adult",70,80,5,2.5);
expect("hydromorphone","adult",70,80,.25);
expect("morphine","ped",8,80,6);
expect("sodium-bicarbonate","hyperk",8,20,20);
const ket=genericMedications.nsaids.paths.find(x=>x.id==="ket-adult")!;
if(!genericEligibilityReason(ket,66,80))failures.push("Ketorolac over-65 hard stop missing");
const atropinePoison=genericMedications.atropine.paths.find(x=>x.id==="poison-adult")!;
if(!genericEligibilityReason(atropinePoison,40,39))failures.push("Adult organophosphate under-40 kg hard stop missing");
const all=Object.values(genericMedications);if(all.length!==29)failures.push(`Expected 29 generic medication calculators, found ${all.length}`);
for(const med of all){if(!med.paths.length)failures.push(`${med.id} has no pathways`);for(const p of med.paths){const f=p.formula;if(f.kind==="fixed"&&f.amount<=0)failures.push(`${med.id}/${p.id} fixed dose invalid`);if(f.kind==="perKg"&&f.amount<=0)failures.push(`${med.id}/${p.id} weight dose invalid`)}}
if(failures.length){console.error(failures.join("\n"));process.exit(1)}
console.log(`Validated ${all.length} generic medications and ${all.reduce((n,x)=>n+x.paths.length,0)} dose pathways.`);
