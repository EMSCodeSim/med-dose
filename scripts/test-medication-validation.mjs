import assert from "node:assert/strict";
import {createServer} from "vite";
import {Window} from "happy-dom";
import React,{act,useState} from "react";
import {createRoot} from "react-dom/client";

const win=new Window({url:"http://localhost/admin"});
for(const name of ["window","document","navigator","localStorage","sessionStorage","HTMLElement","history"])
  Object.defineProperty(globalThis,name,{configurable:true,value:name==="window"?win:win[name]});
globalThis.requestAnimationFrame=win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame=win.cancelAnimationFrame.bind(win);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
win.confirm=()=>true;
const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
try{
  const validation=await server.ssrLoadModule("/src/medicationValidation.ts");
  const store=await server.ssrLoadModule("/src/adminMedicationStore.ts");
  const data={paths:[{patient:"adult"},{patient:"pediatric"}],concentrations:[{label:"10 mg/mL"}]};
  const record={medicationId:"test",clinicalRevision:3,protocolRevision:"July 2026",history:[],reviewStartedAt:1};
  assert.deepEqual(validation.requiredValidationKeys(data),store.MEDICATION_VALIDATION_KEYS,"Adult, pediatric and concentration medication requires all six checks");
  assert.equal(validation.medicationValidationProgress(record,data).complete,false,"A medication without attestations is blocked");
  const checks=Object.fromEntries(store.MEDICATION_VALIDATION_KEYS.map((key,index)=>[key,{validatedBy:index%2?"Reviewer B":"Reviewer A",title:"Medical Director",validatedAt:100+index}]));
  record.validation={...validation.validationTarget(record),checks};
  const complete=validation.medicationValidationProgress(record,data);
  assert.equal(complete.complete,true);
  assert.equal(complete.completed.length,6);
  assert.deepEqual(validation.validationReviewers(record.validation),["Reviewer A","Reviewer B"]);
  record.draft={changed:true};
  assert.equal(validation.medicationValidationProgress(record,data).complete,false,"A clinical draft invalidates the prior revision's validation");
  record.validation={...validation.validationTarget(record),checks};
  assert.equal(record.validation.clinicalRevision,4);
  assert.equal(validation.medicationValidationProgress(record,data).complete,true,"Validation for the draft revision may pass");
  record.protocolRevision="October 2026";
  assert.equal(validation.medicationValidationProgress(record,data).complete,false,"A protocol revision invalidates prior validation");
  const adultOnly={paths:[{patient:"adult"}],concentrations:[]};
  assert.deepEqual(validation.requiredValidationKeys(adultOnly),["protocol","formula","concentration","adult","edgeCases"],"Concentration or supplied-strength validation remains required when pediatric testing is not applicable");

  const {default:AdminMedicationManager}=await server.ssrLoadModule("/src/AdminMedicationManager.tsx");
  const {releasedFieldMedicationDefinitions}=await server.ssrLoadModule("/src/expandedFieldMedicationDefinitions.ts");
  assert.equal(releasedFieldMedicationDefinitions.length,23);
  for(const item of releasedFieldMedicationDefinitions)
    assert.ok(validation.requiredValidationKeys(item).includes("concentration"),`${item.name} requires concentration or supplied-strength validation`);
  const fentanyl=releasedFieldMedicationDefinitions.find(item=>item.id==="fentanyl");
  const medication={id:fentanyl.id,name:fentanyl.name,brand:"Fentanyl",sub:"Opioid analgesic",protocol:{id:fentanyl.protocolId,name:fentanyl.name,page:fentanyl.page},visible:true};
  localStorage.setItem(store.ADMIN_MEDICATION_STATE_KEY,JSON.stringify({fentanyl:{medicationId:"fentanyl",clinicalRevision:1,protocolRevision:"July 2026",history:[]}}));
  const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
  function Harness(){const [reviews,setReviews]=useState({});return React.createElement(AdminMedicationManager,{medications:[medication],reviews,setReviews,reviewerIdentity:"reviewer@example.com",close:()=>{}})}
  await act(async()=>{root.render(React.createElement(Harness));await new Promise(resolve=>setTimeout(resolve,30))});
  assert.ok(host.querySelector(".admin-med-modal.dashboard-view"),"Admin dashboard exposes the desktop workspace layout hook");
  assert.ok(host.textContent.includes("Needs attention"),"Admin combines incomplete medications into the primary work list");
  const addMedication=[...host.querySelectorAll("button")].find(button=>button.textContent.includes("Add medication"));
  await act(async()=>{addMedication.click();await new Promise(resolve=>setTimeout(resolve,20))});
  assert.equal(host.querySelectorAll(".admin-new-med input").length,2,"Initial medication creation asks only for name and protocol ID");
  const cancelAdd=[...host.querySelectorAll(".admin-new-med button")].find(button=>button.textContent==="Cancel");
  await act(async()=>{cancelAdd.click();await new Promise(resolve=>setTimeout(resolve,20))});
  const makeLive=[...host.querySelectorAll("button")].find(button=>button.textContent.includes("Make release"));
  assert.equal(makeLive.disabled,true,"Make Live is blocked while formal validation is incomplete");
  await act(async()=>{host.querySelector(".admin-med-row button").click();await new Promise(resolve=>setTimeout(resolve,20))});
  assert.ok(host.textContent.includes("Complete medication validation"));
  const startReview=[...host.querySelectorAll("button")].find(button=>button.textContent.includes("Start review & validation"));
  assert.ok(startReview,"Admin presents the review start action before validation");
  assert.ok(host.innerHTML.indexOf("Start review &amp; validation")<host.innerHTML.indexOf("STEP 2 • FORMAL VALIDATION"),"Review start action appears before validation controls");
  await act(async()=>{startReview.click();await new Promise(resolve=>setTimeout(resolve,20))});
  const markPassed=[...host.querySelectorAll("button")].find(button=>button.textContent==="Mark passed");
  assert.ok(markPassed,"A required validation check can be attested during review");
  await act(async()=>{markPassed.click();await new Promise(resolve=>setTimeout(resolve,20))});
  assert.ok(host.textContent.includes("Passed by reviewer@example.com"),"Validator identity is displayed in Admin");
  await act(async()=>root.unmount());await win.happyDOM.close();
  console.log("Medication validation tests passed: six-part checklist, revision invalidation, reviewer audit and applicability rules.");
}finally{await server.close()}
