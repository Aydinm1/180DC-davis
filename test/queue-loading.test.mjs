import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {readQueueRows} from '../src/lib/supabase/queue-rows.ts';

function database({gate=Promise.resolve(),tables={},fail}={}){
 const calls=[];
 const query=(name,rpc=false)=>{
  const filters=[];let columns;
  const q={
   select(value){columns=value;return q;},
   eq(key,value){filters.push(['eq',key,value]);return q;},
   is(key,value){filters.push(['is',key,value]);return q;},
   in(key,value){filters.push(['in',key,value]);return q;},
   order(){return q;},
   async range(from,to){calls.push({name,rpc,columns,filters:[...filters],from,to});await gate;return {data:(tables[name]??[]).slice(from,to+1),error:fail===name?new Error('Unavailable'):null};},
  };return q;
 };
 return {calls,from:name=>query(name),rpc:name=>query(name,true)};
}

test('queue starts seven scoped metadata reads together and skips unused data',async()=>{
 let release;const db=database({gate:new Promise(resolve=>{release=resolve;})});
 const pending=readQueueRows(db,'cohort');
 assert.equal(db.calls.length,7);
 release();await pending;
 assert.deepEqual(db.calls.map(c=>c.name),['program_weeks','assignments','cohort_enrollments','submissions','cohort_teams','slide_swap_groups','assignment_completions']);
 for(const call of db.calls){
  assert.ok(call.filters.some(([op,key,value])=>op==='eq'&&key.endsWith('cohort_id')&&value==='cohort'));
  assert.ok(!call.columns.includes('*'));
  assert.doesNotMatch(call.columns,/instructions|description|submitted_text|submitted_url|feedback|file_path|original_filename|last_active/);
 }
 assert.ok(db.calls.find(c=>c.name==='submissions').filters.some(([op,key,value])=>op==='eq'&&key==='is_current'&&value===true));
});

test('queue pagination stays complete, conditional case scopes are bounded and failures reject',async()=>{
 const db=database({tables:{submissions:Array.from({length:101},(_,id)=>({id})),assignments:Array.from({length:201},(_,id)=>({id:String(id),workflow:'cases'}))}});
 const rows=await readQueueRows(db,'cohort');assert.equal(rows.submissions.length,101);
 assert.deepEqual(db.calls.filter(c=>c.name==='submissions').map(c=>c.from),[0,100]);
 const scopes=db.calls.filter(c=>c.name==='case_progress').map(c=>c.filters.find(([op])=>op==='in')[2]);
 assert.deepEqual(scopes.map(ids=>ids.length),[100,100,1]);
 assert.equal(new Set(scopes.flat()).size,201);
 await assert.rejects(readQueueRows(database({fail:'submissions'}),'cohort'),/could not be loaded/);
});

test('queue route cannot inherit the full workspace loader or bypass live authorization',()=>{
 const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const root=read('src/app/admin/layout.tsx'),queue=read('src/app/admin/(queue)/page.tsx'),data=read('src/lib/supabase/admin-queue.ts');
 assert.doesNotMatch(root+queue,/readWorkspace\(/);
 assert.match(root,/await requireUser\(true\)/);
 assert.ok(data.indexOf('await requireUser(true)')<data.indexOf('await Promise.all'));
 assert.doesNotMatch(data,/unstable_cache|use cache|service.role/i);
 assert.match(read('src/app/admin/(workspace)/layout.tsx'),/readWorkspace\(true\)/);
});


test('slide readiness reads only for published swap scope, paginates and fails closed',async()=>{
 const db=database({tables:{assignments:[{id:'swap',workflow:'slide_swap'}],slide_swap_queue_progress:Array.from({length:101},(_,id)=>({enrollment_id:String(id),ready:id%2===0}))}});
 const result=await readQueueRows(db,'cohort');assert.equal(result.swapProgress.length,101);
 assert.deepEqual(db.calls.filter(c=>c.name==='slide_swap_queue_progress').map(c=>c.from),[0,100]);
 await assert.rejects(readQueueRows(database({tables:{assignments:[{workflow:'slide_swap'}]},fail:'slide_swap_queue_progress'}),'cohort'),/could not be loaded/);
});
