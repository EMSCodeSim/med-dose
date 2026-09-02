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

function referenceDose(formula,age,kg){
  switch(formula.kind){
    case "instruction": return {numeric:false,text:String(formula.text||"")};
    case "fixed": return {numeric:true,dose:Number(formula.amount),minDose:0,unit:formula.unit};
    case "range": return {numeric:true,dose:Number(formula.max),minDose:Number(formula.min),unit:formula.unit};
    case "perKg": {
      let dose=Number(formula.amount)*kg;
      if(formula.min!==undefined)dose=Math.max(dose,Number(formula.min));
      if(formula.max!==undefined)dose=Math.min(dose,Number(formula.max));
      return {numeric:true,dose,minDose:0,unit:formula.unit};
    }
    case "ageBands": {
      const band=formula.bands.find(x=>age>=Number(x.min)&&age<Number(x.max))||formula.bands.at(-1);
      return {numeric:true,dose:Number(band?.amount||0),minDose:0,unit:formula.unit};
    }
    default:return {numeric:false,text:"Unknown formula"};
  }
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
      const ref=referenceDose(f,age,kg);
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

  if(failures.length){console.error(`Clinical release validation failed (${failures.length}):\n- ${failures.join("\n- ")}`);process.exitCode=1}
  else console.log(`Clinical release validation passed: ${meds.length} released medications, ${pathCount} dose pathways, one shared workflow, independent dose checks enabled.`);
}finally{
  await server.close();
}
