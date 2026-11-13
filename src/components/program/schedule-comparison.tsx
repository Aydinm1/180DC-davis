'use client';
import {useState,type ReactNode} from 'react';
import type {ScheduleSnapshot} from '@/lib/schedules/types';
import type {ScheduleDisplay} from './schedule-gantt';
import {ScheduleGrid} from './schedule-grid';
export function ScheduleComparison({snapshot,brief}:{snapshot:ScheduleSnapshot;brief?:ReactNode}){
 const [display,setDisplay]=useState<ScheduleDisplay>({view:'timeline',week:1});
 const [tab,setTab]=useState<'original'|'revised'>('revised');
 const toolbar=<nav aria-label="Submitted plan" className="flex gap-1">{(['original','revised'] as const).map(t=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)} className={`min-h-9 rounded-md px-3 text-sm font-semibold ${tab===t?'bg-success-bg text-action':'hover:bg-surface-subtle'}`}>{t==='original'?'Original plan':'Revised plan'}</button>)}</nav>;
 return <section aria-label="Submitted schedules"><div hidden={tab!=='original'}><ScheduleGrid brief={brief} display={display} onDisplayChange={setDisplay} formatVersion={snapshot.formatVersion??1} rows={snapshot.original} planLabel="Original plan" label="Original submitted schedule" toolbar={toolbar}/></div><div hidden={tab!=='revised'}><ScheduleGrid brief={brief} display={display} onDisplayChange={setDisplay} formatVersion={snapshot.formatVersion??1} rows={snapshot.revised} planLabel="Revised plan" label="Revised submitted schedule" toolbar={toolbar}/></div><h3 className="mt-6 font-semibold">What changed and why?</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{snapshot.explanation}</p></section>;
}
