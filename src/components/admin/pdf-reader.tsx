'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {PDFDocumentLoadingTask} from 'pdfjs-dist';
import type {EventBus,PDFViewer} from 'pdfjs-dist/web/pdf_viewer.mjs';
import {pdfUrls,type PdfResource} from '@/lib/pdf/types';

const assets='/pdfjs/6.5.438/';
let stylePromise:Promise<void>|undefined;
function loadStyles(){
  return stylePromise??=new Promise<void>((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=`${assets}viewer.css`;
    link.onload=()=>resolve();link.onerror=()=>{link.remove();stylePromise=undefined;reject(new Error('Could not load reader styles.'));};document.head.append(link);
  });
}
const control='min-h-11 rounded-md px-3 text-sm font-semibold hover:bg-surface-subtle disabled:cursor-default disabled:opacity-40';

export function PdfReader({resource,fill=false}:{resource:PdfResource;fill?:boolean}) {
  const searchId=useId();
  const [searchOpen,setSearchOpen]=useState(false);
  const findButton=useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDialogElement>(null),container=useRef<HTMLDivElement>(null),pages=useRef<HTMLDivElement>(null);
  const pageInput=useRef<HTMLInputElement>(null);
  const expandButton=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null),searchInput=useRef<HTMLInputElement>(null);
  const controller=useRef<{viewer:PDFViewer;bus:EventBus}|undefined>(undefined);
  const [expanded,setExpanded]=useState(false),[retry,setRetry]=useState(0);
  const [error,setError]=useState(''),[ready,setReady]=useState(false),[page,setPage]=useState(1),[count,setCount]=useState(0),[scale,setScale]=useState(1);
  const [query,setQuery]=useState(''),[matches,setMatches]=useState('');
  const urls=pdfUrls(resource);
  useEffect(()=>{
    let live=true,task:PDFDocumentLoadingTask|undefined,viewer:PDFViewer|undefined,observer:ResizeObserver|undefined;
    const abort=new AbortController();
    async function open(){
      try{
        await loadStyles();
        const pdf=await import('pdfjs-dist');
        const components=await import('pdfjs-dist/web/pdf_viewer.mjs');
        if(!live)return;
        pdf.GlobalWorkerOptions.workerSrc=`${assets}pdf.worker.min.mjs`;
        const response=await fetch(urls.preview,{credentials:'same-origin',cache:'no-store',signal:abort.signal});
        if(!response.ok)throw new Error(response.status===401?'Your session expired. Sign in again to view this PDF.':response.status===403?'Active admin access is required to view this PDF.':response.status===404?'This PDF is unavailable.': 'Could not load this PDF. Retry or download the original.');
        const data=new Uint8Array(await response.arrayBuffer());
        if(!live)return;
        if(data.length>20*1024*1024)throw new Error('This PDF exceeds the 20 MB preview limit.');
        const bus=new components.EventBus();
        const linkService=new components.PDFLinkService({eventBus:bus});
        const find=new components.PDFFindController({eventBus:bus,linkService});
        viewer=new components.PDFViewer({container:container.current!,viewer:pages.current!,eventBus:bus,linkService,findController:find,annotationMode:pdf.AnnotationMode.DISABLE,annotationEditorMode:pdf.AnnotationEditorType.DISABLE,maxCanvasPixels:8_000_000,maxCanvasDim:8192,enableDetailCanvas:false,imageResourcesPath:`${assets}images/`});
        linkService.setViewer(viewer);
        controller.current={viewer,bus};
        bus.on('pagesinit',()=>{if(live&&viewer){viewer.currentScaleValue='page-width';setReady(true);}});
        bus.on('pagechanging',({pageNumber}:{pageNumber:number})=>{if(live){setPage(pageNumber);if(pageInput.current)pageInput.current.value=String(pageNumber);}});
        bus.on('scalechanging',({scale}:{scale:number})=>{if(live)setScale(scale);});
        bus.on('updatefindmatchescount',({matchesCount}:{matchesCount:{current:number;total:number}})=>{if(live)setMatches(`${matchesCount.current} of ${matchesCount.total}`);});
        bus.on('updatefindcontrolstate',({state}:{state:number})=>{if(live&&state===1)setMatches('No matches');});
        bus.on('pagerendered',({error}:{error?:unknown})=>{if(live&&error)setError('A page could not be rendered. Retry or download the original.');});
        task=pdf.getDocument({data,cMapUrl:`${assets}cmaps/`,cMapPacked:true,standardFontDataUrl:`${assets}standard_fonts/`,iccUrl:`${assets}iccs/`,wasmUrl:`${assets}wasm/`,enableXfa:false,disableWorkerRendering:true,maxImageSize:50_000_000,canvasMaxAreaInBytes:32_000_000});
        task.onPassword=()=>{if(live)setError('Password-protected PDFs cannot be previewed. Download the original file.');void task?.destroy();};
        const document=await task.promise;
        if(!live)return;
        setCount(document.numPages);linkService.setDocument(document);viewer.setDocument(document);
        observer=new ResizeObserver(()=>{if(live&&viewer&&container.current?.clientWidth){if(viewer.currentScaleValue==='page-width')viewer.currentScaleValue='page-width';viewer.update();}});
        observer.observe(container.current!);
      }catch(reason){if(live&&!abort.signal.aborted)setError(current=>current|| (reason instanceof Error&&/session expired|admin access|unavailable|Could not load|exceeds/.test(reason.message)?reason.message:'This PDF is corrupt or unsupported. Download the original file.'));}
    }
    void open();
    return()=>{live=false;abort.abort();observer?.disconnect();controller.current=undefined;viewer?.setDocument(null!);void task?.destroy();};
  },[urls.preview,retry]);
  function find(value=query,previous=false,again=false){
    setQuery(value);setMatches(value?'Searching…':'');
    controller.current?.bus.dispatch('find',{source:searchInput.current,type:again?'again':'',query:value,caseSensitive:false,entireWord:false,highlightAll:true,findPrevious:previous,matchDiacritics:false});
  }
  function resizeView(open:boolean){
    const element=dialog.current;if(!element)return;
    element.close();
    if(open)element.showModal();else element.show();
    setExpanded(open);
    requestAnimationFrame(()=>{(open?closeButton:expandButton).current?.focus();controller.current?.viewer.update();});
  }
  const busy=!ready||Boolean(error);
  return <dialog ref={dialog} open aria-modal={expanded||undefined} aria-label={`PDF: ${resource.name}`} onCancel={event=>{event.preventDefault();resizeView(false);}} className={`gap-pdf-reader bg-surface text-ink backdrop:bg-black/60 ${expanded||!fill?'border border-border shadow-sm':''} ${expanded?'fixed inset-3 m-auto flex h-[calc(100dvh-1.5rem)] max-h-none w-[calc(100vw-1.5rem)] max-w-none flex-col rounded-xl p-3 sm:p-5':fill?'relative m-0 flex h-full min-h-0 w-full max-w-none flex-col p-3':'relative m-0 flex w-full max-w-none flex-col rounded-lg p-3'}`} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='f'){event.preventDefault();setSearchOpen(true);requestAnimationFrame(()=>searchInput.current?.focus());}}}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 flex-1 truncate text-sm font-semibold" title={resource.name}>{resource.name}</p><div className="flex shrink-0 gap-1"><a className={`${control} inline-flex items-center`} download href={urls.download}>Download</a><button ref={expandButton} hidden={expanded} type="button" className={control} onClick={()=>resizeView(true)}>Expand</button><button ref={closeButton} hidden={!expanded} type="button" className={control} onClick={()=>resizeView(false)}>Close reader</button></div></div>
    <div className="mb-2 flex shrink-0 flex-wrap items-center gap-1" aria-label="PDF reading controls">
      <div role="group" aria-label="Pages" className="flex items-center rounded-lg bg-surface-subtle">
      <button type="button" aria-label="Previous page" title="Previous page" className={control} disabled={busy||page<=1} onClick={()=>{controller.current!.viewer.currentPageNumber=page-1;}}>‹</button>
      <label className="flex items-center gap-1 text-sm">Page <input ref={pageInput} aria-label="Page number" type="number" min={1} max={count||1} defaultValue={page} disabled={busy} className="min-h-11 w-16 rounded border border-border-strong px-2" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const value=Number(e.currentTarget.value);if(Number.isInteger(value)&&value>=1&&value<=count)controller.current!.viewer.currentPageNumber=value;}}} onBlur={e=>{const value=Number(e.currentTarget.value);if(Number.isInteger(value)&&value>=1&&value<=count&&controller.current)controller.current.viewer.currentPageNumber=value;else e.currentTarget.value=String(page);}}/> / {count||'—'}</label>
      <button type="button" aria-label="Next page" title="Next page" className={control} disabled={busy||page>=count} onClick={()=>{controller.current!.viewer.currentPageNumber=page+1;}}>›</button></div>
      <div role="group" aria-label="Zoom" className="flex items-center rounded-lg bg-surface-subtle">
      <button type="button" aria-label="Zoom out" className={control} disabled={busy||scale<=0.25} onClick={()=>{controller.current!.viewer.currentScale=Math.max(0.25,scale/1.25);}}>−</button><span className="text-sm tabular-nums">{Math.round(scale*100)}%</span><button type="button" aria-label="Zoom in" className={control} disabled={busy||scale>=4} onClick={()=>{controller.current!.viewer.currentScale=Math.min(4,scale*1.25);}}>+</button></div>
      <button type="button" className={control} disabled={busy} onClick={()=>{controller.current!.viewer.currentScaleValue='page-width';}}>Fit width</button>
      <button ref={findButton} type="button" className={control} aria-label="Find in PDF" aria-expanded={searchOpen} aria-controls={searchId} onClick={()=>{setSearchOpen(v=>!v);if(!searchOpen)requestAnimationFrame(()=>searchInput.current?.focus());}}>Find</button>
    </div>
    <div id={searchId} hidden={!searchOpen} className="mb-3 flex shrink-0 flex-wrap items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 text-sm"><span className="shrink-0">Find</span> <input ref={searchInput} type="search" value={query} disabled={busy} className="min-h-11 w-full min-w-24 rounded border border-border-strong px-2" onChange={e=>find(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();find(query,e.shiftKey,true);}}}/></label><button type="button" className={control} disabled={busy||!query} onClick={()=>find(query,true,true)} aria-label="Previous match">↑</button><button type="button" className={control} disabled={busy||!query} onClick={()=>find(query,false,true)} aria-label="Next match">↓</button><span role="status" className="text-xs">{matches}</span></div>
    {error?<div role="status" className="mb-3 rounded border border-border p-3 text-sm"><p>{error}</p><button type="button" className="min-h-11 font-bold text-action" onClick={()=>{setError('');setReady(false);setCount(0);setMatches('');setQuery('');setRetry(n=>n+1);}}>Retry preview</button></div>:!ready?<p role="status" className="mb-3 text-sm">Loading PDF…</p>:null}
    <div className={`relative min-h-0 overflow-hidden rounded bg-[#e5e7e9] ${expanded||fill?'flex-1':'h-[62vh] min-h-80 max-h-[44rem]'}`}><div ref={container} tabIndex={0} aria-label="PDF pages" className="absolute inset-0 overflow-auto"><div ref={pages} className="pdfViewer"/></div></div>
  </dialog>;
}
