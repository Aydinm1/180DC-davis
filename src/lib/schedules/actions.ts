'use server';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/supabase/auth';
import {createClient} from '@/lib/supabase/server';
import {isUuid} from '@/lib/grading/types';
import type {Json} from '@/lib/supabase/database.types';
import {scheduleInputError,type ScheduleAction,type ScheduleActivity} from './types';
export async function saveSchedule(action:ScheduleAction,assignmentId:string,data:unknown,requestId:string):Promise<{error?:string;activity?:ScheduleActivity}>{
 await requireUser(action==='configure');
 const error=scheduleInputError(action,data);if(error||!isUuid(assignmentId)||!isUuid(requestId))return {error:error??'Invalid schedule request.'};
 try{
  const db=await createClient(),r=await db.rpc('mutate_schedule',{p_action:action,p_assignment:assignmentId,p_data:data as Json,p_request:requestId});
  if(r.error)return {error:['22023','40001'].includes(r.error.code)?r.error.message:'Could not save. Check your access and retry. Your input is retained.'};
  if(action==='submit'||action==='configure'){revalidatePath('/','layout');revalidatePath('/admin','layout');}
  const loaded=await db.rpc('read_schedule',{p_assignment:assignmentId,p_preview:action==='configure'});
  if(loaded.error)return {error:'Save succeeded but refresh failed. Retry the same input to recover your saved work.'};
  return {activity:loaded.data as unknown as ScheduleActivity};
 }catch{return {error:'Save could not be confirmed. Retry the same input; your work is retained.'};}
}
