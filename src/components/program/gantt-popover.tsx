'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';

/** Native top-layer popovers avoid clipping against the horizontally scrolling chart. */
export function GanttPopover({label,trigger,children,disabled=false,menu=false}:{label:string;trigger:ReactNode;children:ReactNode;disabled?:boolean;menu?:boolean}){
 const id=useId(),popup=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 const [position,setPosition]=useState({top:0,left:0}),[open,setOpen]=useState(false);
 useEffect(()=>{
  if(!open)return;
  const dismiss=(e:Event)=>{if(!popup.current?.contains(e.target as Node))popup.current?.hidePopover();};
  window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true);
  return()=>{window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true);};
 },[open]);
 return <><button ref={button} type="button" aria-label={label} aria-haspopup={menu?'menu':'dialog'} aria-expanded={open} popoverTarget={id} disabled={disabled}
  className="flex min-h-11 w-full items-center justify-between gap-1 rounded-md px-2 text-left text-sm hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-action"
  onClick={()=>{const bounds=button.current!.getBoundingClientRect(),height=menu?112:270;setPosition({left:Math.max(8,Math.min(bounds.left,innerWidth-232)),top:bounds.bottom+height<innerHeight?bounds.bottom+4:Math.max(8,bounds.top-height)});}}>{trigger}</button>
  <div ref={popup} id={id} popover="auto" role={menu?'menu':'dialog'} aria-label={label} onToggle={e=>setOpen((e.nativeEvent as ToggleEvent).newState==='open')}
   className="w-56 rounded-lg border border-border bg-surface p-2 text-ink shadow-lg" style={{position:'fixed',inset:'auto',margin:0,...position}}>{children}</div></>;
}
