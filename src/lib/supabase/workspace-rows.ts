import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { readPages } from './pagination.ts';

/** Call only after authorization with the request's user-scoped client. */
export async function readWorkspaceRows(db: SupabaseClient<Database>, admin: boolean) {
  // All sets are independent. Pagination remains ordered and complete within each set.
  const [people, roster, cohorts, enrollments, weeks, resources, assignments, submissions, documents,
    activity, teamRows, memberships, completionCredits, caseProgress] = await Promise.all([
    readPages((from, to) => db.from('people').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('approved_members').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('program_cohorts').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('cohort_enrollments').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('program_weeks').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('resources').select('*').order('sort_order').order('created_at').order('id').range(from, to)),
    readPages((from, to) => db.from('assignments').select('*').order('sort_order').order('id').range(from, to)),
    readPages((from, to) => db.from('submissions').select('*').order('submitted_at', { ascending: false }).order('id').range(from, to)),
    readPages((from, to) => db.from('assignment_documents').select('*').eq('is_current', true).eq('state', 'ready').order('id').range(from, to)),
    admin ? readPages((from, to) => db.rpc('admin_activity').order('person_id').range(from, to)) : { data: [] },
    readPages((from, to) => db.from('cohort_teams').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('team_memberships').select('*').order('enrollment_id').range(from, to)),
    readPages((from, to) => db.from('assignment_completions').select('*').is('revoked_at', null).order('id').range(from, to)),
    readPages((from, to) => db.rpc('case_progress').order('assignment_id').order('enrollment_id').range(from, to)),
  ]);
  return { people, roster, cohorts, enrollments, weeks, resources, assignments, submissions, documents,
    activity, teamRows, memberships, completionCredits, caseProgress };
}
