type Props={volume:number;label?:string};

const sizes=[1,3,5,10,20,30,60];
const fmt=(value:number)=>Number(value.toFixed(value<1?2:1)).toString();

export default function DoseSyringe({volume,label="DRAW VOLUME"}:Props){
  if(!(volume>0))return null;
  const size=sizes.find(candidate=>volume<=candidate)||60;
  const displayedVolume=Math.min(volume,size),fillWidth=displayedVolume/size*210,marker=30+fillWidth;
  return <section className="dose-syringe" aria-label={`${size} mL syringe drawn to ${fmt(volume)} mL`}>
    <header><span><small>SYRINGE GUIDE</small><b>{size} mL syringe</b></span><strong>{label}: {fmt(volume)} mL</strong></header>
    <svg viewBox="0 0 330 126" role="img" aria-label={`Syringe diagram showing ${fmt(volume)} mL`}>
      <path d="M8 64h22M8 55v18M240 51h34v27h-34M274 64h47M321 51v27" fill="none" stroke="currentColor" strokeWidth="4"/>
      <rect x="30" y="37" width="210" height="54" rx="8" fill="#fff" stroke="currentColor" strokeWidth="4"/>
      <rect x="32" y="39" width={Math.max(0,fillWidth-2)} height="50" rx="5" fill="#6bc7df"/>
      <line x1={marker} y1="32" x2={marker} y2="97" stroke="#08715e" strokeWidth="4"/>
      {Array.from({length:11},(_,index)=><line key={index} x1={30+index*21} y1="37" x2={30+index*21} y2={index%5===0?53:47} stroke="currentColor" strokeWidth="2"/>)}
      <text x="30" y="115" fontSize="12" fill="currentColor">0</text><text x="218" y="115" fontSize="12" fill="currentColor">{size} mL</text>
      <text x={Math.min(Math.max(marker,62),235)} y="23" textAnchor="middle" fontSize="14" fontWeight="900" fill="#08715e">{fmt(volume)} mL</text>
    </svg>
    <p>Diagram is a cross-check, not actual size. Confirm the physical syringe graduations.</p>
  </section>;
}
