'use client';
import { useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentBrief } from '@/components/program/assignment-brief';
import { saveGuidedProjectSafely as saveGuidedProject } from '@/lib/guided/client';
import { pendingDirectionRequest, projectProgressLabel, projectQuestion } from '@/lib/guided/admin-progress';
import { useLocalSearchParams } from '@/lib/navigation/local-query';
import { selectQueueWeek } from '@/lib/program/week-queue';
import type { GuidedProject, GuidedTeam, DirectionRequest, Research } from '@/lib/guided/types';
import { useAdminWorkspace } from './admin-workspace';

export type ProjectInboxEntry={assignmentId:string;weekId:string;cohortId:string;title:string;project:GuidedProject};
const requestId=(entry:ProjectInboxEntry,team:GuidedTeam)=>'direction-request-'+entry.assignmentId+'-'+team.id;

function ResearchFields({research}:{research:Research}) {
 return <dl className="space-y-3 text-sm">{([['risk1','Risk 1'],['risk2','Risk 2'],['question','Initial question']] as const).map(([key,label])=><div key={key}><dt className="font-bold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-ink-soft">{research[key]}</dd></div>)}</dl>;
}

function TeamHistory({team}:{team:GuidedTeam}) {
 return <div className="mt-4 space-y-5">
  {team.state?<section><h4 className="mb-3 text-sm font-bold">Current research</h4><ResearchFields research={team.state.research}/></section>:null}
  {team.recommendation?<section className="border-t border-border pt-4"><h4 className="font-bold">{team.recommendation.company} · {team.recommendation.title}</h4><div className="mt-3"><AssignmentBrief instructions={team.recommendation.guidance} format="markdown"/></div></section>:null}
  <details className="border-t border-border pt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">History</summary>
   {team.state?.original_research?<section className="mt-3"><h4 className="mb-3 text-sm font-bold">Original research</h4><ResearchFields research={team.state.original_research}/></section>:null}
   {team.requests.map(r=><section key={r.id} className="mt-4 border-t border-border pt-4 text-sm"><h4 className="font-bold">{r.status.replaceAll('_',' ')}</h4>{([['risk','Risk and citation'],['direction','Proposed direction'],['question','Consulting question'],['evidence','Evidence plan']] as const).map(([key,label])=><p key={key} className="mt-3 whitespace-pre-wrap break-words"><strong>{label}: </strong>{r.proposal[key]}</p>)}{r.decision?<p className="mt-3 font-semibold">Decision: {r.decision.replaceAll('_',' ')}</p>:null}{r.decision_note?<p className="mt-2 whitespace-pre-wrap">Admin note: {r.decision_note}</p>:null}</section>)}
  </details>
 </div>;
}

function TeamRequest({entry,team,proposal,weekNumber,onDecided}:{entry:ProjectInboxEntry;team:GuidedTeam;proposal:DirectionRequest;weekNumber?:number;onDecided:()=>void}) {
 const router=useRouter(),[note,setNote]=useState(''),[message,setMessage]=useState(''),[pending,startTransition]=useTransition();
 const noteId=useId();
 const [reviewed,setReviewed]=useState({id:proposal.id,version:team.state!.version});
 const request=useRef<{key:string;id:string}|undefined>(undefined);
 const changed=reviewed.id!==proposal.id||reviewed.version!==team.state?.version;
 function decide(decision:'approved'|'changes_requested'){
  if(changed||pending)return;
  const data={version:reviewed.version,teamId:team.id,requestId:reviewed.id,decision,note},key=JSON.stringify(data);
  if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
  const id=request.current.id;
  startTransition(async()=>{const result=await saveGuidedProject('decide',entry.assignmentId,data,id);if(result.error)return setMessage(result.error);onDecided();router.refresh();});
 }
 return <article id={requestId(entry,team)} aria-label={team.name+' direction request'} className="mt-5 scroll-mt-6 rounded-card border border-border bg-surface p-5 sm:p-6">
  <p className="text-xs font-bold uppercase tracking-widest text-brand-deep">Alternative · Pending approval</p>
  <h3 className="mt-2 text-lg font-bold">{team.name}{team.isTest?' · Test':''}{team.recommendation?' · '+team.recommendation.company:''}</h3>
  <p className="mt-1 text-sm text-ink-soft">Week {weekNumber} · {entry.title}</p>
  <p className="mt-5 whitespace-pre-wrap break-words text-lg font-semibold">{proposal.proposal.question}</p>
  <dl className="my-5 grid gap-4 text-sm sm:grid-cols-2">{([['direction','Proposed direction'],['risk','Risk and citation'],['evidence','Evidence plan']] as const).map(([key,label])=><div key={key} className={key==='evidence'?'sm:col-span-2':''}><dt className="font-bold">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-6 text-ink-soft">{proposal.proposal[key]}</dd></div>)}</dl>
  <details className="mb-5 border-y border-border py-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Research and history</summary><TeamHistory team={team}/></details>
  <div><label htmlFor={noteId} className="block text-sm font-bold">Decision note</label><textarea id={noteId} className="mt-2 w-full rounded-lg border border-border-strong p-3 font-normal" rows={3} maxLength={50000} value={note} disabled={pending} onChange={e=>setNote(e.target.value)}/></div>
  {changed?<div className="mt-3 text-sm"><p role="status">This request changed. Your note is retained.</p><Button variant="secondary" onClick={()=>{setReviewed({id:proposal.id,version:team.state!.version});setMessage('Review the updated proposal before deciding.');}}>Review updated request</Button></div>:null}
  <div className="mt-4 flex flex-wrap gap-3"><Button disabled={pending||changed} onClick={()=>decide('approved')}>Approve direction</Button><Button variant="secondary" disabled={pending||changed||!note.trim()} onClick={()=>decide('changes_requested')}>Request changes</Button></div>
  {message?<div className="mt-3"><p role="status" className="text-sm">{message}</p><Button variant="quiet" disabled={pending} onClick={()=>router.refresh()}>Refresh request</Button></div>:null}
 </article>;
}

export function ProjectDirectionRequests({entries}:{entries:ProjectInboxEntry[]}) {
 const workspace=useAdminWorkspace(),params=useLocalSearchParams(),[message,setMessage]=useState('');
 const week=selectQueueWeek(workspace,workspace.selectedCohortId,params.get('week'),params.get('assignment'));
 const filtered=entries.filter(e=>e.cohortId===workspace.selectedCohortId&&e.weekId===week?.id&&(!params.get('assignment')||e.assignmentId===params.get('assignment')));
 if(!filtered.length)return null;
 const test=params.get('audience')==='test';
 const teams=filtered.flatMap(entry=>(entry.project.teams??[]).filter(team=>team.isTest===test&&team.members>0).map(team=>({entry,team,proposal:pendingDirectionRequest(team),weekNumber:workspace.weeks.find(w=>w.id===entry.weekId)?.weekNumber})));
 const requests=teams.filter(row=>row.proposal);
 return <div className="mt-8 space-y-6">
  <section aria-label="Direction requests"><h2 className="text-xl font-bold">Direction requests</h2>
   {message?<p role="status" className="mt-3 text-sm font-semibold">{message}</p>:null}
   {requests.length?requests.map(({entry,team,proposal,weekNumber})=><TeamRequest key={entry.assignmentId+team.id} entry={entry} team={team} proposal={proposal!} weekNumber={weekNumber} onDecided={()=>setMessage('Decision saved.')}/>):<p className="mt-4 text-sm text-ink-soft">No direction requests awaiting approval.</p>}
  </section>
  <details className="rounded-card border border-border bg-surface p-5 sm:p-6"><summary className="flex min-h-11 cursor-pointer items-center text-lg font-bold">Team project progress</summary>
   {teams.length?<div className="mt-4 divide-y divide-border">{teams.map(({entry,team,proposal,weekNumber})=><article key={entry.assignmentId+team.id} aria-label={team.name+' project progress'} className="py-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{team.name}{team.isTest?' · Test':''}{team.recommendation?' · '+team.recommendation.company:''}</h3><p className="mt-1 text-xs text-ink-soft">Week {weekNumber} · {entry.title}</p></div><p className="text-sm font-semibold text-action">{projectProgressLabel(team)}</p></div>
    {projectQuestion(team)?<p className="mt-4 whitespace-pre-wrap break-words">{projectQuestion(team)}</p>:null}
    {team.state?.frozen?<p className="mt-2 text-xs text-ink-soft">Final document submitted</p>:null}
    {proposal?<a href={'#'+requestId(entry,team)} className="action-link mt-3 inline-flex min-h-11 items-center text-sm font-bold text-action">Review request →</a>:null}
    {team.state?<details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Research and history</summary><TeamHistory team={team}/></details>:null}
   </article>)}</div>:<p className="mt-4 text-sm text-ink-soft">No populated teams in this scope.</p>}
  </details>
 </div>;
}
