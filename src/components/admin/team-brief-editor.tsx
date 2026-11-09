'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {AssignmentInstructionsEditor} from './assignment-instructions-editor';
import {saveTeamBrief} from '@/lib/teams/brief-actions';
import type {TeamBrief} from '@/lib/teams/briefs';
export function TeamBriefEditor({assignmentId,initial,onDirty}:{assignmentId:string;initial:TeamBrief[];onDirty:(id:string,dirty:boolean)=>void}) {
 const [briefs,setBriefs]=useState(initial);const [teamId,setTeamId]=useState(initial.find(t=>!t.isTest)?.teamId??initial[0]?.teamId??'');
 const selected=briefs.find(t=>t.teamId===teamId);const [body,setBody]=useState(selected?.instructions??'');
 const [pending,start]=useTransition();const [message,setMessage]=useState('');const request=useRef<{key:string;id:string}|null>(null);
 const dirty=body!==(selected?.instructions??'');
 useEffect(()=>{onDirty('team-brief-'+assignmentId,dirty);return()=>onDirty('team-brief-'+assignmentId,false);},[onDirty,assignmentId,dirty]);
 function save(){if(!selected)return;const key=JSON.stringify({teamId,body,version:selected.version});if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  start(async()=>{try{const r=await saveTeamBrief(assignmentId,teamId,body,selected.version,id);if(r.error)return setMessage(r.error);if(r.brief){setBriefs(list=>list.map(t=>t.teamId===teamId?r.brief!:t));setMessage('Team brief saved.');}}catch{setMessage('Could not confirm the save. Your edits are retained; retry.');}});
 }
 return <details className="rounded-card border border-border p-5"><summary className="min-h-11 cursor-pointer font-bold">Team briefs</summary>{!briefs.length?<p className="mt-4 text-sm text-ink-soft">Create teams in Members first.</p>:<div className="mt-5 grid gap-5"><label className="text-sm font-bold">Team<select aria-label="Team brief team" className="mt-2 min-h-11 w-full rounded-lg border border-border p-3" value={teamId} disabled={pending} onChange={e=>{if(dirty&&!window.confirm('Discard the unsaved team brief?'))return;const t=briefs.find(t=>t.teamId===e.target.value);setTeamId(e.target.value);setBody(t?.instructions??'');setMessage('');}}>{briefs.map(t=><option key={t.teamId} value={t.teamId}>{t.teamName}{t.isTest?' · Test':''} · {t.instructions.trim()?'Brief added':'No brief'}</option>)}</select></label><AssignmentInstructionsEditor label="Team-specific instructions" value={body} format="markdown" showFormat={false} onChange={p=>setBody(p.instructions??body)}/><div className="flex flex-wrap gap-3"><Button disabled={pending||!dirty} onClick={save}>{pending?'Saving…':'Save team brief'}</Button><Button variant="quiet" disabled={pending||!body} onClick={()=>{if(window.confirm('Clear this team’s brief? Save to apply the removal.'))setBody('');}}>Clear brief</Button></div>{message?<p role="status" className="text-sm font-semibold">{message}</p>:null}</div>}</details>;
}
