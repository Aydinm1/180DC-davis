'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {AssignmentInstructionsEditor} from './assignment-instructions-editor';
import {EditorSections} from './editor-sections';
import {ScheduleGrid} from '@/components/program/schedule-grid';
import {upgradeRows} from '@/lib/schedules/gantt';
import type {ScheduleRow} from '@/lib/schedules/types';
import {saveSchedule} from '@/lib/schedules/actions';
import {scheduleInputError,type ScheduleActivity,type ScheduleConfig} from '@/lib/schedules/types';
const blank:ScheduleConfig={formatVersion:2,overview:'',scenario:'',disruption:'',starter:[]};
export function ScheduleEditor({assignmentId,initial,onDirty,onSaved}:{assignmentId:string;initial:ScheduleActivity;onDirty:(id:string,dirty:boolean)=>void;onSaved:()=>void}){
 const [saved,setSaved]=useState(initial),[content,setContent]=useState<ScheduleConfig>(initial.config??blank),[tab,setTab]=useState<'overview'|'scenario'|'disruption'|'starter'>('overview');
 const [message,setMessage]=useState(''),[pending,start]=useTransition();const request=useRef<{key:string;id:string}|null>(null),router=useRouter();
 const [baseline,setBaseline]=useState(JSON.stringify(initial.config??blank));
 const dirty=JSON.stringify(content)!==baseline;
 useEffect(()=>{onDirty('schedule-'+assignmentId,dirty);return()=>onDirty('schedule-'+assignmentId,false);},[assignmentId,dirty,onDirty]);
 function save(){const data={version:saved.configVersion,content},error=scheduleInputError('configure',data);if(error)return setMessage(error);const key=JSON.stringify(data);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;start(async()=>{try{const r=await saveSchedule('configure',assignmentId,data,id);if(r.error)return setMessage(r.error);if(r.activity){setSaved(r.activity);setBaseline(JSON.stringify(content));onSaved();setMessage('Schedule activity saved.');router.refresh();}}catch{setMessage('Could not confirm the save. Your edits are retained; retry.');}});}
 return <section aria-label="Schedule activity settings" className="mt-5 space-y-5"><EditorSections label="Schedule setup sections" value={tab} onChange={setTab} options={[{value:'overview',label:'Instructions'},{value:'scenario',label:'Original scenario'},{value:'disruption',label:'Private disruption'},{value:'starter',label:'Starting schedule'}]}/>
 {(['overview','scenario','disruption'] as const).map(k=><fieldset disabled={pending||!!saved.locked||saved.published} hidden={tab!==k} key={k}><AssignmentInstructionsEditor label={k==='overview'?'Schedule instructions':k==='scenario'?'Original scenario':'Private disruption instructions'} value={content[k]} format="markdown" showFormat={false} onChange={p=>setContent({...content,[k]:p.instructions??content[k]})}/></fieldset>)}
 <div hidden={tab!=='starter'}>{(content.formatVersion??1)===1&&!saved.locked&&!saved.published?<Button variant="secondary" className="mb-4" disabled={pending} onClick={()=>{if(window.confirm('Upgrade this unsaved setup to day-level planning? Review the full-week blocks and fill consultant/hour fields before publishing.'))setContent({...content,formatVersion:2,starter:upgradeRows(content.starter as ScheduleRow[],()=>crypto.randomUUID())});}}>Upgrade to day-level planning</Button>:null}<ScheduleGrid formatVersion={content.formatVersion??1} rows={content.starter} onChange={starter=>setContent({...content,starter})} disabled={pending||!!saved.locked||saved.published} label="Starting schedule"/></div>
 {saved.published&&!saved.locked?<p className="text-sm text-ink-soft">Return the week to draft to edit activity settings.</p>:null}{saved.locked?<p className="text-sm text-ink-soft">Settings are locked because participant work exists.</p>:null}<Button disabled={pending||!!saved.locked||saved.published||(!dirty&&saved.workflow==='schedule')} onClick={save}>{pending?'Saving…':'Save schedule activity'}</Button>{message?<p role="status" className="text-sm font-semibold">{message}</p>:null}</section>;
}
