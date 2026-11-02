import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { briefHeadings, briefBlocks } from '../src/lib/program/brief.ts';
import { pendingDirectionRequest, projectProgressLabel, projectQuestion } from '../src/lib/guided/admin-progress.ts';

const state={research:{risk1:'Risk',risk2:'Risk two',question:'Current research question'},version:1,direction:'recommended',frozen:false};
const request={id:'request',status:'pending',proposal:{question:'Alternative question'},decision_note:''};
const team={id:'team',name:'Team 1',members:4,isTest:false,state,recommendation:null,requests:[request]};

test('only current unfrozen alternative proposals are actionable requests',()=>{
 assert.equal(pendingDirectionRequest(team),undefined);
 assert.equal(projectProgressLabel(team),'Using your recommended direction');
 assert.equal(projectQuestion(team),'Current research question');
 const alternative={...team,state:{...state,direction:'alternative'}};
 assert.equal(pendingDirectionRequest(alternative).id,'request');
 assert.equal(projectProgressLabel(alternative),'Alternative pending');
 assert.equal(projectQuestion(alternative),'Alternative question');
 assert.equal(pendingDirectionRequest({...alternative,state:{...alternative.state,frozen:true}}),undefined);
 for(const status of ['approved','changes_requested','superseded'])assert.equal(pendingDirectionRequest({...alternative,requests:[{...request,status}]}),undefined);
 assert.equal(projectProgressLabel({...team,state:null}),'Not started');
 assert.equal(projectProgressLabel({...team,state:{...state,direction:null}}),'Research saved');
 assert.equal(projectProgressLabel({...alternative,requests:[{...request,status:'approved'}]}),'Alternative approved');
 assert.equal(projectProgressLabel({...alternative,requests:[{...request,status:'changes_requested'}]}),'Changes requested');
});

test('brief anchors are scoped, unique for repeated headings and preserve authored blocks',()=>{
 const text='## **Overview**\n\nAuthored content\n\n### [Example](https://example.com)\n\n## **Overview**';
 const original=briefBlocks(text),headings=briefHeadings(text,'first');
 assert.deepEqual(headings.map(h=>h.text),['Overview','Example','Overview']);
 assert.equal(new Set(headings.map(h=>h.id)).size,3);
 assert.ok(briefHeadings(text,'second').every(h=>!headings.some(a=>a.id===h.id)));
 assert.deepEqual(briefBlocks(text),original);
 assert.deepEqual(briefHeadings('No headings','scope'),[]);
});

test('activity view switches retain mounted editors and do not navigate or mutate',()=>{
 const read=file=>readFileSync(new URL('../src/components/program/'+file,import.meta.url),'utf8');
 for(const file of ['case-exercise.tsx','guided-project.tsx']){
  const source=read(file);
  assert.ok(source.includes("hidden={view!=='instructions'}"));
  assert.ok(source.includes("hidden={view!=='workspace'}"));
  assert.match(source,/ActivityViewNav value=\{view\} onChange=\{setView\}/);
 }
 const guided=read('guided-project.tsx');
 for(const step of [1,2,3])assert.ok(guided.includes('hidden={step!=='+step+'}'));
 assert.match(guided,/preview\|\|canSubmitGuided\(initial\)\?children/);
 const nav=read('activity-views.tsx');
 assert.doesNotMatch(nav,/router\.|fetch\(|saveCaseExercise|saveGuidedProject/);
});
