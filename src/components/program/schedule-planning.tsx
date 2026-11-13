'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {ActivityViewNav,BriefReader,type ActivityView} from './activity-views';
import {AssignmentBrief} from './assignment-brief';
import {ScheduleGrid} from './schedule-grid';
import {ScheduleComparison} from './schedule-comparison';
import {saveSchedule} from '@/lib/schedules/actions';
import {scheduleInputError,type ScheduleActivity,type ScheduleRow,type ScheduleAction} from '@/lib/schedules/types';
import {formatSubmissionTime} from '@/lib/program/state';
const practice:ScheduleActivity={workflow:'schedule',configVersion:1,overview:'## Practice planning\n\nBuild an original plan, then adapt it to a fictional disruption. Nothing is saved or submitted.',scenario:'Plan a fictional community event across ten project weeks.',disruption:'Your venue becomes unavailable during Week 5. Adapt the remaining work.',starter:[{id:'00000000-0000-4000-8000-000000000001',name:'Kickoff',weeks:[1]}],attempts:[]};
export function SchedulePlanning({assignmentId,initial,preview=false,browse=false}:{assignmentId:string;initial:ScheduleActivity;preview?:boolean;browse?:boolean}){
 const source=browse?{...practice,overview:initial.overview??practice.overview}:initial,simulation=preview||browse;
 const [activity,setActivity]=useState(source),[view,setView]=useState<ActivityView>(source.run||source.attempts.length?'workspace':'instructions');
 const [plan,setPlan]=useState<'original'|'revised'>(source.run?.revealedAt?'revised':'original');
 const [rows,setRows]=useState<ScheduleRow[]>(source.run?.revised??source.run?.working??source.starter??[]),[explanation,setExplanation]=useState(source.run?.explanation??'');
 const [saved,setSaved]=useState(JSON.stringify({rows:source.run?.revised??source.run?.working??source.starter??[],explanation:source.run?.explanation??''}));
 const [editing,setEditing]=useState(!source.attempts.some(a=>a.isCurrent)),[message,setMessage]=useState(''),[pending,start]=useTransition();
 const request=useRef<{key:string;id:string}|null>(null);const dirty=JSON.stringify({rows,explanation})!==saved;
 const current=activity.attempts.find(a=>a.isCurrent),revealed=!!activity.run?.revealedAt;
 useEffect(()=>{if(simulation)return;const warn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};const guard=(e:MouseEvent)=>{const a=(e.target as Element).closest('a');if(!dirty||!a||a.target==='_blank'||a.hasAttribute('download'))return;const url=new URL(a.href,location.href);if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return;if(!window.confirm('Leave without saving your schedule?')){e.preventDefault();e.stopPropagation();}};window.addEventListener('beforeunload',warn);document.addEventListener('click',guard,true);return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',guard,true);};},[simulation,dirty]);
 function act(action:ScheduleAction){
  const data={version:activity.run?.version??0,configVersion:activity.configVersion,rows,explanation,expectedId:current?.id??null,expectedUpdatedAt:current?.updatedAt??null};
  const error=scheduleInputError(action,data);if(error)return setMessage(error);
  if(action==='reveal'&&!window.confirm('Lock your original plan and reveal the disruption? You can then edit a revised copy.'))return;
  if(simulation){
   if(action==='reveal'){setActivity({...activity,run:{version:1,working:rows,original:structuredClone(rows),revised:structuredClone(rows),explanation:'',revealedAt:new Date().toISOString()}});setPlan('revised');}
   if(action==='submit'&&activity.run?.original){const now=new Date().toISOString();setActivity({...activity,run:{...activity.run,revised:structuredClone(rows),explanation},attempts:[{id:crypto.randomUUID(),status:'submitted',original:structuredClone(activity.run.original),revised:structuredClone(rows),explanation,updatedAt:now,submittedAt:now,isCurrent:true},...activity.attempts.map(a=>({...a,isCurrent:false}))]});setEditing(false);}
   setSaved(JSON.stringify({rows,explanation}));setMessage(action==='reveal'?'Original plan locked in preview.':'Preview only. Nothing was saved or submitted.');return;
  }
  const key=JSON.stringify({action,data});if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  start(async()=>{try{const r=await saveSchedule(action,assignmentId,data,id);if(r.error)return setMessage(r.error);if(r.activity){const loaded=r.activity,nextRows=loaded.run?.revised??loaded.run?.working??rows,nextExplanation=loaded.run?.explanation??'';setActivity(loaded);setRows(nextRows);setExplanation(nextExplanation);setSaved(JSON.stringify({rows:nextRows,explanation:nextExplanation}));if(action==='reveal')setPlan('revised');if(action==='submit')setEditing(false);setMessage(action==='submit'?'Schedule submitted for review.':action==='reveal'?'Original plan locked.':'Draft saved.');}}catch{setMessage('Could not confirm the save. Your input is retained; retry.');}});
 }
 return <div className="mt-8">{simulation?<p className="mb-4 text-sm font-semibold text-ink-soft">{browse?'Fictional practice':'Admin preview'} · Nothing is saved or submitted.</p>:null}<ActivityViewNav value={view} onChange={setView}/>
 <div hidden={view!=='instructions'}><BriefReader instructions={activity.overview??''}/><Button className="mt-6" onClick={()=>setView('workspace')}>Open workspace →</Button></div>
 <div hidden={view!=='workspace'}>{!activity.scenario?<p className="text-sm">Your schedule activity is being prepared.</p>:<>
 {current&&!editing?<section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{current.status==='completed'?'Complete':current.status==='revision_requested'?'Revision requested':'Awaiting review'}</h2>{current.status!=='completed'?<Button variant="secondary" onClick={()=>setEditing(true)}>Revise submission</Button>:null}</div>{current.feedback?<p className="whitespace-pre-wrap rounded-lg bg-surface-subtle p-4 text-sm leading-7">{current.feedback}</p>:null}<ScheduleComparison key={current.id} snapshot={current}/></section>:<>
 <section className="mb-6 max-w-3xl">{!/^#{2,3}\s/m.test(activity.scenario)?<h2 className="mb-3 text-xl font-bold">Original scenario</h2>:null}<AssignmentBrief instructions={activity.scenario} format="markdown"/></section>
 {revealed?<section className="mb-6 max-w-3xl rounded-lg border border-border bg-surface p-5">{!/^#{2,3}\s/m.test(activity.disruption??'')?<h2 className="mb-3 font-bold">The disruption</h2>:null}<AssignmentBrief instructions={activity.disruption??''} format="markdown"/></section>:null}
 <nav aria-label="Schedule plan" className="mb-5 flex gap-2"><button type="button" aria-pressed={plan==='original'} onClick={()=>setPlan('original')} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${plan==='original'?'bg-success-bg text-action':'hover:bg-surface-subtle'}`}>Original plan{revealed?' · Locked':''}</button>{revealed?<button type="button" aria-pressed={plan==='revised'} onClick={()=>setPlan('revised')} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${plan==='revised'?'bg-success-bg text-action':'hover:bg-surface-subtle'}`}>Revised plan</button>:null}</nav>
 <div hidden={plan!=='original'}><ScheduleGrid rows={revealed?activity.run?.original??[]:rows} onChange={revealed?undefined:setRows} disabled={pending} label="Original schedule"/></div><div hidden={plan!=='revised'||!revealed}><ScheduleGrid rows={rows} onChange={setRows} disabled={pending} label="Revised schedule"/></div>
 {revealed?<label className="mt-6 block text-sm font-semibold">What changed and why?<textarea value={explanation} maxLength={2000} disabled={pending} rows={4} className="mt-2 block w-full max-w-3xl rounded-lg border border-border-strong p-3 text-base font-normal leading-7" onChange={e=>setExplanation(e.target.value)}/><span className="mt-2 block text-xs text-ink-soft">{Array.from(explanation).length} / 2,000 characters</span></label>:null}
 <div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" disabled={pending||!dirty} onClick={()=>act('draft')}>{pending?'Saving…':'Save draft'}</Button>{revealed?<Button disabled={pending} onClick={()=>act('submit')}>Submit revised plan</Button>:<Button disabled={pending} onClick={()=>act('reveal')}>Save original &amp; reveal disruption</Button>}</div>
 </>}
 {activity.attempts.filter(a=>!a.isCurrent).length?<details className="mt-8 border-t border-border pt-5"><summary className="cursor-pointer py-2 text-sm font-semibold">Previous submissions</summary>{activity.attempts.filter(a=>!a.isCurrent).map(a=><details key={a.id} className="mt-4 rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm font-semibold">{formatSubmissionTime(a.submittedAt)} · {a.status.replace('_',' ')}</summary>{a.feedback?<p className="my-4 whitespace-pre-wrap text-sm">{a.feedback}</p>:null}<ScheduleComparison snapshot={a}/></details>)}</details>:null}
 </>}{message?<p role="status" className="mt-5 text-sm font-semibold">{message}</p>:null}</div></div>;
}
