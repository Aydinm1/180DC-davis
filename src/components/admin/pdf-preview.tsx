'use client';
import {useEffect,useState,type ComponentType} from 'react';
import {pdfUrls,type PdfResource} from '@/lib/pdf/types';

export function PdfPreview({resource,lazy=false}:{resource:PdfResource;lazy?:boolean}) {
  const [active,setActive]=useState(!lazy);
  const [Reader,setReader]=useState<ComponentType<{resource:PdfResource}>>();
  const [error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!active)return;
    let live=true;
    import('./pdf-reader').then(m=>{if(live)setReader(()=>m.PdfReader);}).catch(()=>{if(live)setError(true);});
    return()=>{live=false;};
  },[active,retry]);
  if(Reader)return <Reader key={`${resource.kind}:${resource.id}`} resource={resource}/>;
  return <div className="rounded-lg border border-border bg-surface p-4 text-sm">
    <p className="break-all font-semibold">{resource.name}</p>
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {!active?<button type="button" className="min-h-11 font-bold text-action" onClick={()=>setActive(true)}>View PDF</button>:error?<><p role="status">Could not load the reader.</p><button type="button" className="min-h-11 font-bold text-action" onClick={()=>{setError(false);setRetry(n=>n+1);}}>Retry preview</button></>:<p role="status">Loading PDF reader…</p>}
      <a download className="inline-flex min-h-11 items-center font-bold text-action" href={pdfUrls(resource).download}>Download PDF</a>
    </div>
  </div>;
}
