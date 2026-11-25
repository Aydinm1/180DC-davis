import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {readAdminWeeksRows} from '../src/lib/supabase/admin-weeks-rows.ts';

test('Weeks catalog reads scoped metadata/counts with complete ordered pagination',async()=>{
 const calls=[],rows=Array.from({length:101},(_,i)=>({id:String(i),week_number:i,title:'Week '+i,published:i%2===0,assignments:[{count:i%4}]}));
 const db={from(table){const call={table,orders:[]};calls.push(call);const query={select(columns){call.columns=columns;return query;},eq(key,value){call.filter=[key,value];return query;},order(key){call.orders.push(key);return query;},async range(from,to){call.from=from;return {data:rows.slice(from,to+1),error:null};}};return query;}};
 const result=await readAdminWeeksRows(db,'selected');assert.equal(result.length,101);
 assert.deepEqual(calls.map(c=>c.from),[0,100]);
 for(const call of calls){assert.equal(call.table,'program_weeks');assert.deepEqual(call.filter,['cohort_id','selected']);assert.deepEqual(call.orders,['week_number','id']);assert.equal(call.columns,'id,cohort_id,week_number,title,published,assignments(count)');}
 assert.equal(result[1].publicationState,'draft');assert.equal(result[1].assignmentCount,1);assert.equal(result[0].assignmentCount,0);
});

test('Weeks list has its own authorized route and never inherits editor data',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const source=read('src/app/admin/(catalog)/weeks/page.tsx')+read('src/lib/supabase/admin-weeks.ts');
 assert.doesNotMatch(source,/readWorkspace|service.role|unstable_cache/);assert.match(source,/await requireUser\(true\)/);
 assert.match(read('src/components/admin/admin-weeks.tsx'),/prefetch=\{false\}/);
});


test('Weeks catalog fails closed on a database read error',async()=>{
 const query={select(){return query;},eq(){return query;},order(){return query;},async range(){return {data:null,error:new Error('Unavailable')};}};
 await assert.rejects(readAdminWeeksRows({from(){return query;}},'selected'),/could not be loaded/);
});
