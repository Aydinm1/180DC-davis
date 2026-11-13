'use client';

import type {ScheduleAllocation} from '@/lib/schedules/allocation';

const hours=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2});
export function ScheduleAllocationView({allocation,week,onWeekChange,planLabel}:{allocation:ScheduleAllocation;week:number;onWeekChange:(week:number)=>void;planLabel:string}){
 const current=allocation.weeks[week-1];
 return <section aria-label="Resource allocation" className="space-y-5 p-4 sm:p-6">
  <div><h3 className="text-lg font-semibold">{planLabel} · Resource allocation</h3><p className="mt-1 text-sm text-ink-soft">5 hours per consultant per week</p></div>
  <div role="group" aria-label="Allocation week" className="flex flex-wrap gap-2">{allocation.weeks.map((consultants,i)=>{
   const over=consultants.some(c=>c.hours>5+1e-9);
   return <button type="button" key={i} aria-pressed={week===i+1} aria-label={`Week ${i+1}${over?' — over capacity':''}`} onClick={()=>onWeekChange(i+1)} className={`relative min-h-11 min-w-11 rounded-md border px-3 text-sm font-semibold ${week===i+1?'border-action bg-success-bg text-action':'border-border hover:bg-surface-subtle'}`}>W{i+1}{over?<span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-danger-text"/>:null}</button>;
  })}</div>
  {allocation.incomplete.length?<p role="status" className="rounded-md bg-surface-subtle p-3 text-sm">{allocation.incomplete.length} {allocation.incomplete.length===1?'task needs':'tasks need'} a schedule, consultants or hours before {allocation.incomplete.length===1?'it can':'they can'} be included.</p>:null}
  <div className="grid gap-3 @sm:grid-cols-2 @4xl:grid-cols-5">{current.map(c=>{
   const over=c.hours>5+1e-9;
   return <section key={c.consultant} aria-label={`Consultant ${c.consultant}, Week ${week}`} className={`rounded-lg border p-4 ${over?'border-danger-text/40 bg-danger-bg':'border-border bg-surface'}`}>
    <h4 className="text-sm text-ink-soft">Consultant {c.consultant}</h4><p className="mt-3 text-lg font-semibold tabular-nums">{hours(c.hours)} <span className="text-sm font-normal text-ink-soft">/ 5 hrs</span></p>
    <div role="meter" aria-label={`Consultant ${c.consultant} workload`} aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(c.hours,5)} aria-valuetext={`${hours(c.hours)} of 5 hours${over?', over capacity':''}`} className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle"><div className={`h-full rounded-full ${over?'bg-danger-text':'bg-action'}`} style={{width:`${Math.min(100,c.hours/5*100)}%`}}/></div>
    <p className={`mt-2 text-xs ${over?'font-semibold text-danger-text':'text-ink-soft'}`}>{over?`${hours(c.hours-5)} hrs over capacity`:`${hours(Math.max(0,5-c.hours))} hrs available`}</p>
   </section>;
  })}</div>
  <details className="border-t border-border pt-3"><summary className="cursor-pointer py-2 text-sm font-semibold">Week {week} task breakdown</summary><div className="mt-2 grid gap-4 @sm:grid-cols-2 @4xl:grid-cols-5">{current.map(c=><section key={c.consultant}><h4 className="mb-2 text-sm font-semibold">Consultant {c.consultant}</h4>{c.tasks.length?<ul className="space-y-2">{c.tasks.map(t=><li key={t.id} className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 break-words">{t.name||'Untitled task'}</span><span className="shrink-0 tabular-nums text-ink-soft">{hours(t.hours)} h</span></li>)}</ul>:<p className="text-sm text-ink-soft">No scheduled work</p>}</section>)}</div></details>
  <p className="text-xs text-ink-soft">Estimated task hours are split equally among assigned consultants and scheduled days. Capacity warnings do not block submission.</p>
 </section>;
}
