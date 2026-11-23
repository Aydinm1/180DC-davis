import test from 'node:test';
import assert from 'node:assert/strict';
import {swapSettingsError,swapDeckUrl} from '../src/lib/slide-swap/types.ts';
import {submissionBelongsTo} from '../src/lib/program/types.ts';
import {buildWeekQueue} from '../src/lib/program/week-queue.ts';
const stories=[{id:'s1',title:'Lunch',body:'A story'},{id:'s2',title:'Train',body:'Another story'},{id:'s3',title:'Moon',body:'Third story'}];
const config={version:0,overview:'Create, swap, present',stories,groups:[{id:'pair',name:'Pair',isTest:false,members:[{enrollmentId:'a',storyId:'s1'},{enrollmentId:'b',storyId:'s2'}]}]};
test('Slide Swap settings require a pair/trio, unique people and different valid stories',()=>{
 assert.equal(swapSettingsError(config),undefined);
 for(const patch of [{stories:[...stories,stories[0]]},{groups:[{...config.groups[0],members:[{enrollmentId:'a',storyId:'s1'}]}]},{groups:[{...config.groups[0],members:[{enrollmentId:'a',storyId:'s1'},{enrollmentId:'b',storyId:'s1'}]}]},{groups:[...config.groups,config.groups[0]]}])assert.ok(swapSettingsError({...config,...patch}));
});
test('shared proof belongs to both partners; one queue row grants individual week completion',()=>{
 const assignment={id:'assignment',workflow:'slide_swap',title:'Swap',weekNumber:5,dueAt:'2026-11-20T00:00:00Z'},proof={id:'proof',assignmentId:'assignment',swapGroupId:'pair',participantEnrollmentIds:['a','b'],status:'completed',isCurrent:true};
 assert.equal(submissionBelongsTo(proof,'a'),true);assert.equal(submissionBelongsTo(proof,'b'),true);assert.equal(submissionBelongsTo(proof,'c'),false);
 const state={cohorts:[],approvedMembers:[],people:[{id:'a',fullName:'A'},{id:'b',fullName:'B'}],weeks:[{id:'week',cohortId:'cohort',weekNumber:5,publicationState:'published',assignments:[assignment]}],enrollments:['a','b'].map(id=>({id,personId:id,cohortId:'cohort',participationStatus:'enrolled'})),swapGroups:[{id:'pair',assignmentId:'assignment',isTest:false,name:'Pair',enrollmentIds:['a','b']}],submissions:[proof]};
 const result=buildWeekQueue(state,'cohort','week',new Date());assert.equal(result.received,1);assert.equal(result.rows.length,1);assert.equal(result.complete,2);
 const exception=buildWeekQueue({...state,submissions:[],completionCredits:[{id:'credit',assignmentId:'assignment',enrollmentId:'a'}]},'cohort','week',new Date());assert.equal(exception.complete,1);assert.notEqual(exception.rows[0].state,'completed');
 const withdrawn=buildWeekQueue({...state,enrollments:state.enrollments.map(e=>e.id==='a'?{...e,participationStatus:'withdrew'}:e)},'cohort','week',new Date());assert.equal(withdrawn.participants,1);assert.equal(withdrawn.complete,1);
});

test('slide links accept real deck paths and reject unsafe or unrelated destinations',()=>{
 for(const url of ['https://docs.google.com/presentation/d/deck_123/edit?usp=sharing','https://docs.google.com/presentation/u/0/d/deck_123/present','https://www.canva.com/design/DAG_123/token/view?utm_source=share','https://canva.com/design/abc/edit','https://canva.link/abc123xyz','https://canva.link/my-brand-deck','https://canva.link/short_link/?utm_source=share#page-2'])assert.equal(swapDeckUrl(url),url);
 for(const url of ['javascript:alert(1)','http://docs.google.com/presentation/d/abc/edit','https://docs.google.com.evil.test/presentation/d/a/edit','https://docs.google.com@evil.test/presentation/d/a','https://docs.google.com/document/d/a','https://www.canva.com/','https://www.canva.com:444/design/a/view','https://www.canva.com/design/a/ bad','https://evil.test/design/a/view','http://canva.link/abc','https://canva.link/','https://canva.link/abc/extra','https://canva.link.evil.test/abc','https://canva.link@evil.test/abc','https://evil.test@canva.link/abc','https://canva.link:444/abc','https://canva.link/abc%2Fdef','https://www.canva.com/design/a/\nview'])assert.equal(swapDeckUrl(url),null,url);
});
