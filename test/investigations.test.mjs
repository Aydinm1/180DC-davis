import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {investigationInputError,nextInvestigationHint} from '../src/lib/investigations/types.ts';
import {briefInline} from '../src/lib/program/brief.ts';
import {buildWeekQueue} from '../src/lib/program/week-queue.ts';
const uuid=n=>`18000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const content={overview:'Investigate',workbookUrl:'https://example.com/student',acceptedNames:['Fixture'],gradingGuidance:'',stages:[{id:uuid(1),title:'Stage',hints:[{id:uuid(2),title:'Hint',body:'Evidence',optional:false}]}]};
test('investigation validation requires private setup and bounded typed input',()=>{
 assert.equal(investigationInputError('configure',{version:0,content}),undefined);
 for(const patch of [{workbookUrl:'javascript:bad'},{acceptedNames:[]},{acceptedNames:[' ']},{stages:[]},{gradingGuidance:'x'.repeat(50001)}])assert.ok(investigationInputError('configure',{version:0,content:{...content,...patch}}));
 assert.ok(investigationInputError('configure',{version:0,content:{...content,stages:[{...content.stages[0],hints:[{...content.stages[0].hints[0],id:uuid(1)}]}]}}));
 assert.ok(investigationInputError('configure',{version:0,content:{...content,stages:[{...content.stages[0],hints:[null]}]}}));
 assert.equal(investigationInputError('draft',{version:0,name:'',reason:''}),undefined);
 assert.ok(investigationInputError('submit',{version:0,name:'',reason:'Evidence'}));assert.ok(investigationInputError('submit',{version:0,name:'Fixture',reason:'x'.repeat(2001)}));assert.ok(investigationInputError('draft',{version:0.5,name:'X',reason:'Y'}));
});
test('progression skips optional hints without requiring any reveal to submit',()=>{
 const stage={id:uuid(1),title:'Holder',hints:[{id:uuid(2),optional:false,body:'opened'},{id:uuid(3),optional:true,body:null},{id:uuid(4),optional:false,body:null}]};
 assert.equal(nextInvestigationHint(stage).id,uuid(4));assert.equal(nextInvestigationHint({...stage,hints:stage.hints.map(h=>h.optional?h:{...h,body:'opened'})}),undefined);
 assert.equal(investigationInputError('submit',{version:0,name:'Fixture',reason:'Records support this conclusion.'}),undefined);
});
test('formulas remain literal safe code, including structured references and dollar anchors',()=>{
 for(const formula of ['=TRIM(PROPER(E2))','=XLOOKUP(C2,PersonnelData[Badge ID],PersonnelData[Name],"Not Found")',"=AND(D2<='Case File'!$B$9,E2>'Case File'!$B$10)",'<script>**unsafe**</script>'])assert.deepEqual(briefInline('`'+formula+'`'),[{type:'code',text:formula}]);
 assert.deepEqual(briefInline('`[link](https://example.com)` **bold**').map(p=>p.type),['code','text','bold']);
});
test('starter has exactly four stages and fifteen hints; no real answer or workbook seeded',()=>{
 const source=readFileSync('src/lib/investigations/content.ts','utf8');const c=JSON.parse(source.slice(source.indexOf('= ')+2).trim().replace(/;$/,''));
 assert.equal(c.stages.length,4);assert.equal(c.stages.flatMap(s=>s.hints).length,15);assert.equal(c.stages.flatMap(s=>s.hints).filter(h=>h.optional).length,1);assert.equal(c.workbookUrl,'');assert.deepEqual(c.acceptedNames,[]);
 assert.match(c.gradingGuidance,/Admin answer-key workbook/);assert.ok(!c.overview.includes('1Ebgjz2'));
 assert.equal(c.stages[3].hints[3].body.includes("=AND(D2<='Case File'!$B$9,E2>'Case File'!$B$10)"),true);
});
test('investigation is graded as ordinary submissions; drafts and reveals add no counts',()=>{
 const assignment={id:'assignment',title:'Investigate',instructions:'Work',weekNumber:3,workflow:'investigation',dueAt:'2027-01-01T00:00:00Z'};
 const state={people:[{id:'p',fullName:'Fixture'}],enrollments:[{id:'e',cohortId:'c',personId:'p',participationStatus:'enrolled'}],weeks:[{id:'w',cohortId:'c',weekNumber:3,title:'Week',publicationState:'published',assignments:[assignment]}],submissions:[],cohorts:[],approvedMembers:[]};
 let queue=buildWeekQueue(state,'c','w',new Date());assert.equal(queue.received,0);assert.equal(queue.complete,0);
 const submission={id:'s',enrollmentId:'e',assignmentId:'assignment',isCurrent:true,status:'submitted',submittedAt:'2026-11-08T12:00:00Z',payload:{type:'text',submittedText:'Suspect: Fixture'}};
 queue=buildWeekQueue({...state,submissions:[submission]},'c','w',new Date());assert.equal(queue.awaiting,1);assert.equal(queue.complete,0);
 queue=buildWeekQueue({...state,submissions:[{...submission,status:'completed'}]},'c','w',new Date());assert.equal(queue.complete,1);
});
