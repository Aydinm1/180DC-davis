import 'server-only';
import {requireUser} from './auth';
import {createClient} from './server';
import {readPages} from './pagination';
import {readQueueRows} from './queue-rows';
import type {AdminQueueState,QueueAssignment,QueueSubmission} from '@/lib/program/admin';

export async function readAdminQueue(requestedCohort?:string){
 const user=await requireUser(true),db=await createClient();
 const requested=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedCohort??'')?requestedCohort:undefined;
 const [cohorts,own,requestedRows]=await Promise.all([
  readPages((from,to)=>db.from('program_cohorts').select('id,quarter,year,starts_on,ends_on,state').order('id').range(from,to)),
  readPages((from,to)=>db.from('cohort_enrollments').select('id,cohort_id,participation_status').eq('person_id',user.personId).order('id').range(from,to)),
  requested?readQueueRows(db,requested):undefined,
 ]);
 const cohort=cohorts.data.find(c=>c.id===requestedCohort)??cohorts.data.find(c=>c.state==='active')??cohorts.data[0];
 const common={cohorts:cohorts.data.map(c=>({id:c.id,quarter:c.quarter,year:c.year,startsOn:c.starts_on,endsOn:c.ends_on,state:c.state}))};
 const hasMyProgram=own.data.some(e=>e.participation_status==='enrolled'&&cohorts.data.some(c=>c.id===e.cohort_id&&c.state==='active'));
 const empty:AdminQueueState={...common,people:[],approvedMembers:[],enrollments:[],weeks:[],submissions:[],teams:[],swapGroups:[],caseProgress:[],completionCredits:[]};
 if(!cohort)return {user,state:empty,cohortId:'',hasMyProgram};
 const rows=requested===cohort.id&&requestedRows?requestedRows:await readQueueRows(db,cohort.id);
 const state:AdminQueueState={...common,
  people:rows.enrollments.flatMap(e=>e.people?[{id:e.people.id,email:e.people.email,fullName:e.people.full_name}]:[]),
  approvedMembers:rows.enrollments.flatMap(e=>e.people?.approved_members?[{id:e.people.approved_members.id,personId:e.people.approved_members.person_id,email:e.people.approved_members.email,fullName:e.people.approved_members.full_name,role:e.people.approved_members.role,active:e.people.approved_members.active}]:[]),
  enrollments:rows.enrollments.map(e=>({id:e.id,cohortId:e.cohort_id,personId:e.person_id,participationStatus:e.participation_status,isTest:e.is_test})),
  weeks:rows.weeks.map(w=>({id:w.id,cohortId:w.cohort_id,weekNumber:w.week_number,title:w.title,publicationState:w.published?'published':'draft',assignments:rows.assignments.filter(a=>a.week_id===w.id).map((a):QueueAssignment=>({id:a.id,weekNumber:w.week_number,title:a.title,dueAt:a.due_at,workflow:a.workflow as QueueAssignment['workflow'],submissionMode:a.submission_mode as QueueAssignment['submissionMode']}))})),
  submissions:rows.submissions.map((s):QueueSubmission=>({id:s.id,assignmentId:s.assignment_id,enrollmentId:s.enrollment_id??undefined,teamId:s.team_id??undefined,swapGroupId:s.swap_group_id??undefined,status:s.status,submittedAt:s.submitted_at,updatedAt:s.updated_at,isCurrent:s.is_current})),
  teams:rows.teams.map(t=>({id:t.id,cohortId:t.cohort_id,name:t.name,isTest:t.is_test,version:t.version,locked:t.locked,enrollmentIds:t.team_memberships.map(m=>m.enrollment_id)})),
  swapGroups:rows.groups.map(g=>({id:g.id,assignmentId:g.assignment_id,name:g.name,isTest:g.is_test,enrollmentIds:g.slide_swap_members.map(m=>m.enrollment_id)})),
  completionCredits:rows.credits.map(c=>({id:c.id,assignmentId:c.assignment_id,enrollmentId:c.enrollment_id,grantedAt:c.granted_at,grantedBy:c.granted_by})),
  swapProgress:rows.swapProgress.map(p=>({assignmentId:p.assignment_id,groupId:p.group_id,enrollmentId:p.enrollment_id,ready:p.ready})),
  caseProgress:rows.progress.map(p=>({assignmentId:p.assignment_id,enrollmentId:p.enrollment_id,answered:p.answered,completedAt:p.completed_at??undefined})),
 };
 return {user,state,cohortId:cohort.id,hasMyProgram};
}
