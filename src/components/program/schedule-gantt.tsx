'use client';

import {useEffect,useId,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {Button} from '@/components/ui/button';
import type {DayScheduleRow,ScheduleBlock} from '@/lib/schedules/types';
import {changeBlock,dayLabel,mergeBlocks,weekdays} from '@/lib/schedules/gantt';

const dayWidth=44,timelineWidth=70*dayWidth;
type Gesture={pointer:number;rowId:string;kind:'create'|'move'|'start'|'end';block:ScheduleBlock;originDay:number;clientX:number;rows:DayScheduleRow[];track:HTMLElement};
const field='min-h-11 rounded-md border border-border-strong bg-surface px-2 text-base';

export function ScheduleGantt({rows,onChange,disabled=false,label}:{rows:DayScheduleRow[];onChange?:(rows:DayScheduleRow[])=>void;disabled?:boolean;label:string}){
 const uid=useId(),scroll=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null);
 const [selection,setSelection]=useState<{task:string;block?:string}|null>(null),[preview,setPreview]=useState<DayScheduleRow[]|null>(null),[announcement,setAnnouncement]=useState('');
 const shown=preview??rows,selected=shown.find(row=>row.id===selection?.task)??shown[0],editable=!!onChange,busy=disabled||!!preview;
 const active=selected?.blocks.find(block=>block.id===selection?.block)??selected?.blocks[0];
 function update(row:DayScheduleRow){onChange?.(rows.map(item=>item.id===row.id?row:item));}
 function select(task:string,block?:string){setSelection({task,block});}
 function cancel(){gesture.current=null;setPreview(null);setAnnouncement('Schedule change canceled.');}
 function pointDay(track:HTMLElement,x:number){return Math.max(1,Math.min(70,Math.floor((x-track.getBoundingClientRect().left)/dayWidth)+1));}
 function dragRows(g:Gesture){
  const day=pointDay(g.track,g.clientX),block=g.kind==='create'?{...g.block,start:Math.min(g.originDay,day),end:Math.max(g.originDay,day)}:changeBlock(g.block,g.kind,day-g.originDay);
  return {block,rows:g.rows.map(row=>row.id===g.rowId?{...row,blocks:[...row.blocks.filter(b=>b.id!==g.block.id),block].sort((a,b)=>a.start-b.start)}:row)};
 }
 useEffect(()=>{
  if(!preview)return;
  let frame:number;
  const tick=()=>{const g=gesture.current,el=scroll.current;if(!g||!el)return;const bounds=el.getBoundingClientRect(),gutter=el.querySelector('[data-task-label]')?.getBoundingClientRect().width??216;const speed=g.clientX>bounds.right-44?Math.min(18,(g.clientX-(bounds.right-44))/2):g.clientX<bounds.left+gutter+44?-Math.min(18,(bounds.left+gutter+44-g.clientX)/2):0;
   if(speed){el.scrollLeft+=speed;setPreview(dragRows(g).rows);}frame=requestAnimationFrame(tick);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();cancel();}};
  frame=requestAnimationFrame(tick);window.addEventListener('keydown',escape);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',escape);};
 // The gesture holds the fixed starting rows; later pointer positions never accumulate deltas.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[!!preview]);
 function begin(e:ReactPointerEvent<HTMLDivElement>,row:DayScheduleRow){
  if(!editable||disabled||e.button!==0)return;
  const target=e.target as HTMLElement,element=target.closest<HTMLElement>('[data-block]'),block=row.blocks.find(b=>b.id===element?.dataset.block),day=pointDay(e.currentTarget,e.clientX);
  const handle=target.closest<HTMLElement>('[data-handle]')?.dataset.handle;
  const kind=block?(handle==='start'?'start':handle==='end'?'end':'move'):'create';
  const current=block??{id:crypto.randomUUID(),start:day,end:day};
  gesture.current={pointer:e.pointerId,rowId:row.id,kind,block:current,originDay:day,clientX:e.clientX,rows,track:e.currentTarget};
  e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();select(row.id,current.id);setPreview(dragRows(gesture.current).rows);
 }
 function move(e:ReactPointerEvent<HTMLDivElement>){const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;g.clientX=e.clientX;setPreview(dragRows(g).rows);}
 function finish(e:ReactPointerEvent<HTMLDivElement>){const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;g.clientX=e.clientX;const result=dragRows(g);gesture.current=null;setPreview(null);
  const next=result.rows.map(row=>row.id===g.rowId?{...row,blocks:mergeBlocks(row.blocks)}:row),block=next.find(row=>row.id===g.rowId)?.blocks.find(b=>b.start<=result.block.start&&b.end>=result.block.end);
  onChange?.(next);select(g.rowId,block?.id);requestAnimationFrame(()=>g.track.querySelector<HTMLButtonElement>(`[data-block="${block?.id}"] button:nth-of-type(2)`)?.focus({preventScroll:true}));setAnnouncement(`${dayLabel(result.block.start)} through ${dayLabel(result.block.end)}.`);
 }
 function addTask(){const id=crypto.randomUUID();onChange?.([...rows,{id,name:'',blocks:[],consultants:[],hours:null}]);select(id);requestAnimationFrame(()=>document.getElementById(`${uid}-${id}`)?.focus());}
 function setRange(edge:'start'|'end',day:number){if(!selected||!active)return;const block={...active,[edge]:day};if(edge==='start'&&day>block.end)block.end=day;if(edge==='end'&&day<block.start)block.start=day;const blocks=mergeBlocks(selected.blocks.map(b=>b.id===active.id?block:b));update({...selected,blocks});select(selected.id,blocks.find(b=>b.start<=block.start&&b.end>=block.end)?.id);}
 function addBlock(){if(!selected)return;const days=Array.from({length:70},(_,i)=>i+1);const day=days.find(day=>!selected.blocks.some(b=>day>=b.start-1&&day<=b.end+1))??days.find(day=>!selected.blocks.some(b=>day>=b.start&&day<=b.end));if(!day)return;const block={id:crypto.randomUUID(),start:day,end:day},blocks=mergeBlocks([...selected.blocks,block]);update({...selected,blocks});select(selected.id,blocks.find(b=>day>=b.start&&day<=b.end)?.id);}
 function rangeControl(edge:'start'|'end'){
  const day=active?.[edge]??1,week=Math.ceil(day/7),weekday=(day-1)%7;
  return <fieldset className="flex min-w-0 flex-wrap items-center gap-2"><legend className="mb-1 text-xs font-semibold">{edge==='start'?'Start':'End'}</legend><select aria-label={`${edge==='start'?'Start':'End'} week`} className={field} value={week} disabled={busy||!active} onChange={e=>setRange(edge,(Number(e.target.value)-1)*7+weekday+1)}>{Array.from({length:10},(_,i)=><option key={i} value={i+1}>Week {i+1}</option>)}</select><select aria-label={`${edge==='start'?'Start':'End'} day`} className={field} value={weekday} disabled={busy||!active} onChange={e=>setRange(edge,(week-1)*7+Number(e.target.value)+1)}>{weekdays.map((name,i)=><option key={name} value={i}>{name}</option>)}</select></fieldset>;
 }
 return <div className="min-w-0 space-y-4">
  {editable&&selected?<section aria-label="Selected task" className="rounded-lg border border-border bg-surface p-4"><h3 className="mb-3 break-words font-semibold">{selected.name.trim()||'New task'}</h3><div className="flex flex-wrap items-end gap-5"><fieldset><legend className="mb-1 text-xs font-semibold">Consultants</legend><div className="flex flex-wrap gap-1">{[1,2,3,4,5].map(n=><label key={n} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-subtle"><input type="checkbox" aria-label={`Consultant ${n}`} checked={selected.consultants.includes(n)} disabled={busy} onChange={e=>update({...selected,consultants:e.target.checked?[...selected.consultants,n].sort():selected.consultants.filter(c=>c!==n)})}/>{n}</label>)}</div></fieldset><label className="text-xs font-semibold">Total estimated hours<input type="number" aria-label="Estimated hours" min="0.01" step="0.01" value={selected.hours??''} disabled={busy} className={`${field} mt-1 block w-32 font-normal`} onChange={e=>update({...selected,hours:e.target.value===''?null:Number(e.target.value)})}/></label></div>
   <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold">Scheduled block<select aria-label="Scheduled block" className={`${field} mt-1 block max-w-full font-normal`} value={active?.id??''} disabled={busy||!active} onChange={e=>select(selected.id,e.target.value)}>{!selected.blocks.length?<option value="">No scheduled block</option>:null}{selected.blocks.map(b=><option key={b.id} value={b.id}>{dayLabel(b.start)} – {dayLabel(b.end)}</option>)}</select></label>{rangeControl('start')}{rangeControl('end')}<Button variant="secondary" disabled={busy||selected.blocks.some(b=>b.start===1&&b.end===70)} onClick={addBlock}>Add scheduled block</Button><Button variant="secondary" disabled={busy||!active} onClick={()=>{if(active){update({...selected,blocks:selected.blocks.filter(b=>b.id!==active.id)});select(selected.id);}}}>Remove block</Button></div>
  </section>:null}
  <div ref={scroll} role="region" aria-label={label} tabIndex={0} className="max-w-full overflow-x-auto rounded-lg border border-border bg-surface [--task-width:176px] sm:[--task-width:216px] focus-visible:outline-2 focus-visible:outline-action">
   <div style={{width:`calc(var(--task-width) + ${timelineWidth}px)`}}>
    <div className="flex border-b border-border text-xs font-semibold"><div className="sticky left-0 z-20 flex shrink-0 items-center bg-surface px-3" style={{width:'var(--task-width)'}}>Task</div><div><div className="flex">{Array.from({length:10},(_,i)=><div key={i} className="border-l border-border py-2 text-center" style={{width:7*dayWidth,textAlign:'left'}}><span className="sticky inline-block px-2" style={{left:'calc(var(--task-width) + 8px)'}}>Week {i+1}</span></div>)}</div><div className="flex">{Array.from({length:70},(_,i)=><div key={i} className="border-l border-border py-2 text-center text-ink-soft" style={{width:dayWidth}}>{weekdays[i%7]}</div>)}</div></div></div>
    {shown.map((row,i)=><div key={row.id} role="group" aria-label={`${row.name||`Task ${i+1}`} schedule`} className="flex border-b border-border last:border-0">
     <div data-task-label className={`sticky left-0 z-10 shrink-0 border-r border-border p-2 ${selected?.id===row.id?'bg-success-bg':'bg-surface'}`} style={{width:'var(--task-width)'}}>{editable?<div className="flex items-center gap-1"><input id={`${uid}-${row.id}`} aria-label={`Task ${i+1} name`} maxLength={200} value={row.name} disabled={busy} className={`${field} min-w-0 flex-1`} placeholder="Task name" onFocus={()=>select(row.id)} onChange={e=>update({...row,name:e.target.value})}/><button type="button" aria-label={`Remove task ${i+1}`} disabled={busy} className="size-11 shrink-0 rounded-md text-xl text-ink-soft hover:bg-surface-subtle" onClick={()=>{if((row.name.trim()||row.blocks.length||row.consultants.length||row.hours)&&!window.confirm('Remove this task from the current plan?'))return;onChange?.(rows.filter(r=>r.id!==row.id));setSelection(null);}}><span aria-hidden="true">×</span></button></div>:<p className="break-words py-1 text-sm font-semibold">{row.name}</p>}<p className="mt-1 break-words text-xs leading-5 text-ink-soft">{row.consultants.length?`Consultant ${row.consultants.join(', ')}`:'Unassigned'} · {row.hours===null?'Hours unset':`${row.hours}h`}</p></div>
     <div data-schedule-track={row.id} className="relative min-h-24 shrink-0" style={{width:timelineWidth,touchAction:editable?'pan-y':'auto',backgroundImage:'repeating-linear-gradient(to right, transparent 0, transparent 43px, var(--color-border) 43px, var(--color-border) 44px)'}} onPointerDown={e=>begin(e,row)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel();}}>
      {row.blocks.map(block=><div key={block.id} data-block={block.id} className={`absolute top-7 flex h-11 items-center rounded-md bg-action text-white ${selected?.id===row.id&&active?.id===block.id?'outline-2 outline-offset-2 outline-action':''}`} style={{left:(block.start-1)*dayWidth+2,width:(block.end-block.start+1)*dayWidth-4,touchAction:editable?'none':'auto'}}>
       {editable?<><button type="button" data-handle="start" aria-label={`Resize start: ${row.name||`Task ${i+1}`}`} disabled={disabled} className="h-11 w-3 shrink-0 cursor-ew-resize rounded-l-md bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={()=>select(row.id,block.id)}><span aria-hidden="true">⋮</span></button><button type="button" aria-label={`${row.name||`Task ${i+1}`}: ${dayLabel(block.start)} through ${dayLabel(block.end)}`} disabled={disabled} className="h-full min-w-0 flex-1 cursor-grab overflow-hidden px-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing" onClick={()=>select(row.id,block.id)}><span className="sr-only">Scheduled </span><span aria-hidden="true">{block.end-block.start>1?row.name:''}</span></button><button type="button" data-handle="end" aria-label={`Resize end: ${row.name||`Task ${i+1}`}`} disabled={disabled} className="h-11 w-3 shrink-0 cursor-ew-resize rounded-r-md bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={()=>select(row.id,block.id)}><span aria-hidden="true">⋮</span></button></>:<span className="overflow-hidden px-3 text-xs"><span className="sr-only">{row.name}: </span>{dayLabel(block.start)} – {dayLabel(block.end)}</span>}
      </div>)}
     </div>
    </div>)}
   </div>{!rows.length?<p className="p-4 text-sm text-ink-soft">No tasks added.</p>:null}
  </div>
  {editable?<Button variant="secondary" disabled={busy||rows.length>=30} onClick={addTask}>+ Add task</Button>:null}
  <p aria-live="polite" className="sr-only">{announcement}</p>
 </div>;
}
