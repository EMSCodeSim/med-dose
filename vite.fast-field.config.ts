import {defineConfig,type Plugin,type UserConfig} from "vite";
import fieldReleaseConfig from "./vite.field-release.config";

const fastFieldWorkflow:Plugin={
  name:"paramedic-fast-field-workflow",
  enforce:"pre",
  transform(code,id){
    if(id.endsWith("/src/FieldApp.tsx")){
      const openOld='const openMed=(id:string)=>{if(!approvedIds.has(id))return;setSelectedId(id);setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,5));scrollTo({top:0,behavior:"auto"})};';
      const openNew='const openMed=(id:string)=>{if(!approvedIds.has(id))return;setPatient(readPatient());setSelectedId(id);setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,5));scrollTo({top:0,behavior:"auto"})};';
      if(!code.includes(openOld))throw new Error("FieldApp open-med signature changed before fast workflow");
      code=code.replace(openOld,openNew);
      return {code,map:null};
    }

    if(id.endsWith("/src/MedicationEngine.tsx")){
      const ageOld='[age,setAge]=useState(initialPatient?.ageYears!==undefined?String(initialPatient.ageYears):"")';
      const ageNew='[age,setAge]=useState(()=>{try{const carried=JSON.parse(sessionStorage.getItem("mmd-patient")||"{}");const saved=carried.ageYears!==undefined&&String(carried.ageYears)!==""?Number(carried.ageYears):undefined;const value=initialPatient?.ageYears??saved;return value!==undefined?String(value):""}catch{return initialPatient?.ageYears!==undefined?String(initialPatient.ageYears):""}})';
      if(!code.includes(ageOld))throw new Error("MedicationEngine age carry-forward signature changed");
      code=code.replace(ageOld,ageNew);

      const weightOld='[weight,setWeight]=useState(initialPatient?.weightKg!==undefined?String(initialPatient.weightKg):"")';
      const weightNew='[weight,setWeight]=useState(()=>{try{const carried=JSON.parse(sessionStorage.getItem("mmd-patient")||"{}");const saved=carried.weightKg!==undefined&&String(carried.weightKg)!==""?Number(carried.weightKg):undefined;const value=initialPatient?.weightKg??saved;return value!==undefined?String(value):""}catch{return initialPatient?.weightKg!==undefined?String(initialPatient.weightKg):""}})';
      if(!code.includes(weightOld))throw new Error("MedicationEngine weight carry-forward signature changed");
      code=code.replace(weightOld,weightNew);

      const effectAnchor='  useEffect(()=>{if(!secondsLeft)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[secondsLeft]);';
      const fastEffects=`  // Experienced-user fast path: if the selected reason leaves only one
  // protocol-approved route, run the existing route button handler automatically.
  // This preserves all pathway matching and safety logic while removing a redundant tap.
  useEffect(()=>{
    if(step!=="route"||!path||route)return;
    const choices=Array.from(new Set(standardizedRoutePaths(agentPaths,path,medication.id,conc).flatMap(p=>routesFor(p.route))));
    if(choices.length!==1)return;
    const timer=window.setTimeout(()=>{
      const buttons=Array.from(document.querySelectorAll("#active-medication-screen-top .route-options button")) as HTMLButtonElement[];
      if(buttons.length===1&&!buttons[0].disabled)buttons[0].click();
    },0);
    return()=>window.clearTimeout(timer);
  },[step,path,route,agentPaths,medication.id,conc]);

  // For medications with one stable field concentration, accept the standard
  // concentration on the initial pass. Epinephrine and other concentration-sensitive
  // medications remain explicit, and editing concentration from the final screen never auto-confirms.
  useEffect(()=>{
    if(step!=="concentration"||returnToResult||concConfirmed||customConcentrationMode||!fieldConcentration)return;
    const fastStandard=new Set(["adenosine","fentanyl","ondansetron","midazolam","naloxone","ketorolac","diphenhydramine"]);
    if(!fastStandard.has(medication.id))return;
    const timer=window.setTimeout(()=>{
      const button=document.querySelector("#active-medication-screen-top .concentration-options button") as HTMLButtonElement|null;
      if(button&&!button.disabled)button.click();
    },0);
    return()=>window.clearTimeout(timer);
  },[step,returnToResult,concConfirmed,customConcentrationMode,fieldConcentration,medication.id]);

${effectAnchor}`;
      if(!code.includes(effectAnchor))throw new Error("MedicationEngine fast-effect anchor changed");
      code=code.replace(effectAnchor,fastEffects);
      return {code,map:null};
    }
    return null;
  },
};

const base=fieldReleaseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),fastFieldWorkflow]});
