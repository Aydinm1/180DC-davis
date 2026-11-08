'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentInstructionsEditor } from './assignment-instructions-editor';
import { EditorSections } from './editor-sections';
import { saveInvestigation } from '@/lib/investigations/actions';
import type { Investigation, InvestigationConfig } from '@/lib/investigations/types';
const input='mt-2 min-h-11 w-full rounded-lg border border-border p-3 font-normal';
export function InvestigationEditor({assignmentId,initial,template,onDirty,onSaved}:{assignmentId:string;initial:Investigation;template:InvestigationConfig;onDirty:(id:string,dirty:boolean)=>void;onSaved:()=>void}) {
 const router=useRouter();const [saved,setSaved]=useState(initial);const [content,setContent]=useState(initial.config??template);
 const [baseline,setBaseline]=useState(JSON.stringify(initial.config??template));const [section,setSection]=useState<'setup'|'hints'>('setup');
 const [stageIndex,setStageIndex]=useState(0);const [hintIndex,setHintIndex]=useState(0);const [pending,start]=useTransition();const [message,setMessage]=useState('');
 const request=useRef<{key:string;id:string}|null>(null);const dirty=baseline!==JSON.stringify(content);
 useEffect(()=>{onDirty('investigation-'+assignmentId,dirty);return()=>onDirty('investigation-'+assignmentId,false);},[onDirty,assignmentId,dirty]);
 const stage=content.stages[stageIndex],hint=stage?.hints[hintIndex];
 function patchHint(patch:Partial<InvestigationConfig['stages'][number]['hints'][number]>){setContent({...content,stages:content.stages.map((s,i)=>i===stageIndex?{...s,hints:s.hints.map((h,j)=>j===hintIndex?{...h,...patch}:h)}:s)});}
 function save(){const data={version:saved.configVersion,content:{...content,acceptedNames:[content.acceptedNames[0]??'',...content.acceptedNames.slice(1).map(n=>n.trim()).filter(Boolean)]}};const key=JSON.stringify(data);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  start(async()=>{try{const r=await saveInvestigation('configure',assignmentId,data,id);if(r.error)return setMessage(r.error);if(r.investigation){setSaved(r.investigation);setBaseline(JSON.stringify(content));onSaved();setMessage('Investigation saved.');router.refresh();}}catch{setMessage('Could not confirm the save. Your edits are retained; retry.');}});
 }
 return <section className="grid gap-5"><EditorSections label="Investigation sections" value={section} onChange={setSection} options={[{value:'setup',label:'Setup'},{value:'hints',label:'Stages and hints'}]}/>
 <div hidden={section!=='setup'}><div className="grid gap-5">
 <AssignmentInstructionsEditor label="Investigation overview" value={content.overview} format="markdown" showFormat={false} onChange={p=>setContent({...content,overview:p.instructions??content.overview})}/>
 <label className="text-sm font-bold">Student workbook URL<input className={input} type="url" maxLength={2000} value={content.workbookUrl} onChange={e=>setContent({...content,workbookUrl:e.target.value})}/></label>
 <label className="text-sm font-bold">Canonical suspect name — private<input className={input} maxLength={200} value={content.acceptedNames[0]??''} onChange={e=>setContent({...content,acceptedNames:[e.target.value,...content.acceptedNames.slice(1)]})}/></label>
 <label className="text-sm font-bold">Accepted variants — one per line<textarea className={input} rows={3} value={content.acceptedNames.slice(1).join('\n')} onChange={e=>setContent({...content,acceptedNames:[content.acceptedNames[0]??'',...e.target.value.split('\n')]})}/></label>
 <AssignmentInstructionsEditor label="Private grading guidance" value={content.gradingGuidance} format="markdown" showFormat={false} onChange={p=>setContent({...content,gradingGuidance:p.instructions??content.gradingGuidance})}/>
 </div></div>
 <div hidden={section!=='hints'}><div className="grid gap-5">
 <label className="text-sm font-bold">Stage<select className={input} value={stageIndex} onChange={e=>{setStageIndex(Number(e.target.value));setHintIndex(0);}}>{content.stages.map((s,i)=><option key={s.id} value={i}>{i+1}. {s.title}</option>)}</select></label>
 {stage?<><label className="text-sm font-bold">Stage title<input className={input} maxLength={200} value={stage.title} onChange={e=>setContent({...content,stages:content.stages.map((s,i)=>i===stageIndex?{...s,title:e.target.value}:s)})}/></label>
 <label className="text-sm font-bold">Hint<select className={input} value={hintIndex} onChange={e=>setHintIndex(Number(e.target.value))}>{stage.hints.map((h,i)=><option key={h.id} value={i}>{i+1}. {h.title}{h.optional?' · Optional':''}</option>)}</select></label>
 {hint?<><label className="text-sm font-bold">Hint title<input className={input} maxLength={200} value={hint.title} onChange={e=>patchHint({title:e.target.value})}/></label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={hint.optional} onChange={e=>patchHint({optional:e.target.checked})}/>Optional reveal — does not block later hints</label><AssignmentInstructionsEditor label="Hint content" value={hint.body} format="markdown" showFormat={false} onChange={p=>patchHint({body:p.instructions??hint.body})}/><Button variant="secondary" disabled={stage.hints.length===1||pending} onClick={()=>{setContent({...content,stages:content.stages.map((s,i)=>i===stageIndex?{...s,hints:s.hints.filter(h=>h.id!==hint.id)}:s)});setHintIndex(0);}}>Remove hint</Button></>:null}
 <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={stage.hints.length>=24||pending} onClick={()=>{setContent({...content,stages:content.stages.map((s,i)=>i===stageIndex?{...s,hints:[...s.hints,{id:crypto.randomUUID(),title:'New hint',body:'',optional:false}]}:s)});setHintIndex(stage.hints.length);}}>Add hint</Button><Button variant="secondary" disabled={content.stages.length===1||pending} onClick={()=>{setContent({...content,stages:content.stages.filter(s=>s.id!==stage.id)});setStageIndex(0);setHintIndex(0);}}>Remove stage</Button></div></>:null}
 <Button variant="secondary" disabled={content.stages.length>=12||pending} onClick={()=>{setContent({...content,stages:[...content.stages,{id:crypto.randomUUID(),title:'New stage',hints:[{id:crypto.randomUUID(),title:'New hint',body:'',optional:false}]}]});setStageIndex(content.stages.length);setHintIndex(0);}}>Add stage</Button>
 </div></div>
 <Button disabled={pending||(!dirty&&saved.workflow==='investigation')} onClick={save}>{pending?'Saving…':'Save investigation'}</Button>{message?<p role="status" className="text-sm font-semibold">{message}</p>:null}</section>;
}
