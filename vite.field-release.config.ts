import {defineConfig,type Plugin,type UserConfig} from "vite";
import standardizedConfig from "./vite.standardized-workflow.config";

const temporaryFieldRelease:Plugin={
  name:"temporary-field-release-all-source-meds",
  enforce:"post",
  transform(code,id){
    if(!id.endsWith("/src/FieldApp.tsx"))return null;

    const approvalGate='const approvedMeds=useMemo(()=>meds.filter(({status})=>status.state==="approved"),[meds]);';
    const releasedGate='const approvedMeds=useMemo(()=>meds,[meds]);';
    if(!code.includes(approvalGate))throw new Error("FieldApp approval gate signature changed");
    code=code.replace(approvalGate,releasedGate);

    const badgeOld='<em className="reviewed">Reviewed</em><span>Metro DMP {def.protocolId} • Verified {verified}</span>';
    const badgeNew='<em className={status.state==="approved"?"reviewed":"in-review"}>{status.state==="approved"?"Reviewed":"In review"}</em><span>Metro DMP {def.protocolId} • {status.state==="approved"?`Verified ${verified}`:"Review pending"}</span>';
    if(!code.includes(badgeOld))throw new Error("FieldApp review badge signature changed");
    code=code.replace(badgeOld,badgeNew);

    return {code,map:null};
  },
};

const base=standardizedConfig as UserConfig;
export default defineConfig({...base,plugins:[...(base.plugins||[]),temporaryFieldRelease]});
