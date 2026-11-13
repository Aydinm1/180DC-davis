'use client';
import {useState} from 'react';
import type {ScheduleSnapshot} from '@/lib/schedules/types';
import {ScheduleGrid} from './schedule-grid';
export function ScheduleComparison({snapshot}:{snapshot:ScheduleSnapshot}){
 const [tab,setTab]=useState<'original'|'revised'>('revised');
 return <section aria-label="Submitted schedules"><nav aria-label="Submitted plan" className="mb-5 flex gap-2">{(['original','revised'] as const).map(t=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${tab===t?'bg-success-bg text-action':'hover:bg-surface-subtle'}`}>{t==='original'?'Original plan':'Revised plan'}</button>)}</nav><div hidden={tab!=='original'}><ScheduleGrid rows={snapshot.original} label="Original submitted schedule"/></div><div hidden={tab!=='revised'}><ScheduleGrid rows={snapshot.revised} label="Revised submitted schedule"/></div><h3 className="mt-6 font-semibold">What changed and why?</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{snapshot.explanation}</p></section>;
}
