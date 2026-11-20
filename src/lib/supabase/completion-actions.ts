'use server';

import {completionBatchError,type CompletionTarget,type CompletionResult} from '@/lib/program/bulk-completion';
import { revalidatePath } from 'next/cache';
import { requireUser } from './auth';
import { createClient } from './server';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function setAssignmentCompletion(action: string, assignmentId: string, enrollmentId: string, creditId?: string) {
  await requireUser(true);
  if (!['grant','revoke'].includes(action) || !uuid(assignmentId) || !uuid(enrollmentId) || (action === 'revoke' && !uuid(creditId))) return {error:'Invalid completion request.'};
  const db = await createClient();
  const {data,error} = await db.rpc('set_assignment_completion', {p_action:action,p_assignment:assignmentId,p_enrollment:enrollmentId,p_credit:creditId});
  if (error) return {error:error.code === '22023' || error.code === '40001' ? error.message : 'Could not update completion. Check your access and retry.'};
  revalidatePath('/admin','layout');
  revalidatePath('/','layout');
  return {id:data};
}

export async function grantAssignmentCompletions(input:unknown):Promise<{error?:string;results:CompletionResult[]}>{
 await requireUser(true);
 const invalid=completionBatchError(input);if(invalid)return {error:invalid,results:[]};
 const db=await createClient(),results:CompletionResult[]=[];
 for(const {assignmentId,enrollmentId} of input as CompletionTarget[]){
  try{const {error}=await db.rpc('set_assignment_completion',{p_action:'grant',p_assignment:assignmentId,p_enrollment:enrollmentId});results.push({assignmentId,enrollmentId,...(error?{error:error.code==='22023'||error.code==='40001'?error.message:'Could not update completion. Check your access and retry.'}:{})});}
  catch{results.push({assignmentId,enrollmentId,error:'Could not confirm this credit. Retry safely after checking your connection.'});}
 }
 if(results.some(result=>!result.error)){revalidatePath('/admin','layout');revalidatePath('/','layout');}
 return {results};
}
