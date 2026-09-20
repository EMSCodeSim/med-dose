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
  const pediatric=fentanyl?.paths.find(path=>path.id==="ped-ivio");
  if(!adultHigh||!adultLow||!pediatric)failures.push("fentanyl: cap regression pathways are missing");
  else{
    const standardAdult=engine.calculateGenericDose(adultHigh,65,80,"fentanyl");
    const olderAdult=engine.calculateGenericDose(adultHigh,66,80,"fentanyl");
    const olderAdultLow=engine.calculateGenericDose(adultLow,66,80,"fentanyl");
    const pediatricDose=engine.calculateGenericDose(pediatric,10,40,"fentanyl");
    if(!approx(standardAdult.dose,100))failures.push(`fentanyl: 80 kg adult cap expected 100 mcg, received ${standardAdult.dose}`);
    if(!approx(olderAdult.dose,50))failures.push(`fentanyl: 80 kg adult over 65 cap expected 50 mcg, received ${olderAdult.dose}`);
    if(!approx(olderAdultLow.dose,50))failures.push(`fentanyl: lower-dose adult over 65 cap expected 50 mcg, received ${olderAdultLow.dose}`);
    if(!approx(pediatricDose.dose,80))failures.push(`fentanyl: pediatric pathway must remain uncapped at 80 mcg, received ${pediatricDose.dose}`);
  }

  if(!engineSource.includes('setActual(String(result.minDose||result.dose))'))failures.push("MedicationEngine no longer synchronizes the administration amount after a dose-changing patient edit");

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
