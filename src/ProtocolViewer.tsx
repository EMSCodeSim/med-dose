import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;
const ORIGINAL = "https://dmemsmd.org/wp-content/uploads/sites/51/2026/07/DMEMSMD-Protocols-July-2026-FINAL-2026-07-20.pdf";

export type ProtocolTarget = { id: string; name: string; page: number };

export default function ProtocolViewer({ target, close }: { target: ProtocolTarget; close: () => void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null),hostRef=useRef<HTMLDivElement>(null),renderId=useRef(0);
  const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(target.page),[status,setStatus]=useState("Loading current DMP…"),[error,setError]=useState("");
  useEffect(()=>{let active=true;const task=getDocument({url:"/protocols/dmp-current.pdf",disableRange:true,disableStream:true});task.promise.then(doc=>{if(active){setPdf(doc);setStatus("")}}).catch(()=>{if(active){setError("The in-app protocol could not load. Use the original PDF below.");setStatus("")}});return()=>{active=false;task.destroy()}},[]);
  useEffect(()=>{if(!pdf||!canvasRef.current||!hostRef.current)return;let cancelled=false;const id=++renderId.current;(async()=>{setStatus(`Opening page ${page}…`);const pdfPage=await pdf.getPage(page);if(cancelled||id!==renderId.current)return;const base=pdfPage.getViewport({scale:1}),available=Math.max(280,hostRef.current!.clientWidth-16),scale=Math.min(2.2,available/base.width),viewport=pdfPage.getViewport({scale}),ratio=Math.min(devicePixelRatio||1,2),canvas=canvasRef.current!;canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${Math.floor(viewport.width)}px`;canvas.style.height=`${Math.floor(viewport.height)}px`;const ctx=canvas.getContext("2d");if(!ctx)return;await pdfPage.render({canvas,canvasContext:ctx,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]}).promise;if(!cancelled&&id===renderId.current)setStatus("")})().catch(()=>{if(!cancelled){setError("This protocol page could not be rendered.");setStatus("")}});return()=>{cancelled=true}},[pdf,page]);
  return <div className="protocol-viewer-backdrop"><section className="protocol-viewer" role="dialog" aria-modal="true" aria-label={`${target.id} ${target.name}`}>
    <header><span><small>DMP {target.id} • JULY 2026</small><h2>{target.name}</h2></span><button onClick={close} aria-label="Close protocol">×</button></header>
    <div className="protocol-page-controls"><button disabled={page<=1} onClick={()=>setPage(x=>x-1)}>‹ Previous</button><b>PDF page {page}{pdf?` of ${pdf.numPages}`:""}</b><button disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(x=>x+1)}>Next ›</button></div>
    <div className="protocol-canvas-host" ref={hostRef}>{status&&<div className="protocol-loading">{status}</div>}{error&&<div className="protocol-error" role="alert">{error}</div>}<canvas ref={canvasRef}/></div>
    <footer><span>Verify protocol number and July 2026 revision before use.</span><a href={`${ORIGINAL}#page=${page}`} target="_blank" rel="noreferrer">Open original PDF ↗</a></footer>
  </section></div>;
}
