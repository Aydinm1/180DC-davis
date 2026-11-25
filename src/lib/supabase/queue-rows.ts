import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './database.types.ts';
import {readPages} from './pagination.ts';

/** Queue metadata only. Caller must first verify live Admin access. */
export async function readQueueRows(db:SupabaseClient<Database>,cohortId:string){
 const [weeks,assignments,enrollments,submissions,teams,groups,credits]=await Promise.all([
  readPages((from,to)=>db.from('program_weeks').select('id,cohort_id,week_number,title,published').eq('cohort_id',cohortId).eq('published',true).order('id').range(from,to)),
  readPages((from,to)=>db.from('assignments').select('id,week_id,title,due_at,submission_mode,workflow,program_weeks!inner(cohort_id,published)').eq('program_weeks.cohort_id',cohortId).eq('program_weeks.published',true).order('sort_order').order('id').range(from,to)),
  readPages((from,to)=>db.from('cohort_enrollments').select('id,cohort_id,person_id,participation_status,is_test,people(id,email,full_name,approved_members(id,person_id,email,full_name,role,active))').eq('cohort_id',cohortId).eq('participation_status','enrolled').order('id').range(from,to)),
  readPages((from,to)=>db.from('submissions').select('id,assignment_id,enrollment_id,team_id,swap_group_id,status,submitted_at,updated_at,is_current,assignments!inner(program_weeks!inner(cohort_id,published))').eq('is_current',true).eq('assignments.program_weeks.cohort_id',cohortId).eq('assignments.program_weeks.published',true).order('submitted_at',{ascending:false}).order('id').range(from,to)),
  readPages((from,to)=>db.from('cohort_teams').select('id,cohort_id,name,is_test,version,locked,team_memberships(enrollment_id)').eq('cohort_id',cohortId).order('id').range(from,to)),
  readPages((from,to)=>db.from('slide_swap_groups').select('id,assignment_id,name,is_test,slide_swap_members(enrollment_id),assignments!inner(program_weeks!inner(cohort_id,published))').eq('assignments.program_weeks.cohort_id',cohortId).eq('assignments.program_weeks.published',true).order('id').range(from,to)),
  readPages((from,to)=>db.from('assignment_completions').select('id,assignment_id,enrollment_id,granted_at,granted_by,assignments!inner(program_weeks!inner(cohort_id,published))').is('revoked_at',null).eq('assignments.program_weeks.cohort_id',cohortId).eq('assignments.program_weeks.published',true).order('id').range(from,to)),
 ]);
 // No case-progress RPC for cohorts without a published case activity. Chunk IDs to
 // bound query URLs; pagination is still complete within each chunk.
 const ids=assignments.data.filter(a=>a.workflow==='cases').map(a=>a.id),chunks:string[][]=[];
 for(let i=0;i<ids.length;i+=100)chunks.push(ids.slice(i,i+100));
 const swapProgress=assignments.data.some(a=>a.workflow==='slide_swap')
  ? readPages((from,to)=>db.rpc('slide_swap_queue_progress',{p_cohort:cohortId}).order('assignment_id').order('group_id').order('enrollment_id').range(from,to))
  : Promise.resolve({data:[]});
 const [readiness,progress]=await Promise.all([swapProgress,Promise.all(chunks.map(ids=>readPages((from,to)=>db.rpc('case_progress').in('assignment_id',ids).order('assignment_id').order('enrollment_id').range(from,to))))]);
 return {weeks:weeks.data,assignments:assignments.data,enrollments:enrollments.data,submissions:submissions.data,teams:teams.data,groups:groups.data,credits:credits.data,swapProgress:readiness.data,progress:progress.flatMap(p=>p.data)};
}
