import 'server-only';
import {requireUser} from '@/lib/supabase/auth';
import {createClient} from '@/lib/supabase/server';
import type {TeamBrief} from './briefs';
export async function readTeamBriefs(assignmentId:string):Promise<TeamBrief[]> {
 await requireUser();const db=await createClient();const r=await db.rpc('read_assignment_team_briefs',{p_assignment:assignmentId});
 if(r.error)throw new Error('Could not load team instructions. Reload and retry.');
 return r.data as unknown as TeamBrief[];
}
