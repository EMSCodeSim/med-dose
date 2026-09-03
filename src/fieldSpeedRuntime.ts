function ensureNextMedicationAction(){
  const shell=document.getElementById("active-medication-screen-top");
  if(!shell)return;
  const recorded=shell.querySelector(".dashboard-dose-given");
  if(!recorded){shell.querySelector(".speed-next-medication")?.remove();return}
  if(shell.querySelector(".speed-next-medication"))return;
  const dashboard=shell.querySelector(".final-dose-card");
  if(!dashboard)return;
  const button=document.createElement("button");
  button.type="button";
  button.className="speed-next-medication";
  button.innerHTML='<b>NEXT MEDICATION</b><span>Same patient • keep current report</span>';
  button.addEventListener("click",()=>{
    const back=shell.querySelector(".drug-back-button") as HTMLButtonElement|null;
    back?.click();
  });
  dashboard.insertAdjacentElement("afterend",button);
}

if(typeof window!=="undefined"){
  const observer=new MutationObserver(ensureNextMedicationAction);
  window.addEventListener("DOMContentLoaded",()=>{
    ensureNextMedicationAction();
    observer.observe(document.body,{subtree:true,childList:true});
  });
}
