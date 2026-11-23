'use client';

import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {ConfirmationDialog} from '@/components/ui/confirmation-dialog';
import {setAssignmentCompletion} from '@/lib/supabase/completion-actions';

export function ManualCompletionButton({assignmentId,enrollmentId,personName,assignmentTitle,creditId,disabled=false,variant='quiet',slideSwap=false}:{
 assignmentId:string;enrollmentId:string;personName:string;assignmentTitle:string;creditId?:string;disabled?:boolean;variant?:'quiet'|'secondary';slideSwap?:boolean;
}){
 const router=useRouter();
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[busy,start]=useTransition();
 function confirm(){
  if(busy)return;setError('');
  start(async()=>{try{const result=await setAssignmentCompletion(creditId?'revoke':'grant',assignmentId,enrollmentId,creditId);if(result.error){setError(result.error);return;}setOpen(false);router.refresh();}catch{setError('Could not save completion. Please retry.');}});
 }
 return <>
  {variant==='quiet'?<button type="button" disabled={disabled||busy} className="action-link inline-flex min-h-11 items-center text-left text-sm font-bold text-action disabled:cursor-not-allowed disabled:opacity-50" onClick={()=>{setError('');setOpen(true);}}>{creditId?'Undo completion':'Mark complete'}</button>:<Button variant={variant} disabled={disabled||busy} onClick={()=>{setError('');setOpen(true);}}>{creditId?'Undo completion':'Mark complete'}</Button>}
  <ConfirmationDialog open={open} busy={busy} title={creditId?'Undo manual completion?':'Mark assignment complete?'} description={<><p>{creditId?'Remove manual credit for ':'Give assignment credit to '}<strong>{personName}</strong> for <strong>{assignmentTitle}</strong>?</p><p>{creditId?'This removes only the manual credit.':'This applies only to this person. No submission will be created.'}{!creditId&&slideSwap?' It won’t unlock the swap or complete their partners.':''}</p></>} error={error} confirmLabel={creditId?'Undo completion':'Mark complete'} onConfirm={confirm} onClose={()=>setOpen(false)}/>

 </>;
}
