'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/grading/types';
import type { Json } from '@/lib/supabase/database.types';
import { investigationInputError, type InvestigationAction, type Investigation, type InvestigationInsights } from './types';
export async function saveInvestigation(action: InvestigationAction, assignmentId: string, data: unknown, requestId: string): Promise<{error?:string; investigation?:Investigation; incorrect?:boolean}> {
 await requireUser(action==='configure');
 const error=investigationInputError(action,data);
 if(error||!isUuid(assignmentId)||!isUuid(requestId))return {error:error??'Invalid investigation request.'};
 try {
  const db=await createClient();const r=await db.rpc('mutate_investigation',{p_action:action,p_assignment:assignmentId,p_data:data as Json,p_request:requestId});
  if(r.error)return {error:['22023','40001'].includes(r.error.code)?r.error.message:'Could not save. Check your access and retry. Your input is retained.'};
  if(action==='submit'||action==='configure'){revalidatePath('/','layout');revalidatePath('/admin','layout');}
  const loaded=await db.rpc('read_investigation',{p_assignment:assignmentId,p_preview:action==='configure'});
  if(loaded.error)return {error:'Save succeeded but refresh failed. Retry with the same input to recover your saved response.'};
  return {investigation:loaded.data as unknown as Investigation,incorrect:!!(r.data as {incorrect?:boolean})?.incorrect};
 } catch {return {error:'Save could not be confirmed. Retry with the same input; your work is retained.'};}
}
export async function loadInvestigationInsights(assignmentId:string,test:boolean): Promise<{error?:string;insights?:InvestigationInsights}> {
 await requireUser(true);if(!isUuid(assignmentId)||typeof test!=='boolean')return {error:'Invalid assignment.'};
 try {const db=await createClient();const r=await db.rpc('investigation_insights',{p_assignment:assignmentId,p_test:test});return r.error?{error:'Could not load hint insights. Retry.'}:{insights:r.data as unknown as InvestigationInsights};}catch{return {error:'Could not load hint insights. Retry.'};}
}
