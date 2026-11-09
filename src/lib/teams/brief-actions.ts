'use server';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/supabase/auth';
import {createClient} from '@/lib/supabase/server';
import {isUuid} from '@/lib/grading/types';
import {teamBriefError,type TeamBrief} from './briefs';
export async function saveTeamBrief(assignmentId:string,teamId:string,instructions:string,version:number,requestId:string):Promise<{error?:string;brief?:TeamBrief}> {
 await requireUser(true);const invalid=teamBriefError(instructions,version);
 if(invalid||![assignmentId,teamId,requestId].every(isUuid))return {error:invalid??'Invalid team brief request.'};
 try {const db=await createClient();const r=await db.rpc('save_assignment_team_brief',{p_assignment:assignmentId,p_team:teamId,p_instructions:instructions,p_version:version,p_request:requestId});
  if(r.error)return {error:['22023','40001'].includes(r.error.code)?r.error.message:'Could not save the team brief. Check your access and retry; your edits are retained.'};
  revalidatePath('/','layout');revalidatePath('/admin','layout');return {brief:r.data as unknown as TeamBrief};
 }catch{return {error:'Save could not be confirmed. Retry without changing your input; your edits are retained.'};}
}
