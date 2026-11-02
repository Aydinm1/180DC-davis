'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentBrief } from './assignment-brief';
import { ActivityViewNav, BriefReader, type ActivityView } from './activity-views';
import { Progress } from '@/components/ui/progress';
import { saveCaseExercise } from '@/lib/cases/actions';
import type { CaseAnswer, CaseAction, CaseExercise } from '@/lib/cases/types';

const empty: CaseAnswer={method:'',framework:'',priority:''};
export function CaseExerciseFlow({assignmentId,initial,preview=false}:{assignmentId:string;initial:CaseExercise;preview?:boolean}) {
 const router=useRouter();
 const [exercise,setExercise]=useState(initial);
 const [view,setView]=useState<ActivityView>(initial.cases.some(c=>c.answer)?'workspace':'instructions');
 const [comparison,setComparison]=useState<'response'|'reference'>('reference');
 const [index,setIndex]=useState(()=>Math.min(7,initial.cases.findIndex(c=>!c.answer?.reviewedAt)<0?7:initial.cases.findIndex(c=>!c.answer?.reviewedAt)));
 const [draft,setDraft]=useState<CaseAnswer>(()=>initial.cases[index]?.answer??empty);
 const [comparing,setComparing]=useState(!!initial.cases[index]?.answer);
 const [message,setMessage]=useState('');
 const [pending,startTransition]=useTransition();
 const request=useRef<{key:string;id:string}|null>(null);
 const current=exercise.cases[index];
 const completed=!!exercise.run?.completedAt;
 const dirty=!comparing && (draft.method!==(current?.answer?.method??'') || draft.framework!==(current?.answer?.framework??'') || draft.priority!==(current?.answer?.priority??''));
 useEffect(()=>{
  if(!dirty)return;
  const unload=(e:BeforeUnloadEvent)=>e.preventDefault();
  const click=(e:MouseEvent)=>{const link=(e.target as Element).closest<HTMLAnchorElement>('a[href]');if(link&&!(link.pathname===location.pathname&&link.search===location.search&&link.hash)&&!window.confirm('Leave without saving this case?')){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
 },[dirty]);
 function move(next:number,data=exercise){setIndex(next);setDraft(data.cases[next]?.answer??empty);setComparing(!!data.cases[next]?.answer);setComparison('reference');setMessage('');}
 function save(action:CaseAction){
  const data={version:exercise.run?.version??0,caseNumber:index+1,...(action==='save'?{method:draft.method,framework:draft.framework,priority:draft.priority}:{})};
  if(preview){
   if(action==='save'){const updated={...exercise,cases:exercise.cases.map((c,i)=>i===index?{...c,answer:{...draft}}:c)};setExercise(updated);setComparing(true);setComparison('reference');setMessage('Practice only — nothing was saved.');}
   else if(action==='next')move(index+1);
   else setMessage('Practice only — completion is disabled.');
   return;
  }
  const key=JSON.stringify({action,data});if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  startTransition(async()=>{
   try {
    const result=await saveCaseExercise(action,assignmentId,data,id);
    if(result.error)return setMessage(result.error);
    if(!result.exercise)return setMessage('Could not refresh. Retry with the same input.');
    setExercise(result.exercise);
    if(action==='save'){setComparing(true);setComparison('reference');setMessage('Response saved.');}
    else if(action==='next')move(index+1,result.exercise);
    else {setMessage('Challenge complete. Your responses are now read-only.');router.refresh();}
   }catch{setMessage('Save could not be confirmed. Your input is retained; retry with the same input.');}
  });
 }
 if(!current)return <p className="mt-8">Your exercise is being prepared.</p>;
 return <div className="mt-8">
  {preview?<p className="rounded-lg border border-border p-4 text-sm font-semibold">Practice preview — nothing is saved. Leaving resets your answers.</p>:null}
  <ActivityViewNav value={view} onChange={setView}/>
  <div hidden={view!=='instructions'}>
   <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Challenge instructions</h2><Button onClick={()=>setView('workspace')}>{exercise.cases.some(c=>c.answer)?'Return to workspace':'Start assignment'}</Button></div>
   <BriefReader instructions={exercise.overview??''}/>
  </div>
  <div hidden={view!=='workspace'}>
  {completed?<section role="status" className="mb-8 max-w-3xl rounded-card border border-border bg-surface p-6"><h2 className="text-xl font-bold">Challenge complete</h2><p className="mt-2 text-sm">Completed {new Date(exercise.run!.completedAt!).toLocaleString('en-US',{timeZone:'America/Los_Angeles',timeZoneName:'short'})}.</p>{exercise.closing?<div className="mt-5"><AssignmentBrief instructions={exercise.closing} format="markdown"/></div>:null}</section>:null}
  <div className="flex flex-wrap items-center justify-between gap-5 border-b border-border pb-6">
   <nav aria-label="Cases" className="flex flex-wrap gap-2">{exercise.cases.map((c,i)=><button key={c.number} aria-label={`Case ${c.number}${c.answer?' · Saved':''}`} aria-current={i===index?'step':undefined} disabled={pending || (!preview&&!c.answer&&i>0&&!exercise.cases[i-1].answer?.reviewedAt)} className={`min-h-11 min-w-11 rounded-lg border p-2 text-sm font-semibold ${i===index?'border-action bg-action text-white':'border-border bg-surface'} disabled:opacity-40`} onClick={()=>{if(dirty&&!window.confirm('Discard unsaved changes to this case?'))return;move(i);}}>{c.number}{c.answer?' ✓':''}</button>)}</nav>
   <div className="w-full sm:w-52"><Progress value={exercise.cases.filter(c=>c.answer).length} max={8} label="Saved cases" valueLabel={`${exercise.cases.filter(c=>c.answer).length} of 8`}/></div>
  </div>
  <section className="py-7">
   <div className="mb-7 flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-brand-deep">Case {index+1} of 8</p><h2 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{current.title}</h2></div>
    {comparing?<div className="flex flex-wrap gap-3">{!completed?<Button variant="secondary" disabled={pending} onClick={()=>{setDraft(current.answer??empty);setComparing(false);}}>Edit response</Button>:null}
     {!completed?<Button disabled={pending} onClick={()=>{if(index===7&&!preview&&!window.confirm('Finish challenge? This locks all eight responses and marks the assignment complete.'))return;save(index===7?'finish':'next');}}>{pending?'Saving…':index===7?'Finish challenge':'Next case →'}</Button>:null}</div>:null}
   </div>
   <div className="max-w-3xl"><AssignmentBrief instructions={current.scenario} format="markdown"/></div>
   {message?<p role="status" className="mt-5 text-sm font-semibold">{message}</p>:null}
   {comparing?<div className="mt-8">
    <nav aria-label="Compare approaches" className="mb-6 flex gap-4 border-b border-border xl:hidden">{(['response','reference'] as const).map(tab=><button key={tab} type="button" aria-pressed={comparison===tab} onClick={()=>setComparison(tab)} className={`min-h-11 border-b-2 px-1 text-sm font-bold ${comparison===tab?'border-action text-action':'border-transparent text-ink-soft'}`}>{tab==='response'?'Your response':'Reference approach'}</button>)}</nav>
    <div className="grid items-start gap-8 xl:grid-cols-2">
    <section className={`${comparison==='response'?'block':'hidden xl:block'} min-w-0 rounded-card border border-border bg-surface p-5 sm:p-7`}><h3 className="mb-5 text-lg font-bold">Your saved response</h3><p className="font-semibold capitalize">{current.answer?.method} decomposition</p><h4 className="mt-5 text-sm font-bold">Your framework</h4><p className="mt-2 whitespace-pre-wrap break-words">{current.answer?.framework}</p><h4 className="mt-5 text-sm font-bold">First investigation and why</h4><p className="mt-2 whitespace-pre-wrap break-words">{current.answer?.priority}</p></section>
    <section className={`${comparison==='reference'?'block':'hidden xl:block'} min-w-0 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0`}><h3 className="text-lg font-bold">Reference approach</h3><p className="mb-5 mt-2 text-sm text-ink-soft">One possible approach, not the only correct answer.</p>{current.reference?<AssignmentBrief instructions={current.reference} format="markdown"/>:<p className="text-sm">Reference approaches are available after saving in the member workflow.</p>}</section>
    </div>
   </div>:<form className="mt-7 max-w-3xl space-y-6 rounded-card border border-border bg-surface p-5 sm:p-7" onSubmit={e=>{e.preventDefault();save('save');}}>
    <fieldset disabled={pending||completed}><legend className="font-semibold">1. Which decomposition method would you use?</legend>{['mathematical','process','decision'].map(method=><label key={method} className="mt-2 flex min-h-11 items-center gap-3 capitalize"><input required type="radio" name="method" value={method} checked={draft.method===method} onChange={()=>setDraft({...draft,method})}/>{method} decomposition</label>)}</fieldset>
    <label className="block font-semibold" htmlFor="case-framework">2. Break down the problem</label><p className="text-sm text-ink-soft">Write your core equation, process stages, or decision buckets.</p><textarea id="case-framework" required maxLength={10000} disabled={pending||completed} className="min-h-40 w-full rounded-lg border border-border p-4" value={draft.framework} onChange={e=>setDraft({...draft,framework:e.target.value})}/>
    <label className="block font-semibold" htmlFor="case-priority">3. What would you investigate first, and why?</label><textarea id="case-priority" required maxLength={10000} disabled={pending||completed} className="min-h-32 w-full rounded-lg border border-border p-4" value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}/>
    <Button type="submit" disabled={pending||completed||!draft.method||!draft.framework.trim()||!draft.priority.trim()}>{pending?'Saving…':'Save & reveal reference approach'}</Button>
   </form>}
  </section>
  </div>
 </div>;
}
