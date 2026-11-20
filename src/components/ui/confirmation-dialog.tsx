'use client';

import {useEffect,useId,useRef,type ReactNode} from 'react';
import {Button} from './button';

export function ConfirmationDialog({open,busy,title,description,children,error,confirmLabel,onConfirm,onClose}:{
 open:boolean;busy:boolean;title:string;description:ReactNode;children?:ReactNode;error?:string;confirmLabel:string;onConfirm:()=>void;onClose:()=>void;
}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const element=dialog.current,previous=document.activeElement as HTMLElement|null;element?.showModal();cancel.current?.focus();return()=>{element?.close();if(previous?.isConnected)previous.focus();};},[open]);
 return <dialog ref={dialog} role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={busy||undefined} onKeyDown={event=>{if(event.key!=='Tab')return;const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'),first=controls[0],last=controls[controls.length-1];if(!first){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}} onCancel={event=>{event.preventDefault();if(!busy)onClose();}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-5 text-left text-ink shadow-xl backdrop:bg-black/50 sm:p-6">
  <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2><div id={`${id}-description`} className="mt-3 space-y-3 text-sm leading-6">{description}</div>{children}
  {error?<p role="alert" className="mt-3 text-sm font-semibold text-danger-text">{error}</p>:null}
  <div className="mt-5 flex flex-wrap justify-end gap-3"><Button ref={cancel} variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={onConfirm}>{busy?'Saving…':confirmLabel}</Button></div>
 </dialog>;
}
