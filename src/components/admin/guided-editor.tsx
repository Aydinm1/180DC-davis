'use client';
import {ScheduleEditor} from './schedule-editor';
import type {ScheduleActivity} from '@/lib/schedules/types';
import { CaseEditor } from './case-editor';
import { InvestigationEditor } from './investigation-editor';
import type { Investigation, InvestigationConfig } from '@/lib/investigations/types';
import type { CaseContent, CaseExercise } from '@/lib/cases/types';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentInstructionsEditor } from './assignment-instructions-editor';
import { saveGuidedProjectSafely as saveGuidedProject } from '@/lib/guided/client';
import type { GuidedProject, GuidedAction } from '@/lib/guided/types';
import { guidedOverview, directionIntro, finalBrief } from '@/lib/guided/content';
import { EditorSections } from './editor-sections';

export function GuidedEditor({assignmentId,initial,teamMode,onDirty,cases,caseTemplate,investigation,investigationTemplate,schedule}:{assignmentId:string;initial:GuidedProject;teamMode:boolean;onDirty:(id:string,dirty:boolean)=>void;cases?:CaseExercise;caseTemplate?:CaseContent;investigation?:Investigation;investigationTemplate?:InvestigationConfig;schedule?:ScheduleActivity}) {
 const router=useRouter();
 const [project,setProject]=useState(initial);
 const [workflow,setWorkflow]=useState(initial.workflow);
 const [section,setSection]=useState<'overview'|'intro'|'brief'|'teams'>('overview');
 const [overview,setOverview]=useState(initial.config?.overview??guidedOverview);
 const [intro,setIntro]=useState(initial.config?.direction_intro??directionIntro);
 const [brief,setBrief]=useState(initial.config?.final_brief??finalBrief);
 const [teamId,setTeamId]=useState(initial.teams?.find(t=>!t.isTest)?.id??initial.teams?.[0]?.id??'');
 const team=project.teams?.find(t=>t.id===teamId);
 const [company,setCompany]=useState(team?.recommendation?.company??'');
 const [title,setTitle]=useState(team?.recommendation?.title??'');
 const [guidance,setGuidance]=useState(team?.recommendation?.guidance??'');
 const [message,setMessage]=useState('');
 const [pending,startTransition]=useTransition();
 const request=useRef<{key:string;id:string}|undefined>(undefined);
 const configDirty=workflow!==project.workflow || overview!==(project.config?.overview??guidedOverview)||intro!==(project.config?.direction_intro??directionIntro)||brief!==(project.config?.final_brief??finalBrief);
 const teamDirty=company!==(team?.recommendation?.company??'')||title!==(team?.recommendation?.title??'')||guidance!==(team?.recommendation?.guidance??'');
 useEffect(()=>{onDirty('guided-'+assignmentId,configDirty||teamDirty);return()=>onDirty('guided-'+assignmentId,false);},[onDirty,assignmentId,configDirty,teamDirty]);
 function save(action:GuidedAction,data:Record<string,unknown>){
  const key=JSON.stringify({action,data});if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  startTransition(async()=>{const r=await saveGuidedProject(action,assignmentId,data,id);if(r.error)return setMessage(r.error);if(r.project)setProject(r.project);setMessage('Project settings saved.');router.refresh();});
 }
 return <section id={'guided-'+assignmentId} aria-label="Activity setup"><div className="grid grid-cols-1 gap-5"><label className="text-sm font-bold">Workflow<select className="mt-2 min-h-11 w-full rounded-lg border border-border p-3" value={workflow} disabled={pending} onChange={e=>setWorkflow(e.target.value as GuidedProject['workflow'])}><option value="standard">Standard</option><option value="guided" disabled={!teamMode}>Guided project · requires saved Team mode</option><option value="cases" disabled={teamMode}>Eight-case challenge · Individual</option><option value="investigation" disabled={teamMode}>Spreadsheet investigation · Individual</option><option value="schedule" disabled={teamMode}>Schedule planning · Individual</option></select></label>
 <div hidden={workflow!=='schedule'}>{schedule?<ScheduleEditor assignmentId={assignmentId} initial={schedule} onDirty={onDirty} onSaved={()=>setProject({...project,workflow:'schedule'})}/>:null}</div>
 <div hidden={workflow!=='investigation'}>{investigation&&investigationTemplate?<InvestigationEditor assignmentId={assignmentId} initial={investigation} template={investigationTemplate} onDirty={onDirty} onSaved={()=>setProject({...project,workflow:'investigation'})}/>:null}</div>
 <div hidden={workflow!=='cases'}>{cases&&caseTemplate?<CaseEditor assignmentId={assignmentId} initial={cases} template={caseTemplate} onDirty={onDirty} onSaved={()=>setProject({...project,workflow:'cases'})}/>:null}</div>
 <div hidden={workflow==='cases'||workflow==='investigation'||workflow==='schedule'}><div className="grid grid-cols-1 gap-5">
 <p className="text-xs leading-6 text-ink-soft">Save Team mode first. Configure every populated official team before publishing. Workflow saves independently; directions lock when research starts.</p>
 {workflow==='guided'||project.config?<>
 <EditorSections label="Guided project sections" value={section} onChange={setSection} options={[{value:'overview',label:'Overview'},{value:'intro',label:'Direction introduction'},{value:'brief',label:'Final brief'},{value:'teams',label:'Team directions'}]}/>
 <div hidden={section!=='overview'}><AssignmentInstructionsEditor label="Project overview" value={overview} format="markdown" showFormat={false} onChange={p=>setOverview(p.instructions??overview)}/></div>
 <div hidden={section!=='intro'}><AssignmentInstructionsEditor label="Direction introduction" value={intro} format="markdown" showFormat={false} onChange={p=>setIntro(p.instructions??intro)}/></div>
 <div hidden={section!=='brief'}><AssignmentInstructionsEditor label="Final document brief" value={brief} format="markdown" showFormat={false} onChange={p=>setBrief(p.instructions??brief)}/></div>
 </>:null}
 <div hidden={section==='teams'&&workflow==='guided'}><Button disabled={pending||!configDirty} onClick={()=>save('config',{version:project.config?.version??0,workflow,overview,directionIntro:intro,finalBrief:brief})}>{pending?'Saving…':'Save workflow'}</Button></div>
 <div hidden={section!=='teams'||workflow!=='guided'}>{project.workflow==='guided'?<section><h4 className="sr-only">Team directions</h4><label className="text-sm font-bold">Configure team<select className="mt-2 min-h-11 w-full rounded-lg border border-border p-3" disabled={pending} value={teamId} onChange={e=>{if(teamDirty&&!window.confirm('Discard unsaved team direction?'))return;const t=project.teams?.find(t=>t.id===e.target.value);setTeamId(e.target.value);setCompany(t?.recommendation?.company??'');setTitle(t?.recommendation?.title??'');setGuidance(t?.recommendation?.guidance??'');setMessage('');}}>{project.teams?.map(t=><option key={t.id} value={t.id}>{t.name}{t.isTest?' · Test':''} · {t.members} members · {t.recommendation?'Ready':'Needs direction'}</option>)}</select></label>{team?<TeamDirectionFields company={company} title={title} guidance={guidance} locked={!!team.state&&!!team.recommendation} pending={pending} dirty={teamDirty} setCompany={setCompany} setTitle={setTitle} setGuidance={setGuidance} onSave={()=>save('recommendation',{teamId,version:team.recommendation?.version??0,company,title,guidance})}/>:<p className="mt-4 text-sm">Create teams in Members before configuring directions.</p>}</section>:<p className="text-sm text-ink-soft">Save the guided workflow before configuring team directions.</p>}</div>
 </div></div>
 {message?<p role="status" className="text-sm font-semibold">{message}</p>:null}</div></section>;
}

function TeamDirectionFields({company,title,guidance,locked,pending,dirty,setCompany,setTitle,setGuidance,onSave}:{company:string;title:string;guidance:string;locked:boolean;pending:boolean;dirty:boolean;setCompany:(v:string)=>void;setTitle:(v:string)=>void;setGuidance:(v:string)=>void;onSave:()=>void}) {
 return <div className="mt-5 grid grid-cols-1 gap-5"><label className="text-sm font-bold">Company<input className="mt-2 min-h-11 w-full rounded-lg border border-border p-3 font-normal" maxLength={300} disabled={locked||pending} value={company} onChange={e=>setCompany(e.target.value)}/></label><label className="text-sm font-bold">Recommended direction title<input className="mt-2 min-h-11 w-full rounded-lg border border-border p-3 font-normal" maxLength={300} disabled={locked||pending} value={title} onChange={e=>setTitle(e.target.value)}/></label>{locked?<p className="text-sm text-ink-soft">This direction is locked because the team has started research.</p>:<AssignmentInstructionsEditor label="Boundaries and suggested sources" value={guidance} format="markdown" showFormat={false} onChange={p=>setGuidance(p.instructions??guidance)}/>}<Button disabled={pending||locked||!dirty} onClick={onSave}>Save team direction</Button></div>;
}
