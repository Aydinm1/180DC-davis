'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

export function ReviewWorkspace({work,review}:{work:ReactNode;review:ReactNode}) {
 const [view,setView]=useState<'work'|'review'>('work');
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let live=true;
  const measure=()=>{if(live&&container.current)container.current.style.setProperty('--review-height',`${Math.max(380,window.innerHeight-container.current.getBoundingClientRect().top-16)}px`);};
  measure();window.addEventListener('resize',measure);void document.fonts.ready.then(measure);
  const observer=new ResizeObserver(measure);
  const header=container.current?.parentElement?.querySelector('header');if(header)observer.observe(header);
  return()=>{live=false;window.removeEventListener('resize',measure);observer.disconnect();};
 },[]);
 return <>
  <nav aria-label="Review workspace" className="mb-3 flex rounded-lg border border-border bg-surface p-1 lg:hidden">{(['work','review'] as const).map(value=><button type="button" key={value} aria-pressed={view===value} onClick={()=>setView(value)} className={`min-h-11 flex-1 rounded-md px-4 text-sm font-semibold ${view===value?'bg-success-bg text-action':'text-ink-soft hover:bg-surface-subtle'}`}>{value==='work'?'Submitted work':'Review'}</button>)}</nav>
  <div ref={container} className="grid h-[var(--review-height,36rem)] min-h-[23.75rem] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,25rem)] lg:gap-5">
   <div className={`min-h-0 min-w-0 flex-col ${view==='work'?'flex':'hidden lg:flex'}`}>{work}</div>
   <div className={`min-h-0 min-w-0 flex-col ${view==='review'?'flex':'hidden lg:flex'}`}>{review}</div>
  </div>
 </>;
}
