import assert from 'node:assert/strict';
import test from 'node:test';
import {buildReviewQueue,selectReviewWeek,buildWeekQueue,selectQueueWeek} from '../src/lib/program/week-queue.ts';
const assignment=id=>({id,title:id,instructions:'Work',dueAt:'2026-12-01T00:00:00Z',weekNumber:1});
const enrollment=(id,isTest=false)=>({id,personId:id,cohortId:'cohort',participationStatus:'enrolled',advancementStatus:'pending',isTest});
const state={people:[{id:'a',fullName:'A'},{id:'b',fullName:'B'},{id:'test',fullName:'Test'}],cohorts:[],approvedMembers:[],enrollments:[enrollment('a'),enrollment('b'),enrollment('test',true)],weeks:[{id:'week',cohortId:'cohort',weekNumber:1,title:'Workshop',publicationState:'published',assignments:[assignment('one'),assignment('two')]}],submissions:[]};
const attempt=(id,enrollmentId,assignmentId,status='completed',isCurrent=true)=>({id,enrollmentId,assignmentId,status,isCurrent,submittedAt:'2026-10-01T00:00:00Z',payload:{type:'text',submittedText:'Work'}});
const now=new Date('2026-10-22T00:00:00Z');
test('team queues count work once and give shared approval to each teammate without test inflation',()=>{
 const teams=[{id:'team',cohortId:'cohort',name:'Research',isTest:false,enrollmentIds:['a','b']},{id:'test-team',cohortId:'cohort',name:'Test research',isTest:true,enrollmentIds:['test']}];
 const s={...state,teams,weeks:[{...state.weeks[0],assignments:[{...assignment('one'),submissionMode:'team'},assignment('two')]}],submissions:[{...attempt('shared',undefined,'one'),teamId:'team'},attempt('a2','a','two'),attempt('b2','b','two'),{...attempt('testing',undefined,'one','submitted'),teamId:'test-team'}]};
 const result=buildWeekQueue(s,'cohort','week',now);assert.equal(result.rows.length,3);assert.equal(result.received,3);assert.equal(result.complete,2);assert.equal(result.assignments[0].rows[0].team.id,'team');
 assert.equal(buildWeekQueue(s,'cohort','week',now,'test').awaiting,1);
 const unassigned=buildWeekQueue({...s,teams:[]},'cohort','week',now);assert.equal(unassigned.assignments[0].rows.length,0);assert.equal(unassigned.assignments[0].unassigned,2);assert.equal(unassigned.complete,0);
});
test('week completion requires every current approved assignment, not submitted coverage',()=>{
 const s={...state,submissions:[attempt('a1','a','one'),attempt('a2','a','two'),attempt('b1','b','one'),attempt('b2','b','two','revision_requested'),attempt('old','b','two','completed',false),attempt('t1','test','one'),attempt('t2','test','two')]};
 const result=buildWeekQueue(s,'cohort','week',now);assert.equal(result.participants,2);assert.equal(result.complete,1);assert.equal(result.rate,.5);assert.equal(result.rows.length,4);assert.equal(new Set(result.rows.map(r=>r.enrollment.id+':'+r.assignment.id)).size,4);assert.equal(result.assignments[0].approved,2);assert.equal(buildWeekQueue(s,'cohort','week',now,'test').complete,1);
});
test('week selection respects cohort, published content and legacy assignment links',()=>{
 const s={...state,weeks:[...state.weeks,{...state.weeks[0],id:'new',weekNumber:2,assignments:[assignment('three')]},{...state.weeks[0],id:'draft',weekNumber:3,publicationState:'draft'}]};
 assert.equal(selectQueueWeek(s,'cohort').id,'new');assert.equal(selectQueueWeek(s,'cohort',null,'one').id,'week');assert.equal(selectQueueWeek(s,'cohort','week','three').id,'week');assert.equal(selectQueueWeek(s,'other'),undefined);assert.equal(buildWeekQueue(s,'cohort','draft',now).rows.length,0);
});
test('empty participant/assignment denominators never imply 100 percent completion',()=>{
 assert.equal(buildWeekQueue({...state,enrollments:[]},'cohort','week',now).rate,undefined);
 const empty=buildWeekQueue({...state,weeks:[{...state.weeks[0],assignments:[]}]},'cohort','week',now);assert.equal(empty.complete,0);assert.equal(empty.rate,undefined);assert.equal(empty.rows.length,0);
});
test('review counts represent current received submissions, not completion, people or historical attempts',()=>{
 const s={...state,submissions:[attempt('a1','a','one','submitted'),attempt('a2','a','two','revision_requested'),attempt('b1','b','one'),attempt('old','a','one','submitted',false),attempt('t1','test','one','submitted')]};
 const result=buildWeekQueue(s,'cohort','week',now);
 assert.equal(result.received,3);assert.equal(result.awaiting,1);assert.equal(result.complete,0);
 assert.deepEqual(result.assignments.map(a=>[a.received,a.awaiting]),[[2,1],[1,0]]);
 const testQueue=buildWeekQueue(s,'cohort','week',now,'test');assert.equal(testQueue.received,1);assert.equal(testQueue.awaiting,1);
 const empty=buildWeekQueue({...state,enrollments:[]},'cohort','week',now);assert.equal(empty.received,0);assert.equal(empty.awaiting,0);
});

test('all-week inbox includes every published week but excludes drafts, other cohorts and test work',()=>{
 const s={...state,weeks:[...state.weeks,{...state.weeks[0],id:'week2',weekNumber:2,assignments:[assignment('three')]},{...state.weeks[0],id:'draft',publicationState:'draft',assignments:[assignment('secret')]},{...state.weeks[0],id:'other',cohortId:'other',assignments:[assignment('outside')]}],submissions:[attempt('first','a','one','submitted'),attempt('next','b','three','submitted'),attempt('old','b','three','submitted',false),attempt('test','test','three','submitted'),attempt('hidden','a','secret','submitted')]};
 const inbox=buildReviewQueue(s,'cohort','all',now);
 assert.equal(inbox.awaiting,2);assert.equal(inbox.received,2);assert.equal(inbox.participants,2);assert.equal(inbox.rows.length,6);
 assert.deepEqual(inbox.weeks.map(w=>w.week.id),['week','week2']);assert.deepEqual(inbox.assignments.map(a=>a.assignment.id),['one','two','three']);
 assert.equal(buildReviewQueue(s,'cohort','week',now).awaiting,1);assert.equal(buildReviewQueue(s,'cohort','all',now,'test').awaiting,1);
 assert.equal(buildReviewQueue(s,'other','all',now).participants,0);
 assert.equal(selectReviewWeek(s,'cohort'),undefined);assert.equal(selectReviewWeek(s,'cohort','all'),undefined);assert.equal(selectReviewWeek(s,'cohort',null,'one').id,'week');assert.equal(selectReviewWeek(s,'cohort','week2').id,'week2');
});
