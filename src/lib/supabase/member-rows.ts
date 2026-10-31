import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { readPages } from './pagination.ts';
import { compareCohorts } from '../program/state.ts';

/** Called only after server authorization, with the caller's RLS-scoped client. */
export async function readMemberRows(db: SupabaseClient<Database>, personId: string) {
  const enrollments = await readPages((from, to) => db.from('cohort_enrollments')
    .select('*').eq('person_id', personId).eq('participation_status', 'enrolled').order('id').range(from, to));
  // Fetch qualifying cohorts per enrollment to avoid an unbounded URL-sized IN list.
  const cohorts = (await Promise.all(enrollments.data.map(async enrollment => {
    const result = await db.from('program_cohorts').select('*').eq('id', enrollment.cohort_id).eq('state', 'active').maybeSingle();
    if (result.error) throw new Error('Program could not be loaded. Please try again.');
    return result.data;
  }))).filter(row => row !== null);
  const cohort = cohorts.sort(compareCohorts).at(-1);
  const enrollment = enrollments.data.find(row => row.cohort_id === cohort?.id);
  if (!cohort || !enrollment) return { cohort: undefined, enrollment: undefined, team: undefined, weeks: [], resources: [], assignments: [], submissions: [], catalog: [], documents: [], completionCredits: [], caseProgress: [] };
  const [teamResult, weeks, submissions, catalog, caseProgress] = await Promise.all([
    db.rpc('my_team', {p_enrollment:enrollment.id}),
    readPages((from, to) => db.from('program_weeks').select('*').eq('cohort_id', cohort.id).eq('published', true).order('id').range(from, to)),
    readPages((from, to) => db.from('submissions').select('*').eq('enrollment_id', enrollment.id).order('submitted_at', { ascending: false }).order('id').range(from, to)),
    db.rpc('week_catalog', { p_cohort_id: cohort.id }),
    readPages((from,to)=>db.rpc('case_progress',{p_enrollment:enrollment.id}).order('assignment_id').range(from,to)),
  ]);
  if (teamResult.error) throw new Error('Your team could not be loaded. Please retry.');
  const team = teamResult.data as {id:string;name:string;members:{enrollmentId:string;personId:string;name:string}[]} | null;
  if (catalog.error) throw new Error('Program modules could not be loaded.');
  const ids = weeks.data.map(row => row.id); // At most six published weeks.
  const [teamSubmissions, resources, assignments] = await Promise.all([
    team ? readPages((from,to)=>db.from('submissions').select('*').eq('team_id',team.id).order('submitted_at',{ascending:false}).order('id').range(from,to)) : {data:[]},
    ids.length ? readPages((from, to) => db.from('resources').select('*').in('week_id', ids).order('sort_order').order('created_at').order('id').range(from, to)) : {data:[]},
    ids.length ? readPages((from, to) => db.from('assignments').select('*').in('week_id', ids).order('sort_order').order('id').range(from, to)) : {data:[]},
  ]);
  const assignmentIds = assignments.data.map(a => a.id);
  const [documents, completionCredits] = await Promise.all([
    assignmentIds.length ? readPages((from, to) => db.from('assignment_documents').select('*').in('assignment_id', assignmentIds).eq('is_current', true).eq('state', 'ready').order('id').range(from, to)) : { data: [] },
    assignmentIds.length ? readPages((from,to)=>db.from('assignment_completions').select('id,assignment_id,granted_at').eq('enrollment_id',enrollment.id).in('assignment_id',assignmentIds).is('revoked_at',null).order('id').range(from,to)) : {data:[]},
  ]);
  return { caseProgress:caseProgress.data, cohort, enrollment, team:team??undefined, weeks: weeks.data, resources: resources.data, assignments: assignments.data, submissions: [...submissions.data,...teamSubmissions.data], catalog: catalog.data ?? [], documents: documents.data, completionCredits:completionCredits.data };
}
