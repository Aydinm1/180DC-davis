import { getCurrentAdminWeek, getSubmissionRows, type AdminWorkspaceState } from './admin.ts';
import { assignmentsForWeek } from './types.ts';

export function selectQueueWeek(state: AdminWorkspaceState, cohortId: string, weekId?: string | null, assignmentId?: string | null) {
 const weeks=state.weeks.filter(w=>w.cohortId===cohortId && w.publicationState==='published').toSorted((a,b)=>a.weekNumber-b.weekNumber);
 return weeks.find(w=>w.id===weekId) ?? weeks.find(w=>assignmentsForWeek(w).some(a=>a.id===assignmentId)) ?? getCurrentAdminWeek(weeks) ?? weeks.at(-1);
}
export function buildWeekQueue(state: AdminWorkspaceState, cohortId: string, weekId: string, now: Date, audience: 'official'|'test'='official') {
 const week=state.weeks.find(w=>w.id===weekId && w.cohortId===cohortId && w.publicationState==='published');
 const participants=state.enrollments.filter(e=>e.cohortId===cohortId && e.participationStatus==='enrolled' && !!e.isTest===(audience==='test'));
 const assignments=week ? assignmentsForWeek(week).map(assignment=>{
  const rows=getSubmissionRows({state,cohortId,weekId,assignmentId:assignment.id,now,audience});
  return {assignment,rows,unassigned:assignment.submissionMode==='team'?participants.filter(e=>!(state.teams??[]).some(t=>t.enrollmentIds.includes(e.id))).length:0,received:rows.filter(r=>r.submission).length,approved:rows.filter(r=>r.state==='completed').length,awaiting:rows.filter(r=>r.state==='submitted').length};
 }) : [];
 const rows=assignments.filter(a=>a.assignment.workflow!=='cases').flatMap(a=>a.rows).toSorted((a,b)=>{
  const priority={submitted:0,revision_requested:1,overdue:2,due_soon:3,upcoming:4,completed:5};
  return priority[a.state]-priority[b.state] || (a.person?.fullName??'').localeCompare(b.person?.fullName??'') || assignments.findIndex(x=>x.assignment.id===a.assignment.id)-assignments.findIndex(x=>x.assignment.id===b.assignment.id);
 });
 const complete=assignments.length ? participants.filter(e=>assignments.every(a=>a.rows.some(r=>r.memberEnrollmentIds.includes(e.id) && r.state==='completed')||state.completionCredits?.some(c=>c.assignmentId===a.assignment.id&&c.enrollmentId===e.id))).length : 0;
 return {assignments,rows,received:rows.filter(r=>r.submission).length,awaiting:rows.filter(r=>r.state==='submitted').length,participants:participants.length,complete,rate:assignments.length && participants.length ? complete/participants.length : undefined};
}

// Missing scope opens the cohort inbox; assignment-only bookmarks keep their original week.
export function selectReviewWeek(state:AdminWorkspaceState,cohortId:string,weekId?:string|null,assignmentId?:string|null){
 return weekId==='all'||(!weekId&&!assignmentId)?undefined:selectQueueWeek(state,cohortId,weekId,assignmentId);
}
export function buildReviewQueue(state:AdminWorkspaceState,cohortId:string,weekId:string,now:Date,audience:'official'|'test'='official'){
 const weeks=state.weeks.filter(w=>w.cohortId===cohortId&&w.publicationState==='published'&&(weekId==='all'||w.id===weekId)).toSorted((a,b)=>a.weekNumber-b.weekNumber).map(week=>({week,...buildWeekQueue(state,cohortId,week.id,now,audience)}));
 const rows=weeks.flatMap(w=>w.rows);
 return {weeks,rows,assignments:weeks.flatMap(w=>w.assignments),received:rows.filter(r=>r.submission).length,awaiting:rows.filter(r=>r.state==='submitted').length,participants:state.enrollments.filter(e=>e.cohortId===cohortId&&e.participationStatus==='enrolled'&&!!e.isTest===(audience==='test')).length};
}
