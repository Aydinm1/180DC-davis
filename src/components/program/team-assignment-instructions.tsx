'use client';
import {useState,type ReactNode} from 'react';
import type {TeamBrief} from '@/lib/teams/briefs';
import type {BriefFormat} from '@/lib/program/brief';
import {ActivityViewNav,BriefReader,type ActivityView} from './activity-views';
import {AssignmentBrief} from './assignment-brief';
import {Button} from '@/components/ui/button';
export function TeamAssignmentInstructions({instructions,format,briefs,preview=false,submitted=false,children}:{instructions:string;format?:BriefFormat;briefs:TeamBrief[];preview?:boolean;submitted?:boolean;children:ReactNode}) {
 const [view,setView]=useState<ActivityView>(submitted?'workspace':'instructions');const [teamId,setTeamId]=useState(briefs.find(t=>!t.isTest)?.teamId??briefs[0]?.teamId??'');
 const brief=briefs.find(t=>t.teamId===teamId);
 return <div className="mt-8"><ActivityViewNav value={view} onChange={setView}/><div hidden={view!=='instructions'}>{instructions.trim()?<section aria-label="Shared assignment instructions" className="mb-8 max-w-3xl"><AssignmentBrief instructions={instructions} format={format}/></section>:null}{preview?<label className="mb-6 block max-w-3xl text-sm font-bold">Sample team<select aria-label="Sample team" className="mt-2 min-h-11 w-full rounded-lg border border-border p-3 font-normal" value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Generic preview</option>{briefs.map(t=><option key={t.teamId} value={t.teamId}>{t.teamName}{t.isTest?' · Test':''}</option>)}</select></label>:null}
 {brief?.instructions.trim()?<section aria-label="Team-specific instructions" className="border-t border-border pt-8"><BriefReader key={brief.teamId} instructions={brief.instructions}/></section>:preview&&teamId?<p className="text-sm text-ink-soft">No brief for this team.</p>:null}<Button className="mt-8" onClick={()=>setView('workspace')}>Open workspace →</Button></div><div hidden={view!=='workspace'} className="max-w-3xl">{children}</div></div>;
}
