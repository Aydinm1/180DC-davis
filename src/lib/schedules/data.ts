import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {requireUser} from '@/lib/supabase/auth';
import type {ScheduleActivity,ScheduleSnapshot} from './types';
export async function readSchedule(assignmentId:string,preview=false):Promise<ScheduleActivity>{
 await requireUser();const db=await createClient(),r=await db.rpc('read_schedule',{p_assignment:assignmentId,p_preview:preview});
 if(r.error)throw new Error('Could not load the schedule. Reload and retry.');return r.data as unknown as ScheduleActivity;
}
export async function readScheduleReview(submissionId:string):Promise<ScheduleSnapshot|undefined>{
 await requireUser(true);const db=await createClient(),r=await db.rpc('schedule_review',{p_submission:submissionId});
 if(r.error)throw new Error('Could not load the submitted schedule. Reload and retry.');return r.data as unknown as ScheduleSnapshot|undefined;
}
