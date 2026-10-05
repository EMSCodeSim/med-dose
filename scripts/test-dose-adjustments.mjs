import assert from "node:assert/strict";
import {createServer} from "vite";
import {Window} from "happy-dom";
import React,{act} from "react";
import {createRoot} from "react-dom/client";

const win=new Window({url:"http://localhost/"});
for(const name of ["window","document","navigator","sessionStorage","localStorage","HTMLElement","HTMLInputElement","history"])
  Object.defineProperty(globalThis,name,{configurable:true,value:name==="window"?win:win[name]});
globalThis.requestAnimationFrame=win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame=win.cancelAnimationFrame.bind(win);
globalThis.Event=win.Event;
globalThis.InputEvent=win.InputEvent;
globalThis.scrollTo=()=>{};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.fetch=async()=>{throw new Error("Offline test")};
const server=await createServer({configFile:"vite.fast-field.config.ts",server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
const click=async(fragment)=>{
  const button=[...host.querySelectorAll("button")].find(item=>!item.disabled&&item.textContent.includes(fragment));
  assert.ok(button,`Available enabled button contains "${fragment}"`);
  await act(async()=>{button.click();await new Promise(resolve=>setTimeout(resolve,30))});
  return button;
};
const setInput=async(input,value)=>{
  const reactPropsKey=Object.keys(input).find(key=>key.startsWith("__reactProps$"));
  assert.ok(reactPropsKey,"React input handler is attached");
  await act(async()=>{
    input[reactPropsKey].onChange({target:{value},currentTarget:input});
    await new Promise(resolve=>setTimeout(resolve,30));
  });
};

try{
  const {default:MedicationEngine}=await server.ssrLoadModule("/src/MedicationEngine.tsx");
  const {fieldMedicationDefinition}=await server.ssrLoadModule("/src/expandedFieldMedicationDefinitions.ts");
  const fentanyl=fieldMedicationDefinition("fentanyl");
  const lower=fentanyl.paths.find(path=>path.id==="adult-ivio-low");
  assert.ok(lower,"Adult 1 mcg/kg Fentanyl pathway is defined");
  const entries=[];
  const patient={age:"40",ageUnit:"years",weight:"90",weightUnit:"kg",weightSource:"test patient"};
  await act(async()=>root.render(React.createElement(MedicationEngine,{
    medication:{...fentanyl,paths:[lower]},
    close:()=>{},record:entry=>entries.push(entry),openProtocol:()=>{},initialMeasurements:patient,
  })));

  await click("Moderate to severe pain");
  const routeButton=host.querySelector(".route-options button");
  assert.ok(routeButton,`Route choices render after selecting the pathway: ${host.textContent.slice(-500)}`);
  await act(async()=>{routeButton.click();await new Promise(resolve=>setTimeout(resolve,30))});
  assert.ok(host.textContent.includes("Confirm medication concentration"),`After route selection: ${host.textContent.slice(-1000)}`);
  const defaultConcentration=[...host.querySelectorAll(".concentration-options button")].find(button=>!button.textContent.includes("Different concentration"));
  assert.ok(defaultConcentration,"A configured Fentanyl concentration is available for confirmation");
  await act(async()=>{defaultConcentration.click();await new Promise(resolve=>setTimeout(resolve,30))});
  const safety=[...host.querySelectorAll('input[type="checkbox"]')].find(input=>!input.disabled);
  assert.ok(safety,"Fentanyl contraindication and safety checks remain required");
  await act(async()=>{safety.click();await new Promise(resolve=>setTimeout(resolve,30))});
  assert.ok(host.textContent.includes("GIVE 90 mcg"),"Initial final dose for 90 kg at 1 mcg/kg remains 90 mcg");

  await click("CHANGE AMOUNT");
  const amount=host.querySelector(".final-dose-editor input");
  assert.equal(amount?.value,"90","Change Dose editor starts at the calculated dose, not the pathway maximum");
  await setInput(amount,"101");
  assert.ok(host.textContent.includes("maximum of 100 mcg"),`An amount above the effective limit is explained inline: ${host.textContent.slice(-700)}`);
  assert.ok(host.textContent.includes("adult single-dose cap"),"The controlling Fentanyl safety rule is named");
  assert.equal(host.querySelector(".dashboard-give-now-inline")?.disabled,true,"An above-maximum dose cannot be recorded");

  await setInput(amount,"1.2345");
  assert.equal(host.querySelector(".final-dose-editor input")?.value,"1.23","Clinician-entered decimals are displayed at the same precision used for recording");
  assert.ok(host.textContent.includes("Draw 0.025 mL"),"Volume math uses the displayed, normalized editable dose");
  await setInput(amount,"100");
  assert.ok(host.textContent.includes("Draw 2 mL"),"Accepted 100 mcg dose uses the confirmed 50 mcg/mL concentration");
  assert.equal(host.querySelector(".dashboard-give-now-inline")?.disabled,false,"The highest permitted dose is accepted");
  await click("GIVE NOW");
  assert.equal(entries.length,1,"The permitted edited dose is recorded exactly once");
  assert.equal(entries[0].dose,100,"The administered dose is recorded as 100 mcg");
  assert.equal(entries[0].volume,2,"The recorded draw volume is 2 mL");
  assert.equal(entries[0].calculatedDose,90,"The initial 90 mcg calculation remains in the record");
  assert.equal(entries[0].doseOverride,true,"The report marks the actual dose as different from the initial calculation");
  assert.ok(entries[0].calculationMath.some(line=>line.includes("100 mcg ÷ 50 mcg/mL = 2 mL")),"Calculation report records dose and confirmed-concentration math");
  assert.equal(host.querySelector(".dashboard-next-dose-action")?.disabled,true,"The repeat action remains locked until its medication-specific timer expires");
  assert.equal(entries.length,1,"The changed-dose flow cannot record a repeat dose before reassessment time");
  console.log("Dose adjustment integration passed: clean editable display, 90 mcg initial dose, 100 mcg accepted and recorded, 101 mcg blocked, 2 mL concentration math, and override audit record.");
}finally{
  await act(async()=>root.unmount());
  await server.close();
  await win.happyDOM.close();
}
