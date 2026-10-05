import {createServer} from "vite";
import {readFile} from "node:fs/promises";

const failures=[];
const approx=(a,b)=>Math.abs(Number(a)-Number(b))<0.0001;
const requiredFields=["id","label","agent","patient","route","formula","repeat","administration","protocol"];

function representativeAge(path){
  const f=path.formula;
  if(f.kind==="ageBands"&&f.bands?.length){
    const band=f.bands[0];
    return (Number(band.min)+Number(band.max))/2;
  }
  if(path.minAge!==undefined&&path.maxAge!==undefined)return (Number(path.minAge)+Number(path.maxAge))/2;
  if(path.minAge!==undefined)return Math.max(Number(path.minAge),path.patient==="adult"?40:8);
  if(path.maxAge!==undefined)return Math.max(0.01,Number(path.maxAge)/2);
  return path.patient==="adult"?40:path.patient==="pediatric"?8:40;
}

function representativeWeight(path){
  return path.patient==="pediatric"?20:80;
}

function referenceDose(formula,age,kg,medicationId,patient){
  let result;
  switch(formula.kind){
    case "instruction": return {numeric:false,text:String(formula.text||"")};
    case "fixed": result={numeric:true,dose:Number(formula.amount),minDose:0,unit:formula.unit};break;
    case "range": result={numeric:true,dose:Number(formula.max),minDose:Number(formula.min),unit:formula.unit};break;
    case "perKg": {
      let dose=Number(formula.amount)*kg;
      if(formula.min!==undefined)dose=Math.max(dose,Number(formula.min));
      if(formula.max!==undefined)dose=Math.min(dose,Number(formula.max));
      result={numeric:true,dose,minDose:0,unit:formula.unit};break;
    }
    case "ageBands": {
      const band=formula.bands.find(x=>age>=Number(x.min)&&age<Number(x.max))||formula.bands.at(-1);
      result={numeric:true,dose:Number(band?.amount||0),minDose:0,unit:formula.unit};break;
    }
    default:return {numeric:false,text:"Unknown formula"};
  }
  if(medicationId==="fentanyl"&&patient==="adult")result.dose=Math.min(result.dose,age>65?50:100);
  return result;
}

const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
try{
  const release=await server.ssrLoadModule("/src/expandedFieldMedicationDefinitions.ts");
  const config=await server.ssrLoadModule("/src/medicationReleaseConfig.ts");
  const engine=await server.ssrLoadModule("/src/MedicationEngine.tsx");
  const workflow=await server.ssrLoadModule("/src/releaseWorkflow.ts");
  const meds=release.releasedFieldMedicationDefinitions||[];
  const releasedIds=config.DEFAULT_FIELD_MEDICATION_IDS||[];
  if(meds.length!==releasedIds.length)failures.push(`Released medication count mismatch: ${meds.length} definitions for ${releasedIds.length} configured IDs`);
  for(const id of releasedIds){if(!meds.find(m=>m.id===id))failures.push(`${id}: released definition missing`)}

  const engineSource=await readFile(new URL("../src/MedicationEngine.tsx",import.meta.url),"utf8");
  const appSource=await readFile(new URL("../src/UnifiedApp.tsx",import.meta.url),"utf8");
  const expectedStepType=`type Step=${workflow.RELEASED_MEDICATION_WORKFLOW.map(x=>`"${x}"`).join("|")};`;
  if(!engineSource.includes(expectedStepType))failures.push("MedicationEngine workflow no longer matches RELEASED_MEDICATION_WORKFLOW");
  const rendererCount=(appSource.match(/<MedicationEngine\b/g)||[]).length;
  if(rendererCount!==1)failures.push(`Expected one shared MedicationEngine renderer, found ${rendererCount}`);
  if(!engineSource.includes("<small>DOSE MATH</small>"))failures.push("Final Dose no longer exposes dose math");
  if(!engineSource.includes("CONCENTRATION MATH")&&!engineSource.includes("/mL"))failures.push("Final Dose no longer exposes concentration/volume math");

  let pathCount=0;
  for(const med of meds){
    if(!med.paths?.length){failures.push(`${med.id}: no dose pathways`);continue}
    const ids=new Set();
    for(const path of med.paths){
      pathCount++;
      if(ids.has(path.id))failures.push(`${med.id}/${path.id}: duplicate path id`);
      ids.add(path.id);
      for(const field of requiredFields){
        if(path[field]===undefined||path[field]===null||path[field]==="")failures.push(`${med.id}/${path.id}: missing ${field}`);
      }
      const f=path.formula;
      if(!f||!f.kind){failures.push(`${med.id}/${path.id}: formula missing`);continue}
      if(f.kind==="fixed"&&!(Number(f.amount)>0))failures.push(`${med.id}/${path.id}: invalid fixed dose`);
      if(f.kind==="range"&&(!(Number(f.min)>0)||!(Number(f.max)>=Number(f.min))))failures.push(`${med.id}/${path.id}: invalid dose range`);
      if(f.kind==="perKg"&&!(Number(f.amount)>0))failures.push(`${med.id}/${path.id}: invalid weight-based dose`);
      if(path.editableDoseRangePerKg&&(!(Number(path.editableDoseRangePerKg.min)>0)||!(Number(path.editableDoseRangePerKg.max)>=Number(path.editableDoseRangePerKg.min))))failures.push(`${med.id}/${path.id}: invalid editable weight-based range`);
      if(path.editableDoseRangePerKg&&med.id!=="fentanyl")failures.push(`${med.id}/${path.id}: editable range exception is restricted to the Fentanyl pathway`);
      if(f.kind==="ageBands"&&(!Array.isArray(f.bands)||!f.bands.length))failures.push(`${med.id}/${path.id}: age bands missing`);
      if(f.kind==="instruction"&&!String(f.text||"").trim())failures.push(`${med.id}/${path.id}: instruction text missing`);
      const hasCumulativeRepeatCeiling=path.maxCumulative!==undefined||path.maxCumulativePerKg!==undefined||path.absoluteCumulativeMax!==undefined;
      if(path.repeatAfterMinutes&&!(path.maxAdministrations>1)&&!path.openEndedRepeats&&!path.linkedDose&&!hasCumulativeRepeatCeiling)failures.push(`${med.id}/${path.id}: repeat timer has no repeat allowance`);
      if(path.maxAdministrations!==undefined&&path.maxAdministrations<1)failures.push(`${med.id}/${path.id}: invalid maxAdministrations`);

      const age=representativeAge(path),kg=representativeWeight(path);
      const live=engine.calculateGenericDose(path,age,kg,med.id);
      const ref=referenceDose(f,age,kg,med.id,path.patient);
      if(ref.numeric){
        if(!live?.numeric)failures.push(`${med.id}/${path.id}: live engine returned non-numeric result for numeric formula`);
        else {
          if(!Number.isFinite(live.dose)||live.dose<=0)failures.push(`${med.id}/${path.id}: live engine returned invalid dose ${live.dose}`);
          if(live.unit!==ref.unit)failures.push(`${med.id}/${path.id}: unit mismatch ${live.unit} vs ${ref.unit}`);
          if(!approx(live.dose,ref.dose))failures.push(`${med.id}/${path.id}: independent dose check expected ${ref.dose} ${ref.unit}, live engine returned ${live.dose} ${live.unit}`);
          if(ref.minDose&& !approx(live.minDose||0,ref.minDose))failures.push(`${med.id}/${path.id}: range minimum expected ${ref.minDose}, received ${live.minDose||0}`);
        }
      }else if(live?.numeric||!String(live?.text||"").trim())failures.push(`${med.id}/${path.id}: instruction pathway did not return explanatory treatment text`);
    }
  }

  const fentanyl=meds.find(m=>m.id==="fentanyl");
  const adultHigh=fentanyl?.paths.find(path=>path.id==="adult-ivio");
  const adultLow=fentanyl?.paths.find(path=>path.id==="adult-ivio-low");
  const adultInLow=fentanyl?.paths.find(path=>path.id==="adult-in-low");
  const pediatric=fentanyl?.paths.find(path=>path.id==="ped-ivio");
  const pediatricLow=fentanyl?.paths.find(path=>path.id==="ped-ivio-low");
  if(!adultHigh||!adultLow||!adultInLow||!pediatric||!pediatricLow)failures.push("fentanyl: cap regression pathways are missing");
  else{
    const standardAdult=engine.calculateGenericDose(adultHigh,65,80,"fentanyl");
    const olderAdult=engine.calculateGenericDose(adultHigh,66,80,"fentanyl");
    const olderAdultLow=engine.calculateGenericDose(adultLow,66,80,"fentanyl");
    const pediatricDose=engine.calculateGenericDose(pediatric,10,40,"fentanyl");
    const adultLowAtNinety=engine.calculateGenericDose(adultLow,40,90,"fentanyl");
    const adultHighAtNinety=engine.calculateGenericDose(adultHigh,40,90,"fentanyl");
    const initialEntries=[];
    if(!approx(standardAdult.dose,100))failures.push(`fentanyl: 80 kg adult cap expected 100 mcg, received ${standardAdult.dose}`);
    if(!approx(olderAdult.dose,50))failures.push(`fentanyl: 80 kg adult over 65 cap expected 50 mcg, received ${olderAdult.dose}`);
    if(!approx(olderAdultLow.dose,50))failures.push(`fentanyl: lower-dose adult over 65 cap expected 50 mcg, received ${olderAdultLow.dose}`);
    if(!approx(pediatricDose.dose,80))failures.push(`fentanyl: pediatric pathway must remain uncapped at 80 mcg, received ${pediatricDose.dose}`);
    if(!approx(adultLowAtNinety.dose,90))failures.push(`fentanyl: 90 kg adult at 1 mcg/kg should initially calculate 90 mcg, received ${adultLowAtNinety.dose}`);
    if(!approx(adultHighAtNinety.dose,100))failures.push(`fentanyl: 90 kg adult at 2 mcg/kg should remain capped at 100 mcg, received ${adultHighAtNinety.dose}`);
    const adjustableMaximum=engine.nextDoseMaximum(adultLow,adultLowAtNinety,90,initialEntries,40,"IV/IO",50);
    if(!approx(adjustableMaximum,100))failures.push(`fentanyl: 90 kg 1 mcg/kg pathway should permit 100 mcg, received ${adjustableMaximum}`);
    const invalidAmountMessage=engine.doseLimitMessage(adultLow,adultLowAtNinety,90,40,"IV/IO",50,initialEntries,adjustableMaximum,101);
    if(!invalidAmountMessage.includes("100 mcg")||!invalidAmountMessage.includes("adult single-dose cap"))failures.push(`fentanyl: invalid amount explanation should identify the 100 mcg adult cap, received "${invalidAmountMessage}"`);
    if(!engine.doseLimitMessage(adultLow,adultLowAtNinety,90,40,"IV/IO",50,initialEntries,adjustableMaximum,0).includes("greater than 0 mcg"))failures.push("dose editor must explain that zero is not a valid dose");
    if(!approx(engine.nextDoseMaximum(adultLow,adultLowAtNinety,90,initialEntries,66,"IV/IO",50),50))failures.push("fentanyl: age-over-65 50 mcg cap must constrain the editable maximum");
    const intranasalMaximum=engine.nextDoseMaximum(adultInLow,adultLowAtNinety,90,initialEntries,40,"IN",40);
    if(!approx(intranasalMaximum,80))failures.push("fentanyl: IN 1 mL per nostril limit must cap a 40 mcg/mL concentration at 80 mcg");
    const intranasalLimitMessage=engine.doseLimitMessage(adultInLow,adultLowAtNinety,90,40,"IN",40,initialEntries,intranasalMaximum,90);
    if(!intranasalLimitMessage.includes("1 mL-per-nostril IN volume limit"))failures.push("fentanyl: an invalid IN dose should identify the per-nostril volume limit");
    const lowWeightPath={...adultLow,maxCumulativePerKg:3};
    if(!approx(engine.nextDoseMaximum(lowWeightPath,adultLowAtNinety,20,[{dose:55,volume:1,time:1}],40,"IV/IO",50),5))failures.push("fentanyl: cumulative limit must constrain the next editable dose after prior administration");
    const nonFentanyl=meds.find(m=>m.id==="dextrose")?.paths.find(path=>path.id==="ped-d10");
    if(nonFentanyl){const nonFentanylResult=engine.calculateGenericDose(nonFentanyl,8,20,"dextrose");if(!approx(engine.nextDoseMaximum(nonFentanyl,nonFentanylResult,20,[],8,"IV/IO",100),nonFentanylResult.dose))failures.push("non-Fentanyl editable maximum changed from the calculated medication-specific dose");}
  }

  const displayCases=[[2,"2"],[1.5,"1.5"],[1.6666667,"1.67"],[1.6666666666667,"1.67"],[0.3333333,"0.333"]];
  for(const [value,expected] of displayCases)if(engine.fmt(value)!==expected||engine.formatEditableDose(String(value))!==expected)failures.push(`dose display precision: ${value} should render as ${expected}`);
  if(engine.formatEditableDose("2.")!=="2."||engine.formatEditableDose("")!=="")failures.push("dose editor should preserve an in-progress decimal entry");

  if(!engineSource.includes('setActual(String(result.minDose||result.dose))'))failures.push("MedicationEngine no longer synchronizes the administration amount after a dose-changing patient edit");

  const ketorolac=meds.find(m=>m.id==="ketorolac");
  const ketAdult=ketorolac?.paths.find(path=>path.id==="ket-adult");
  const ketPediatric=ketorolac?.paths.find(path=>path.id==="ket-ped");
  if(!ketorolac||!ketAdult||!ketPediatric)failures.push("ketorolac: adult and pediatric July 2026 protocol pathways are required");
  else{
    const adultDose=engine.calculateGenericDose(ketAdult,65,80,"ketorolac");
    const pediatricDose=engine.calculateGenericDose(ketPediatric,10,30,"ketorolac");
    if(!approx(adultDose.dose,15))failures.push(`ketorolac: adult dose expected 15 mg, received ${adultDose.dose}`);
    if(!approx(pediatricDose.dose,10))failures.push(`ketorolac: pediatric dose expected 10 mg, received ${pediatricDose.dose}`);
    if(engine.genericEligibilityReason(ketAdult,65,80))failures.push("ketorolac: age 65 must remain eligible");
    if(!engine.genericEligibilityReason(ketAdult,65.01,80))failures.push("ketorolac: over age 65 hard stop is missing");
    if(!engine.genericEligibilityReason(ketPediatric,7.99,30))failures.push("ketorolac: under age 8 hard stop is missing");
    if(ketAdult.route!=="IV/IM"||ketPediatric.route!=="IV/IM")failures.push("ketorolac: both pathways must remain IV or IM");
    for(const path of [ketAdult,ketPediatric]){
      if(!Array.isArray(path.monitoring)||path.monitoring.length<4)failures.push(`ketorolac/${path.id}: protocol-specific monitoring is incomplete`);
      if(!Array.isArray(path.special)||!path.special.some(item=>item.includes("Paramedic")))failures.push(`ketorolac/${path.id}: Paramedic-only restriction is missing`);
    }
    if(!Array.isArray(ketorolac.clinicalOverview)||ketorolac.clinicalOverview.length<6)failures.push("ketorolac: clinical overview must include mechanism, onset, duration, indications, multimodal guidance, and interactions");
    else if(!ketorolac.clinicalOverview.some(item=>item.includes("within 5 minutes"))||!ketorolac.clinicalOverview.some(item=>item.includes("4 hours")))failures.push("ketorolac: IV onset or duration is missing from the clinical overview");
  }

  const droperidol=meds.find(m=>m.id==="droperidol");
  const dropAdult=droperidol?.paths.find(path=>path.id==="drop-adult");
  const dropImminent=droperidol?.paths.find(path=>path.id==="drop-imminent");
  const dropPediatric=droperidol?.paths.find(path=>path.id==="drop-ped");
  const dropAntiemetic=droperidol?.paths.find(path=>path.id==="drop-antiemetic");
  if(!droperidol||!dropAdult||!dropImminent||!dropPediatric||!dropAntiemetic)failures.push("droperidol: all four July 2026 protocol pathways are required");
  else{
    const cases=[
      ["adult agitation under 65",dropAdult,64,80,5],
      ["adult agitation age 65+",dropAdult,65,80,2.5],
      ["imminent harm under 65",dropImminent,64,80,10],
      ["imminent harm age 65+",dropImminent,65,80,5],
      ["adult antiemetic under 65",dropAntiemetic,64,80,1.25],
      ["adult antiemetic age 65+",dropAntiemetic,65,80,.625],
      ["pediatric 30 kg",dropPediatric,10,30,.75],
      ["pediatric maximum",dropPediatric,11,60,1.25],
    ];
    for(const [label,path,age,kg,expected] of cases){
      const result=engine.calculateGenericDose(path,age,kg,"droperidol");
      if(!approx(result.dose,expected))failures.push(`droperidol: ${label} expected ${expected} mg, received ${result.dose}`);
    }
    for(const path of [dropAdult,dropImminent,dropPediatric,dropAntiemetic]){
      if(!Array.isArray(path.monitoring)||path.monitoring.length<3)failures.push(`droperidol/${path.id}: protocol-specific monitoring is incomplete`);
    }
    if(!Array.isArray(droperidol.clinicalOverview)||droperidol.clinicalOverview.length<4)failures.push("droperidol: clinical overview must include mechanism, onset, duration, and indication scope");
    else if(!droperidol.clinicalOverview.some(item=>item.includes("5–10 minutes"))||!droperidol.clinicalOverview.some(item=>item.includes("2–4 hours")))failures.push("droperidol: onset or duration is missing from the clinical overview");
    if(dropAdult.repeatAfterMinutes!==5||dropAdult.maxAdministrations!==2)failures.push("droperidol: adult agitation repeat must remain one repeat after 5 minutes");
    if(dropImminent.route!=="IM")failures.push("droperidol: imminent-harm pathway must remain IM-only");
    if(dropPediatric.formula.kind!=="perKg"||!approx(dropPediatric.formula.amount,.025)||!approx(dropPediatric.formula.max,1.25))failures.push("droperidol: pediatric pathway must remain 0.025 mg/kg, maximum 1.25 mg");
  }

  if(failures.length){console.error(`Clinical release validation failed (${failures.length}):\n- ${failures.join("\n- ")}`);process.exitCode=1}
  else console.log(`Clinical release validation passed: ${meds.length} released medications, ${pathCount} dose pathways, one shared workflow, independent dose checks enabled.`);
}finally{
  await server.close();
}
