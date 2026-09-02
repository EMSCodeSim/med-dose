import {defineConfig,type Plugin,type UserConfig} from "vite";
import baseConfig from "./vite.config";

const standardizedWorkflow:Plugin={
  name:"standardized-reason-route-workflow",
  enforce:"pre",
  transform(code,id){
    if(!id.endsWith("/src/MedicationEngine.tsx"))return null;

    const exportAnchor="export default function MedicationEngine";
    if(!code.includes(exportAnchor))throw new Error("MedicationEngine export signature changed before standardized workflow transform");

    const helpers=`function standardizedReasonLabel(path:GenericDosePath){
  if(path.agent==="Midazolam")return midazolamReasonLabel(path);
  let label=String(path.label||"");
  label=label.replace(/\\s*[—-]\\s*(?:½|1\\/2|half)\\s*dose option.*$/i,"");
  label=label.replace(/\\s*[—-]\\s*\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|mEq)(?:\\/kg)?\\s*(?:upper-end|lower-dose)?\\s*option.*$/i,"");
  return cleanIndicationLabel(label);
}
function standardizedReasonKey(path:GenericDosePath){
  return path.patient+"|"+standardizedReasonLabel(path).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function standardizedReasonOptions(paths:GenericDosePath[],group:"adult"|"pediatric"|"all",medicationId:string,stockConcentration:number){
  const source=medicationId==="midazolam"?midazolamReasonOptions(paths,group):paths.filter(path=>path.patient===group&&epinephrinePathMatchesConcentration(path,stockConcentration,medicationId));
  const seen=new Set<string>();
  return source.filter(path=>{const key=standardizedReasonKey(path);if(seen.has(key))return false;seen.add(key);return true});
}
function standardizedRoutePaths(paths:GenericDosePath[],selected:GenericDosePath,medicationId:string,stockConcentration:number){
  const key=standardizedReasonKey(selected);
  const source=medicationId==="midazolam"?midazolamRoutePaths(paths,selected):paths.filter(path=>path.patient===selected.patient&&epinephrinePathMatchesConcentration(path,stockConcentration,medicationId));
  return source.filter(path=>standardizedReasonKey(path)===key&&!/-half$/.test(path.id));
}

`;
    code=code.replace(exportAnchor,helpers+exportAnchor);

    const optionsOld='const options=medication.id==="midazolam"?midazolamReasonOptions(agentPaths,group):agentPaths.filter(x=>x.patient===group&&epinephrinePathMatchesConcentration(x,conc,medication.id));';
    const optionsNew='const options=standardizedReasonOptions(agentPaths,group,medication.id,conc);';
    if(!code.includes(optionsOld))throw new Error("MedicationEngine indication options signature changed");
    code=code.replace(optionsOld,optionsNew);

    const reasonOld='<b>{medication.id==="midazolam"?midazolamReasonLabel(x):cleanIndicationLabel(x.label)}</b><span>{medication.id==="midazolam"?"Choose route next":x.protocol}</span>';
    const reasonNew='<b>{standardizedReasonLabel(x)}</b><span>Choose route next</span>';
    if(!code.includes(reasonOld))throw new Error("MedicationEngine reason label signature changed");
    code=code.replace(reasonOld,reasonNew);

    const routeListOld='(medication.id==="midazolam"?Array.from(new Set(midazolamRoutePaths(agentPaths,path).flatMap(p=>routesFor(p.route)))):routeChoices)';
    const routeListNew='Array.from(new Set(standardizedRoutePaths(agentPaths,path,medication.id,conc).flatMap(p=>routesFor(p.route))))';
    if(!code.includes(routeListOld))throw new Error("MedicationEngine route list signature changed");
    code=code.replace(routeListOld,routeListNew);

    const routeMatchOld='if(medication.id==="midazolam"){const matched=midazolamRoutePaths(agentPaths,path).find(p=>routesFor(p.route).includes(x));if(matched){activePath=matched;setPath(matched)}}';
    const routeMatchNew='{const matched=standardizedRoutePaths(agentPaths,path,medication.id,conc).find(p=>routesFor(p.route).includes(x));if(matched){activePath=matched;setPath(matched)}}';
    if(!code.includes(routeMatchOld))throw new Error("MedicationEngine route-to-path signature changed");
    code=code.replace(routeMatchOld,routeMatchNew);

    const routeDetailOld='<span>{medication.id==="midazolam"?midazolamReasonLabel(activePathForRoute(agentPaths,path,x)):"Approved route"}</span>';
    const routeDetailNew='<span>{standardizedReasonLabel(standardizedRoutePaths(agentPaths,path,medication.id,conc).find(p=>routesFor(p.route).includes(x))||path)}</span>';
    if(!code.includes(routeDetailOld))throw new Error("MedicationEngine route detail signature changed");
    code=code.replace(routeDetailOld,routeDetailNew);

    return {code,map:null};
  },
};

const base=baseConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),standardizedWorkflow]});
