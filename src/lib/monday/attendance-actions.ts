'use server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/supabase/auth';
import { mondayConfig } from './reader';
import { syncMondayAttendance } from './attendance-sync';
import type { AttendanceExportSnapshot, AttendanceSyncResult } from './attendance-types';

export async function syncAttendanceToMonday(cohortId: string, weekId: string): Promise<AttendanceSyncResult> {
  const actor = await requireUser(true);
  const empty = {checked:0,alreadyChecked:0,issues:[]};
  const uuid = (v: unknown) => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  if (!uuid(cohortId)||!uuid(weekId)) return {...empty,error:'Choose a valid cohort and week.'};
  try {
    const config = mondayConfig(process.env);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
    if (!url||!key) return {...empty,error:'Monday sync is not configured on the server.'};
    const db = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    return await syncMondayAttendance(config,async enrollmentId=>{
      const {data,error} = await db.rpc('monday_attendance_snapshot',{p_actor:actor.id,p_cohort:cohortId,p_week:weekId,p_account:config.account,p_board:config.board,p_enrollment:enrollmentId});
      if (error) throw new Error('Attendance access changed or sync is unavailable. Refresh and retry.');
      return data as unknown as AttendanceExportSnapshot;
    });
  } catch (error) {
    return {...empty,error:error instanceof Error && /^(Monday|Attendance)/.test(error.message) ? error.message : 'Attendance could not sync. Retry; existing checks are safe.'};
  }
}
