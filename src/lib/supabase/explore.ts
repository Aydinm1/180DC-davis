import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from './auth';
import { createClient } from './server';
import { readPages } from './pagination';
import { selectExploreCohort } from '@/lib/program/explore';
import type { ProgramCohort, ProgramWeek, Resource } from '@/lib/program/types';

export const requireExplorer = cache(async () => {
  const user = await requireUser();
  if (user.role !== 'viewer' && user.role !== 'admin') redirect('/access-denied');
  return user;
});

/** This loader never reads a roster, enrollment, submission, attendance or import table. */
export const readExplore = cache(async (requestedId?: string) => {
  const user = await requireExplorer();
  const db = await createClient();
  const rows = await readPages((from,to) => db.from('program_cohorts').select('*').in('state',['active','archived']).order('id').range(from,to));
  const cohorts: ProgramCohort[] = rows.data.map(r => ({ id:r.id,quarter:r.quarter,year:r.year,startsOn:r.starts_on,endsOn:r.ends_on,state:r.state }));
  const cohort = selectExploreCohort(cohorts,requestedId);
  if (requestedId && !cohort) notFound();
  if (!cohort) return { user,cohorts,cohort:undefined,weeks:[] as ProgramWeek[] };
  const [published,catalog] = await Promise.all([
    readPages((from,to) => db.from('program_weeks').select('*').eq('cohort_id',cohort.id).eq('published',true).order('id').range(from,to)),
    db.rpc('week_catalog',{p_cohort_id:cohort.id}),
  ]);
  if (catalog.error) throw new Error('Could not load program content. Please retry.');
  const ids = published.data.map(w => w.id);
  const [resources,assignments] = ids.length ? await Promise.all([
    readPages((from,to) => db.from('resources').select('*').in('week_id',ids).order('sort_order').order('created_at').order('id').range(from,to)),
    readPages((from,to) => db.from('assignments').select('*').in('week_id',ids).order('sort_order').order('id').range(from,to)),
  ]) : [{data:[]},{data:[]}];
  // Fetch documents per week to keep IN filters bounded even for large assignment histories.
  const documents = (await Promise.all(ids.map(async id => {
    const aids = assignments.data.filter(a => a.week_id===id).map(a=>a.id);
    return aids.length ? (await readPages((from,to) => db.from('assignment_documents').select('id,assignment_id,original_filename').in('assignment_id',aids).eq('state','ready').eq('is_current',true).order('id').range(from,to))).data : [];
  }))).flat();
  const weeks: ProgramWeek[] = (catalog.data ?? []).map(r => {
    const w = published.data.find(w=>w.id===r.id);
    if (!w) return {id:r.id,cohortId:r.cohort_id,weekNumber:r.week_number,title:r.title,publicationState:'draft'};
    return {id:w.id,cohortId:w.cohort_id,weekNumber:w.week_number,title:w.title,description:w.description,publicationState:'published',slidesUrl:w.slides_url ?? undefined,
      resources:resources.data.filter(a=>a.week_id===w.id).map(a=>({id:a.id,title:a.title,description:a.description ?? undefined,type:a.resource_type as Resource['type'],url:a.url,sortOrder:a.sort_order})),
      assignments:assignments.data.filter(a=>a.week_id===w.id).map(a=>{ const d=documents.find(d=>d.assignment_id===a.id);return {id:a.id,workflow:a.workflow as 'standard'|'guided'|'cases'|'investigation',submissionMode:a.submission_mode as 'individual'|'team',weekNumber:w.week_number,title:a.title,instructions:a.instructions,summary:a.summary ?? undefined,instructionsFormat:a.instructions_format as 'plain'|'markdown',dueAt:a.due_at,document:d?{id:d.id,name:d.original_filename}:undefined};})};
  });
  return {user,cohorts,cohort,weeks};
});
