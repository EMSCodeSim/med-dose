import {useEffect,useState} from "react";
import "./installAppGuide.css";

const DISMISSED_KEY="mmd-ios-install-guide-dismissed";
const isInstalled=()=>window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
const isAppleMobile=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);

export default function InstallAppGuide({variant="button"}:{variant?:"button"|"card"}){
  const [open,setOpen]=useState(false);
  const [installed,setInstalled]=useState(isInstalled);
  const [showCard,setShowCard]=useState(()=>isAppleMobile()&&!isInstalled()&&localStorage.getItem(DISMISSED_KEY)!=="yes");

  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const update=()=>setInstalled(isInstalled());
    media.addEventListener?.("change",update);
    return()=>media.removeEventListener?.("change",update);
  },[]);

  if(installed)return variant==="button"?<span className="field-installed-badge">✓ Installed</span>:null;

  const dismiss=()=>{localStorage.setItem(DISMISSED_KEY,"yes");setShowCard(false)};
  return <>
    {variant==="button"&&<button className="field-install-button" type="button" onClick={()=>setOpen(true)}>⇧ Install</button>}
    {variant==="card"&&showCard&&<section className="ios-install-card" aria-label="Install Metro Med Dose">
      <div className="ios-install-icon" aria-hidden="true">✚</div>
      <div><small>USE LIKE AN APP • WORKS OFFLINE</small><b>Install on this iPhone or iPad</b><span>Add Metro Med Dose to your Home Screen for quick field access.</span></div>
      <button className="ios-install-primary" type="button" onClick={()=>setOpen(true)}>Show me how</button>
      <button className="ios-install-dismiss" type="button" aria-label="Dismiss install suggestion" onClick={dismiss}>×</button>
    </section>}
    {open&&<div className="ios-install-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section className="ios-install-modal" role="dialog" aria-modal="true" aria-labelledby="ios-install-heading">
        <button className="ios-install-close" type="button" aria-label="Close install instructions" onClick={()=>setOpen(false)}>×</button>
        <div className="ios-install-app-icon" aria-hidden="true">✚</div>
        <small>IPHONE &amp; IPAD</small><h2 id="ios-install-heading">Add Metro Med Dose to your Home Screen</h2>
        <ol>
          <li><i>1</i><span><b>Open this page in Safari</b><small>If you are in another browser, copy the link and open it in Safari.</small></span></li>
          <li><i>2</i><span><b>Tap the Share button</b><small>Look for the square with an upward arrow in Safari’s toolbar.</small></span><strong className="ios-share-symbol" aria-label="Share icon">↑</strong></li>
          <li><i>3</i><span><b>Tap “Add to Home Screen”</b><small>Scroll down in the Share menu if it is not immediately visible.</small></span></li>
          <li><i>4</i><span><b>Tap “Add”</b><small>The app icon will appear on your Home Screen and retain downloaded medication data for offline use.</small></span></li>
        </ol>
        <button className="ios-install-done" type="button" onClick={()=>{dismiss();setOpen(false)}}>Got it</button>
      </section>
    </div>}
  </>;
}
