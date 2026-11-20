'use client';

import {useEffect,useId,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {setAssignmentCompletion} from '@/lib/supabase/completion-actions';

export function ManualCompletionButton({assignmentId,enrollmentId,personName,assignmentTitle,creditId,disabled=false,variant='quiet',slideSwap=false}:{
 assignmentId:string;enrollmentId:string;personName:string;assignmentTitle:string;creditId?:string;disabled?:boolean;variant?:'quiet'|'secondary';slideSwap?:boolean;
}){
 const router=useRouter(),id=useId(),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[busy,start]=useTransition();
 useEffect(()=>{
  if(!open)return;
  const element=dialog.current,previous=document.activeElement as HTMLElement|null;
  element?.showModal();cancel.current?.focus();
  return()=>{element?.close();if(previous?.isConnected)previous.focus();};
 },[open]);
 function confirm(){
  if(busy)return;setError('');
  start(async()=>{try{const result=await setAssignmentCompletion(creditId?'revoke':'grant',assignmentId,enrollmentId,creditId);if(result.error){setError(result.error);return;}setOpen(false);router.refresh();}catch{setError('Could not save completion. Please retry.');}});
 }
 return <>
  <Button variant={variant} disabled={disabled||busy} className={variant==='quiet'?'px-0 text-action hover:bg-transparent':undefined} onClick={()=>{setError('');setOpen(true);}}>{creditId?'Undo completion':'Mark complete'}</Button>
  <dialog ref={dialog} role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={busy||undefined} onKeyDown={event=>{if(event.key!=='Tab')return;const controls=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),first=controls[0],last=controls[controls.length-1];if(!first){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}} onCancel={event=>{event.preventDefault();if(!busy)setOpen(false);}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-5 text-left text-ink shadow-xl backdrop:bg-black/50 sm:p-6">
   <h2 id={`${id}-title`} className="text-xl font-bold">{creditId?'Undo manual completion?':'Mark assignment complete?'}</h2>
   <div id={`${id}-description`} className="mt-3 space-y-3 text-sm leading-6"><p>{creditId?'Remove manual credit for ':'Give assignment credit to '}<strong>{personName}</strong> for <strong>{assignmentTitle}</strong>?</p><p>{creditId?'This removes only the manual credit.':'This applies only to this person. No submission will be created.'}{!creditId&&slideSwap?' It won’t unlock the swap or complete their partners.':''}</p></div>
   {error?<p role="alert" className="mt-3 text-sm font-semibold text-danger-text">{error}</p>:null}
   <div className="mt-5 flex flex-wrap justify-end gap-3"><Button ref={cancel} variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={confirm}>{busy?'Saving…':creditId?'Undo completion':'Mark complete'}</Button></div>
  </dialog>
 </>;
}
