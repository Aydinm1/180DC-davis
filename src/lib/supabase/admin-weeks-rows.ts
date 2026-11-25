import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './database.types.ts';
import {readPages} from './pagination.ts';

/** Caller verifies live Admin access first; no editor or participant data. */
export async function readAdminWeeksRows(db:SupabaseClient<Database>,cohortId:string){
 const rows=await readPages((from,to)=>db.from('program_weeks')
  .select('id,cohort_id,week_number,title,published,assignments(count)')
  .eq('cohort_id',cohortId).order('week_number').order('id').range(from,to));
 return rows.data.map(w=>({id:w.id,weekNumber:w.week_number,title:w.title,
  publicationState:w.published?'published' as const:'draft' as const,
  assignmentCount:w.assignments[0]?.count??0}));
}
