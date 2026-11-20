'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {ConfirmationDialog} from '@/components/ui/confirmation-dialog';
import {AssignmentStatusBadge} from '@/components/program/assignment-status-badge';
import {StateMessage} from '@/components/ui/state-message';
import {assignmentsForWeek} from '@/lib/program/types';
import type {AdminSubmissionRow,AdminQueueFilter,AdminWeek} from '@/lib/program/admin';
import {canManuallyComplete,completionKey,type CompletionTarget,type CompletionResult} from '@/lib/program/bulk-completion';
import {grantAssignmentCompletions} from '@/lib/supabase/completion-actions';
import {AssignmentCompletionAction} from './assignment-completion-action';
import {useAdminWorkspace} from './admin-workspace';
type SelectedCredit=CompletionTarget&{personName:string;assignmentTitle:string};
function Owner({row}:{row:AdminSubmissionRow}){
 return <><p className="font-bold">{row.swapGroup?.name??row.team?.name??row.person?.fullName}</p>{row.team||row.swapGroup?<details className="mt-1 text-xs text-ink-soft"><summary className="min-h-11 cursor-pointer">{row.members.length} participants</summary><ul>{row.members.map(m=><li key={m.id}>{m.fullName}</li>)}</ul></details>:<p className="mt-1 break-all text-xs text-ink-soft">{row.person?.email}</p>}</>;
}

export function ReviewQueueRows({rows,query,week,filter}:{rows:AdminSubmissionRow[];query:string;week?:AdminWeek;filter:AdminQueueFilter}){
 const state=useAdminWorkspace(),router=useRouter();
 const [selectedKeys,setSelectedKeys]=useState<string[]>([]),[snapshot,setSnapshot]=useState<SelectedCredit[]|null>(null),[results,setResults]=useState<CompletionResult[]>([]),[message,setMessage]=useState(''),[busy,start]=useTransition();
 const target=(row:AdminSubmissionRow)=>({assignmentId:row.assignment.id,enrollmentId:row.enrollment.id});
 const eligible=rows.filter(row=>canManuallyComplete(row,state)),eligibleKeys=new Set(eligible.map(row=>completionKey(target(row))));
 const picked=eligible.filter(row=>selectedKeys.includes(completionKey(target(row)))),allSelected=eligible.length>0&&picked.length===eligible.length;
 function selectionBox(row:AdminSubmissionRow){const key=completionKey(target(row));return eligibleKeys.has(key)?<label className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"><input type="checkbox" className="size-4 accent-action" aria-label={`Select ${row.person?.fullName??'participant'} for ${row.assignment.title}`} disabled={busy} checked={selectedKeys.includes(key)} onChange={event=>setSelectedKeys(previous=>event.target.checked?[...previous,key]:previous.filter(value=>value!==key))}/></label>:null;}
 function openConfirmation(){setResults([]);setSnapshot(picked.map(row=>({...target(row),personName:row.person?.fullName??'Participant',assignmentTitle:row.assignment.title})));}
 function grant(){
  if(busy||!snapshot?.length)return;
  const successful=new Set(results.filter(result=>!result.error).map(completionKey)),pending=snapshot.filter(item=>!successful.has(completionKey(item)));
  start(async()=>{
   const outcomes=results.filter(result=>!result.error);
   for(let offset=0;offset<pending.length;offset+=100){const chunk=pending.slice(offset,offset+100);try{const result=await grantAssignmentCompletions(chunk.map(({assignmentId,enrollmentId})=>({assignmentId,enrollmentId})));outcomes.push(...(result.error?chunk.map(item=>({...item,error:result.error})):result.results));}catch{outcomes.push(...chunk.map(item=>({...item,error:'Could not confirm this credit. Retry safely after checking your connection.'})));}}
   setResults(outcomes);const completed=outcomes.filter(result=>!result.error),completedKeys=new Set(completed.map(completionKey)),failed=outcomes.length-completed.length;
   setSelectedKeys(previous=>previous.filter(key=>!completedKeys.has(key)));setMessage(`${completed.length} assignment credit${completed.length===1?'':'s'} granted.${failed?` ${failed} need attention.`:''}`);if(!failed)setSnapshot(null);router.refresh();
  });
 }
 return <>
 {(eligible.length>0||message)?<div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 sm:px-7">{eligible.length?<><Button variant="secondary" disabled={busy} onClick={()=>setSelectedKeys(allSelected?[]:[...eligibleKeys])}>{allSelected?'Clear selection':'Select all'}</Button><span className="text-sm text-ink-soft">{picked.length} of {eligible.length} selected</span><Button disabled={busy||!picked.length} onClick={openConfirmation}>Mark selected complete</Button></>:null}{message?<p role="status" className="w-full text-sm text-ink-soft">{message}</p>:null}</div>:null}
 <ConfirmationDialog open={!!snapshot} busy={busy} title={`Mark ${snapshot?.length??0} assignment${snapshot?.length===1?'':'s'} complete?`} description={<><p>Give manual credit to the selected people for the assignments listed below. No submissions will be created.</p>{results.length?<p role="status">{results.filter(result=>!result.error).length} completed · {results.filter(result=>result.error).length} need attention</p>:null}</>} confirmLabel={results.some(result=>result.error)?'Retry failed':'Mark selected complete'} onConfirm={grant} onClose={()=>setSnapshot(null)}>
  <ul tabIndex={0} aria-label="Selected assignment credits" className="mt-4 max-h-60 space-y-3 overflow-y-auto rounded border border-border p-3 text-sm">{snapshot?.map(item=>{const result=results.find(result=>completionKey(result)===completionKey(item));return <li key={completionKey(item)}><p className="font-semibold">{item.personName}</p><p className="text-ink-soft">{item.assignmentTitle}</p>{result?<p className={result.error?'text-danger-text':'text-action'}>{result.error??'Completed'}</p>:null}</li>;})}</ul>
 </ConfirmationDialog>
{rows.length?<><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="text-xs text-ink-faint"><tr>{eligible.length?<th className="px-3 py-4"><span className="sr-only">Select</span></th>:null}{['Member / team','Assignment','Status','Next action'].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.ownerKey+':'+row.assignment.id} className="border-t border-border">{eligible.length?<td className="px-3 py-4">{selectionBox(row)}</td>:null}<td className="px-5 py-4"><Owner row={row}/></td><td className="px-5 py-4">{!week?<span className="mb-1 block text-xs text-ink-soft">Week {state.weeks.find(w=>assignmentsForWeek(w).some(a=>a.id===row.assignment.id))?.weekNumber}</span>:null}{row.assignment.title}</td><td className="px-5 py-4"><AssignmentStatusBadge state={row.state}/></td><td className="px-5 py-4">{row.submission?<Link className="action-link inline-flex min-h-11 items-center font-bold text-action" href={'/admin/submissions/'+row.submission.id+'?'+query}>{row.state==='submitted'?'Review →':'View →'}</Link>:<AssignmentCompletionAction row={row}/>}</td></tr>)}</tbody></table></div><ul className="divide-y divide-border md:hidden">{rows.map(row=><li className="p-5" key={row.ownerKey+':'+row.assignment.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Owner row={row}/></div>{selectionBox(row)}</div><p className="mt-3 text-sm font-semibold">{!week?`Week ${state.weeks.find(w=>assignmentsForWeek(w).some(a=>a.id===row.assignment.id))?.weekNumber} · `:null}{row.assignment.title}</p><div className="mt-3"><AssignmentStatusBadge state={row.state}/></div>{row.submission?<Link className="action-link mt-2 inline-flex min-h-11 items-center text-sm font-bold text-action" href={'/admin/submissions/'+row.submission.id+'?'+query}>Review submission →</Link>:<AssignmentCompletionAction row={row}/>}</li>)}</ul></>:<div className="p-5 sm:p-7"><StateMessage title={filter==='awaiting_review'?'No submissions awaiting review':'No matching submissions'}>{filter==='awaiting_review'?null:'Try another status or clear the member search.'}</StateMessage></div>}
 </>;
}
