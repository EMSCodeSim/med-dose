import {useMemo,useState} from "react";
import AdminMedicationManager from "./AdminMedicationManager";
import {releasedFieldMedicationDefinitions} from "./expandedFieldMedicationDefinitions";
import {mergeMedicationCatalog,type CatalogMedication} from "./medicationCatalogStore";
import type {ReviewSignatures} from "./adminMedicationStore";

const REVIEW_KEY="metro-med-dose-medication-reviews-v1";
type Reviews=Record<string,ReviewSignatures>;

function readReviews():Reviews{
  try{return JSON.parse(localStorage.getItem(REVIEW_KEY)||"{}") as Reviews}catch{return {}}
}

function baseCatalog():CatalogMedication[]{
  return releasedFieldMedicationDefinitions.map(def=>({
    id:def.id,
    name:def.name,
    brand:"",
    sub:def.paths[0]?.protocol||`DMP ${def.protocolId}`,
    protocol:{id:def.protocolId,name:def.name,page:def.page},
    visible:true,
  }));
}

export default function AdminRoute(){
  const [reviews,setReviewsState]=useState<Reviews>(readReviews);
  const catalog=useMemo(()=>mergeMedicationCatalog(baseCatalog()),[]);
  const setReviews=(next:Reviews)=>{
    setReviewsState(next);
    try{localStorage.setItem(REVIEW_KEY,JSON.stringify(next))}catch{}
  };
  return <div className="admin-route-shell">
    <AdminMedicationManager
      medications={catalog}
      reviews={reviews}
      setReviews={setReviews}
      openLegacyReview={()=>window.location.assign("/")}
      close={()=>window.location.assign("/")}
    />
  </div>;
}
