'use client';

import {useEffect,useId,useRef,useState,type ReactNode,type PointerEvent as ReactPointerEvent} from 'react';
import {Button} from '@/components/ui/button';
import {GanttPopover} from './gantt-popover';
import type {DayScheduleRow,ScheduleBlock} from '@/lib/schedules/types';
import {changeBlock,dayLabel,mergeBlocks,weekdays} from '@/lib/schedules/gantt';


type Gesture={pointer:number;rowId:string;kind:'create'|'move'|'start'|'end';block:ScheduleBlock;originDay:number;clientX:number;rows:DayScheduleRow[];track:HTMLElement};
const field='min-h-11 rounded-md border border-border-strong bg-surface px-2 text-base';

export function ScheduleGantt({rows,onChange,disabled=false,label,toolbar}:{toolbar?:ReactNode;rows:DayScheduleRow[];onChange?:(rows:DayScheduleRow[])=>void;disabled?:boolean;label:string}){
 const uid=useId(),scroll=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null);
 const [zoom,setZoom]=useState<'overview'|'weeks'|'days'>('weeks'),[available,setAvailable]=useState(1000);
 const dayWidth=zoom==='days'?44:zoom==='weeks'?20:Math.max(8,Math.floor(available/70)),timelineWidth=70*dayWidth;
 const [scheduleOpen,setScheduleOpen]=useState(false);
 const schedulePanel=useRef<HTMLDivElement>(null),scheduleAnchor=useRef<HTMLButtonElement|null>(null);
 const [panelPosition,setPanelPosition]=useState({left:8,top:8});
 function closeSchedule(){schedulePanel.current?.hidePopover();setScheduleOpen(false);scheduleAnchor.current?.focus({preventScroll:true});}
 useEffect(()=>{if(!scheduleOpen)return;const dismiss=(e:Event)=>{if(!schedulePanel.current?.contains(e.target as Node)){schedulePanel.current?.hidePopover();setScheduleOpen(false);}};window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true);return()=>{window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true);};},[scheduleOpen]);
 const [selection,setSelection]=useState<{task:string;block?:string}|null>(null),[preview,setPreview]=useState<DayScheduleRow[]|null>(null),[announcement,setAnnouncement]=useState('');
 const shown=preview??rows,selected=shown.find(row=>row.id===selection?.task),editable=!!onChange,busy=disabled||!!preview;
 const active=selected?.blocks.find(block=>block.id===selection?.block)??selected?.blocks[0];
 useEffect(()=>{const el=scroll.current;if(!el)return;const observer=new ResizeObserver(()=>{const gutter=el.querySelector('[data-task-label]')?.getBoundingClientRect().width??(innerWidth<640?180:448);setAvailable(el.clientWidth-gutter-2);});observer.observe(el);return()=>observer.disconnect();},[]);
 function changeZoom(value:'overview'|'weeks'|'days'){const day=(scroll.current?.scrollLeft??0)/dayWidth;setZoom(value);const width=value==='days'?44:value==='weeks'?20:Math.max(8,Math.floor(available/70));requestAnimationFrame(()=>{if(scroll.current)scroll.current.scrollLeft=day*width;});}
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
 function addTask(){schedulePanel.current?.hidePopover();setScheduleOpen(false);const id=crypto.randomUUID();onChange?.([...rows,{id,name:'',blocks:[],consultants:[],hours:null}]);select(id);requestAnimationFrame(()=>document.getElementById(`${uid}-${id}`)?.focus());}
 function setRange(edge:'start'|'end',day:number){if(!selected||!active)return;const block={...active,[edge]:day};if(edge==='start'&&day>block.end)block.end=day;if(edge==='end'&&day<block.start)block.start=day;const blocks=mergeBlocks(selected.blocks.map(b=>b.id===active.id?block:b));update({...selected,blocks});select(selected.id,blocks.find(b=>b.start<=block.start&&b.end>=block.end)?.id);}
 function addBlock(){if(!selected)return;const days=Array.from({length:70},(_,i)=>i+1);const day=days.find(day=>!selected.blocks.some(b=>day>=b.start-1&&day<=b.end+1))??days.find(day=>!selected.blocks.some(b=>day>=b.start&&day<=b.end));if(!day)return;const block={id:crypto.randomUUID(),start:day,end:day},blocks=mergeBlocks([...selected.blocks,block]);update({...selected,blocks});select(selected.id,blocks.find(b=>day>=b.start&&day<=b.end)?.id);}
 function rangeControl(edge:'start'|'end'){
  const day=active?.[edge]??1,week=Math.ceil(day/7),weekday=(day-1)%7;
  return <fieldset className="flex min-w-0 flex-wrap items-center gap-2"><legend className="mb-1 text-xs font-semibold">{edge==='start'?'Start':'End'}</legend><select aria-label={`${edge==='start'?'Start':'End'} week`} className={field} value={week} disabled={busy||!active} onChange={e=>setRange(edge,(Number(e.target.value)-1)*7+weekday+1)}>{Array.from({length:10},(_,i)=><option key={i} value={i+1}>Week {i+1}</option>)}</select><select aria-label={`${edge==='start'?'Start':'End'} day`} className={field} value={weekday} disabled={busy||!active} onChange={e=>setRange(edge,(week-1)*7+Number(e.target.value)+1)}>{weekdays.map((name,i)=><option key={name} value={i}>{name}</option>)}</select></fieldset>;
 }
 function removeBlock(){if(!selected||!active||busy)return;update({...selected,blocks:selected.blocks.filter(b=>b.id!==active.id)});select(selected.id);setAnnouncement('Scheduled block removed.');requestAnimationFrame(()=>scroll.current?.focus({preventScroll:true}));}
 function removeTask(row:DayScheduleRow){if((row.name.trim()||row.blocks.length||row.consultants.length||row.hours)&&!window.confirm('Remove this task from the current plan?'))return;onChange?.(rows.filter(r=>r.id!==row.id));setSelection(null);setScheduleOpen(false);}
 function taskActions(e:React.MouseEvent<HTMLButtonElement>,row:DayScheduleRow,action:'schedule'|'remove'){
  const trigger=document.getElementById(`${uid}-${row.id}`)?.parentElement?.querySelector<HTMLButtonElement>('button');
  e.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();if(action==='remove')return removeTask(row);
  scheduleAnchor.current=trigger??null;const bounds=trigger?.getBoundingClientRect();
  setPanelPosition({left:Math.max(8,Math.min(bounds?.left??8,innerWidth-376)),top:Math.max(8,Math.min(bounds?.bottom??80,innerHeight-360))});
  select(row.id,row.blocks[0]?.id);setScheduleOpen(true);requestAnimationFrame(()=>{schedulePanel.current?.showPopover();schedulePanel.current?.querySelector<HTMLButtonElement>('button')?.focus();});
 }
 function consultantField(row:DayScheduleRow,i:number){return editable?<GanttPopover label={`Assign consultants for task ${i+1}`} disabled={busy} trigger={<><span className="truncate text-xs">{row.consultants.length?row.consultants.map(n=>`C${n}`).join(', '):'Assign'}</span><span aria-hidden="true" className="text-ink-soft">⌄</span></>}>
  {[1,2,3,4,5].map(n=><label key={n} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm hover:bg-surface-subtle"><input type="checkbox" aria-label={`Consultant ${n}`} disabled={busy} checked={row.consultants.includes(n)} onChange={e=>update({...row,consultants:e.target.checked?[...row.consultants,n].sort():row.consultants.filter(c=>c!==n)})}/>Consultant {n}</label>)}
 </GanttPopover>:<span className="block px-2 text-xs">{row.consultants.length?row.consultants.map(n=>`C${n}`).join(', '):'—'}</span>;}
 return <div className="min-w-0 space-y-3" onKeyDown={e=>{
  if(!editable||busy||!selection?.block||!['Delete','Backspace'].includes(e.key)||e.metaKey||e.ctrlKey||e.altKey)return;
  const target=e.target as HTMLElement;if(!target.closest('[data-block]')&&target!==scroll.current)return;
  e.preventDefault();e.stopPropagation();removeBlock();
 }}>
  <div className="overflow-hidden rounded-lg border border-border bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2"><div className="flex flex-wrap items-center gap-2">{toolbar??<span className="text-sm font-semibold">{label}</span>}</div><div role="group" aria-label="Timeline zoom" className="flex rounded-lg bg-surface-subtle p-1">{(['overview','weeks','days'] as const).map(value=><button type="button" key={value} aria-pressed={zoom===value} disabled={busy} onClick={()=>changeZoom(value)} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${zoom===value?'bg-surface text-action shadow-sm':'text-ink-soft hover:text-ink'}`}>{value==='overview'?'Overview':value==='weeks'?'Weeks':'Days'}</button>)}</div></div>
  <div ref={scroll} role="region" aria-label={label} tabIndex={0} className="max-h-[min(680px,70dvh)] max-w-full overflow-auto bg-surface [--task-width:180px] sm:[--task-width:448px] focus-visible:outline-2 focus-visible:outline-action">
   <div style={{width:`calc(var(--task-width) + ${timelineWidth}px)`}}>
    <div className="sticky top-0 z-30 flex h-16 border-b border-border bg-surface text-xs font-semibold"><div className="sticky left-0 z-20 grid shrink-0 items-center bg-surface sm:grid-cols-[240px_128px_80px]" style={{width:'var(--task-width)'}}><span className="px-3">Task</span><span className="hidden border-l border-border px-3 sm:block">Consultants</span><span className="hidden border-l border-border px-3 sm:block">Hours</span></div><div><div className="flex">{Array.from({length:10},(_,i)=><div key={i} className="border-l border-border py-2 text-center" style={{width:7*dayWidth,textAlign:'left'}}><span className="sticky inline-block px-2" style={{left:'calc(var(--task-width) + 8px)'}}>Week {i+1}</span></div>)}</div><div className={`flex ${zoom==='overview'?'invisible':''}`}>{Array.from({length:70},(_,i)=><div key={i} className="border-l border-border py-2 text-center text-ink-soft" style={{width:dayWidth}}>{zoom==='days'?weekdays[i%7]:weekdays[i%7][0]}</div>)}</div></div></div>
    {shown.map((row,i)=><div key={row.id} role="group" aria-label={`${row.name||`Task ${i+1}`} schedule`} className="group/row flex border-b border-border/60">
     <div data-task-label className={`sticky left-0 z-10 focus-within:z-40 grid shrink-0 grid-cols-2 items-center border-r border-border sm:grid-cols-[240px_128px_80px] ${selected?.id===row.id?'bg-[#f4f8f1]':'bg-surface group-hover/row:bg-[#fafbf9]'}`} style={{width:'var(--task-width)'}}>
      <div className="relative col-span-2 flex min-h-12 min-w-0 items-start px-2 sm:col-span-1">{editable?<><textarea rows={1} title={row.name} id={`${uid}-${row.id}`} aria-label={`Task ${i+1} name`} maxLength={200} value={row.name} disabled={busy} className="h-11 min-h-11 min-w-0 flex-1 resize-none overflow-hidden rounded border border-transparent bg-transparent px-2 py-3 text-sm leading-5 hover:border-border whitespace-nowrap focus:absolute focus:bottom-0 focus:left-2 focus:z-40 focus:h-24 focus:w-[calc(100%-60px)] focus:whitespace-pre-wrap focus:overflow-auto focus:border-action focus:bg-surface focus:outline-none" placeholder="Task name" onFocus={()=>select(row.id)} onChange={e=>update({...row,name:e.target.value})}/><div className="ml-auto w-11 shrink-0"><GanttPopover menu label={`Task ${i+1} actions`} disabled={busy} trigger={<span aria-hidden="true" className="w-full text-center text-lg">⋯</span>}><button type="button" role="menuitem" className="min-h-11 w-full rounded-md px-3 text-left text-sm hover:bg-surface-subtle" onClick={e=>taskActions(e,row,'schedule')}>Edit schedule</button><button type="button" role="menuitem" className="min-h-11 w-full rounded-md px-3 text-left text-sm text-danger-text hover:bg-surface-subtle" onClick={e=>taskActions(e,row,'remove')}>Delete task</button></GanttPopover></div></>:<span className="break-words px-2 py-2 text-sm font-semibold">{row.name}</span>}</div>
      <div className="min-w-0 px-1 sm:flex sm:h-full sm:items-center sm:border-l sm:border-border">{consultantField(row,i)}</div>
      <div className="min-w-0 px-1 sm:flex sm:h-full sm:items-center sm:border-l sm:border-border">{editable?<input type="number" aria-label={`Estimated hours for task ${i+1}`} min="0.01" step="0.01" placeholder="Hours" value={row.hours??''} disabled={busy} className="min-h-11 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-right text-sm font-semibold tabular-nums hover:border-border focus:border-action focus:outline-none" onChange={e=>update({...row,hours:e.target.value===''?null:Number(e.target.value)})}/>:<span className="px-2 text-sm">{row.hours??'—'}{row.hours===null?'':'h'}</span>}</div>
     </div>
     <div data-schedule-track={row.id} className="relative min-h-24 shrink-0 sm:min-h-12" style={{width:timelineWidth,touchAction:editable?'pan-y':'auto',backgroundImage:`repeating-linear-gradient(to right, transparent 0, transparent ${dayWidth*7-1}px, var(--color-border) ${dayWidth*7-1}px, var(--color-border) ${dayWidth*7}px), repeating-linear-gradient(to right, transparent 0, transparent ${dayWidth-1}px, #edf0eb ${dayWidth-1}px, #f0f2ee ${dayWidth}px), repeating-linear-gradient(to right, transparent 0, transparent ${dayWidth*5}px, #f5f6f3 ${dayWidth*5}px, #f5f6f3 ${dayWidth*7}px)`}} onPointerDown={e=>begin(e,row)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel();}}>
      {row.blocks.map(block=><div key={block.id} data-block={block.id} className="group/bar absolute top-1/2 flex h-11 -translate-y-1/2 items-center text-white" style={{left:(block.start-1)*dayWidth+1,width:(block.end-block.start+1)*dayWidth-2,touchAction:editable?'none':'auto'}}>
       <span data-bar-fill aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-sm bg-action ${selected?.id===row.id&&active?.id===block.id?'outline-2 outline-offset-2 outline-action':''}`}/>
       {editable?<><button type="button" data-handle="start" aria-label={`Resize start: ${row.name||`Task ${i+1}`}`} disabled={disabled} className={`${selected?.id===row.id&&active?.id===block.id?'opacity-100':'opacity-0 group-hover/bar:opacity-100 focus:opacity-100'} absolute left-0 z-20 h-11 w-2 shrink-0 cursor-ew-resize rounded-l-sm focus-visible:outline-2 focus-visible:outline-offset-2`} onClick={()=>select(row.id,block.id)}><span aria-hidden="true">⋮</span></button><button type="button" aria-label={`${row.name||`Task ${i+1}`}: ${dayLabel(block.start)} through ${dayLabel(block.end)}`} disabled={disabled} aria-keyshortcuts="Delete Backspace" className="relative z-10 h-full min-w-0 flex-1 cursor-grab overflow-hidden px-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing" onClick={()=>select(row.id,block.id)}><span className="sr-only">Scheduled </span></button><button type="button" data-handle="end" aria-label={`Resize end: ${row.name||`Task ${i+1}`}`} disabled={disabled} className={`${selected?.id===row.id&&active?.id===block.id?'opacity-100':'opacity-0 group-hover/bar:opacity-100 focus:opacity-100'} absolute right-0 z-20 h-11 w-2 shrink-0 cursor-ew-resize rounded-r-sm focus-visible:outline-2 focus-visible:outline-offset-2`} onClick={()=>select(row.id,block.id)}><span aria-hidden="true">⋮</span></button></>:<span className="relative z-10 truncate px-2 text-xs leading-6"><span className="sr-only">{row.name}: </span>{dayLabel(block.start)} – {dayLabel(block.end)}</span>}
      </div>)}
     </div>
    </div>)}
    {editable?<div className="flex h-12"><button type="button" disabled={busy||rows.length>=30} onClick={addTask} className="sticky left-0 z-10 shrink-0 bg-surface px-4 text-left text-sm font-semibold text-action hover:bg-surface-subtle" style={{width:'var(--task-width)'}}>+ Add task</button></div>:null}
   </div>{!rows.length?<p className="p-4 text-sm text-ink-soft">No tasks added.</p>:null}
  </div>
  </div>
  <div ref={schedulePanel} popover="auto" role="dialog" aria-label="Schedule controls" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSchedule();}}} onToggle={e=>{if((e.nativeEvent as ToggleEvent).newState==='closed')setScheduleOpen(false);}} className="w-[min(368px,calc(100vw-16px))] max-h-[80dvh] overflow-auto rounded-lg border border-border bg-surface p-4 text-ink shadow-xl" style={{position:'fixed',inset:'auto',margin:0,...panelPosition}}>{editable&&selected?<><div className="mb-2 flex items-center justify-between gap-3"><h3 className="truncate text-sm font-semibold">{selected.name||'Task schedule'}</h3><button type="button" className="min-h-11 px-3 text-sm font-semibold text-action" onClick={closeSchedule}>Done</button></div><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold">Block<select aria-label="Scheduled block" className={`${field} mt-1 block max-w-full font-normal`} value={active?.id??''} disabled={busy||!active} onChange={e=>select(selected.id,e.target.value)}>{!selected.blocks.length?<option value="">No scheduled block</option>:null}{selected.blocks.map(b=><option key={b.id} value={b.id}>{dayLabel(b.start)} – {dayLabel(b.end)}</option>)}</select></label>{rangeControl('start')}{rangeControl('end')}<Button variant="secondary" disabled={busy||selected.blocks.some(b=>b.start===1&&b.end===70)} onClick={addBlock}>Add scheduled block</Button><Button variant="secondary" disabled={busy||!active} onClick={removeBlock}>Remove block</Button></div></>:null}</div>
  <p aria-live="polite" className="sr-only">{announcement}</p>
 </div>;
}
