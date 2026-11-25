import type {AdminSubmissionRow,AdminQueueState} from './admin.ts';
import {assignmentsForWeek} from './types.ts';

export type CompletionTarget={assignmentId:string;enrollmentId:string};
export type CompletionResult=CompletionTarget&{error?:string};
export const completionKey=(target:CompletionTarget)=>`${target.assignmentId.toLowerCase()}:${target.enrollmentId.toLowerCase()}`;
export function completionBatchError(value:unknown):string|undefined{
 if(!Array.isArray(value)||!value.length||value.length>100)return 'Choose between 1 and 100 assignment credits per request.';
 const seen=new Set<string>(),uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 for(const target of value){if(!target||typeof target!=='object'||typeof target.assignmentId!=='string'||typeof target.enrollmentId!=='string'||!uuid.test(target.assignmentId)||!uuid.test(target.enrollmentId))return 'Invalid completion selection.';const key=completionKey(target);if(seen.has(key))return 'Each assignment credit may be selected only once.';seen.add(key);}
}
export function canManuallyComplete(row:AdminSubmissionRow,state:AdminQueueState){
 return !row.team&&!row.swapGroup&&!row.submission&&!row.completionCredit&&row.assignment.submissionMode!=='team'
  &&!['cases','investigation','schedule','slide_swap'].includes(row.assignment.workflow??'standard')
  &&row.enrollment.participationStatus==='enrolled'
  &&state.cohorts.some(c=>c.id===row.enrollment.cohortId&&c.state==='active')
  &&state.weeks.some(w=>w.cohortId===row.enrollment.cohortId&&w.publicationState==='published'&&assignmentsForWeek(w).some(a=>a.id===row.assignment.id))
  &&state.approvedMembers.some(m=>m.personId===row.enrollment.personId&&m.active&&m.role!=='viewer');
}
