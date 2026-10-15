import assert from "node:assert/strict";
import {createServer} from "vite";
import {Window} from "happy-dom";

const win=new Window({url:"https://mymeddose.test/field"});
for(const name of ["window","document","navigator","localStorage","sessionStorage","HTMLElement"])
  Object.defineProperty(globalThis,name,{configurable:true,value:name==="window"?win:win[name]});
const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent",configFile:"vite.fast-field.config.ts"});
try{
  const release=await server.ssrLoadModule("/src/medicationRelease.ts");
  const store=await server.ssrLoadModule("/src/adminMedicationStore.ts");
  const catalogStore=await server.ssrLoadModule("/src/medicationCatalogStore.ts");
  const row=(version=6)=>({release_version:version,protocol_revision:"July 2026",published_at:"2026-10-15T22:25:45.360766+00:00",medication_count:2,payload:{
    schemaVersion:1,protocolRevision:"July 2026",medicationIds:["adenosine","dextrose"],
    medicationState:{adenosine:{medicationId:"adenosine",history:[]},dextrose:{medicationId:"dextrose",history:[]}},
    reviews:{adenosine:{owner:{reviewer:"a",approvedAt:1},lineSafety:{reviewer:"b",approvedAt:1}},dextrose:{owner:{reviewer:"a",approvedAt:1},lineSafety:{reviewer:"b",approvedAt:1}}},
    catalog:{adenosine:{id:"adenosine",name:"Adenosine",visible:true},dextrose:{id:"dextrose",name:"Dextrose",visible:true}},
    clinicalOverrides:{
      adenosine:{id:"adenosine",doseRules:{adultInitial:"legacy display rule",adultRepeat:"legacy display rule",pediatricInitial:"legacy display rule",pediatricRepeat:"legacy display rule"},concentrations:[{label:"Standard",amount:6,volume:2,amountUnit:"mg",volumeUnit:"mL",concentration:3,concentrationUnit:"mg/mL"}],photoDataUrl:"data:image/jpeg;base64,/9j/2Q==",indications:["Regular narrow-complex AVNRT"]},
      dextrose:{id:"dextrose",paths:[{id:"adult",label:"Adult hypoglycemia",patient:"adult",route:"IV",formula:{kind:"fixed",amount:25,unit:"g"}}],concentrations:[{label:"Standard",amount:25,volume:250,amountUnit:"g",volumeUnit:"mL",concentration:.1,concentrationUnit:"g/mL"}],photoDataUrl:"data:image/webp;base64,UklGRg==",indications:["Hypoglycemia"]},
    },
  }});

  const first=row(1);first.payload.medicationIds=["adenosine"];first.payload.medication_count=1;
  first.payload.medicationState={adenosine:first.payload.medicationState.adenosine};first.payload.reviews={adenosine:first.payload.reviews.adenosine};first.payload.catalog={adenosine:first.payload.catalog.adenosine};first.payload.clinicalOverrides={adenosine:first.payload.clinicalOverrides.adenosine};first.medication_count=1;
  const firstMeta=release.installMedicationRelease(first,{});
  assert.equal(firstMeta.version,1,"fresh install commits release metadata");
  assert.deepEqual(JSON.parse(localStorage.getItem(store.ADMIN_MEDICATION_STATE_KEY)).adenosine.medicationId,"adenosine");

  const upgrade=row(6),upgradeMeta=release.installMedicationRelease(upgrade,{});
  assert.equal(upgradeMeta.version,6,"online upgrade commits newest release");
  assert.equal(upgradeMeta.medicationCount,2,"upgrade metadata reports actual medication count");
  assert.deepEqual(upgradeMeta.medicationIds,["adenosine","dextrose"]);
  assert.ok(JSON.parse(localStorage.getItem(store.CLINICAL_OVERRIDE_KEY)).adenosine.photoDataUrl.startsWith("data:image/jpeg;base64,"),"legacy vial photograph remains stored");
  assert.equal(JSON.parse(localStorage.getItem(store.CLINICAL_OVERRIDE_KEY)).adenosine.concentrations[0].concentration,3,"approved concentration remains unchanged");
  assert.equal(release.readReleaseMeta().version,6,"offline restart reads the last committed release");

  const oldValues=new Map([store.ADMIN_MEDICATION_STATE_KEY,"metro-med-dose-medication-reviews-v1",catalogStore.MEDICATION_CATALOG_KEY,store.CLINICAL_OVERRIDE_KEY,release.FIELD_VISIBILITY_KEY,release.RELEASE_META_KEY].map(key=>[key,localStorage.getItem(key)]));
  const invalid=row(7);invalid.payload.clinicalOverrides.adenosine.doseRules.adultInitial="";
  assert.throws(()=>release.installMedicationRelease(invalid,{}),/schema validation/);
  for(const [key,value] of oldValues)assert.equal(localStorage.getItem(key),value,`failed schema validation preserves ${key}`);

  const underlyingStorage=localStorage;let injected=false;
  const failingStorage={getItem:underlyingStorage.getItem.bind(underlyingStorage),removeItem:underlyingStorage.removeItem.bind(underlyingStorage),clear:underlyingStorage.clear.bind(underlyingStorage),key:underlyingStorage.key.bind(underlyingStorage),get length(){return underlyingStorage.length},setItem(key,value){if(key===catalogStore.MEDICATION_CATALOG_KEY&&!injected){injected=true;const err=new Error("quota");err.name="QuotaExceededError";throw err;}return underlyingStorage.setItem(key,value)}};
  Object.defineProperty(win,"localStorage",{configurable:true,value:failingStorage});
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:failingStorage});
  assert.throws(()=>release.installMedicationRelease(row(7),{}),error=>error.kind==="storage"&&/previous verified library was kept/.test(error.message));
  Object.defineProperty(win,"localStorage",{configurable:true,value:underlyingStorage});
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:underlyingStorage});
  for(const [key,value] of oldValues)assert.equal(localStorage.getItem(key),value,`failed storage write rolls back ${key}`);

  const duplicate=row(7);duplicate.payload.medicationIds.push("adenosine");
  assert.match(release.releasePayloadValidationError(duplicate.payload),/duplicate IDs/);
  console.log("Medication release regression checks passed (fresh install, upgrade, offline restart, schema rejection, storage rollback, legacy doseRules compatibility).");
}finally{await server.close();win.happyDOM.abort();}
