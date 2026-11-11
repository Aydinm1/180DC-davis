import test from 'node:test';
import assert from 'node:assert/strict';
import {syncMondayAttendance} from '../src/lib/monday/attendance-sync.ts';
const config={token:'secret-fixture',account:'1',board:'2',email:'email',checkbox:'enroll',cohort:'cohort',status:'status'};
const member=(id,items=[id])=>({enrollmentId:id,name:'Participant '+id,email:id+'@ucdavis.edu',items});
const meta={account:{id:'1'},boards:[{id:'2',columns:[{id:'week2',title:'Week 2',type:'checkbox'},{id:'email',title:'Email',type:'text'}]}]};
function transport({checked=new Set(),fail=new Set(),move=false,email=false,metadata=meta}={}) {
 const calls=[];
 const fetcher=async(url,request)=>{
  assert.equal(url,'https://api.monday.com/v2');assert.equal(request.cache,'no-store');
  const body=JSON.parse(request.body);calls.push(body);
  if(body.query.includes('account{'))return Response.json({data:metadata});
  if(body.query.startsWith('query')){const id=body.variables.items[0];return Response.json({data:{items:[{id,board:{id:move?'other':'2'},column_values:[{id:'email',text:email?'changed@ucdavis.edu':id+'@ucdavis.edu'},{id:'week2',value:JSON.stringify({checked:checked.has(id)?'true':false})}]}]}});}
  const {item,board,values}=body.variables;assert.equal(board,'2');assert.deepEqual(JSON.parse(values),{week2:{checked:'true'}});
  if(fail.has(item))return Response.json({errors:[{message:'provider secret details'}]});
  checked.add(item);return Response.json({data:{change_multiple_column_values:{id:item}}});
 };
 return {fetcher,calls,checked};
}
const snapshot=participants=>async id=>({weekNumber:2,participants:id?participants.filter(p=>p.enrollmentId===id):participants});
test('Monday attendance checks only the selected week, skips existing checks and is replay-safe',async()=>{
 const fake=transport({checked:new Set(['2'])});const source=snapshot([member('1'),member('2')]);
 assert.deepEqual(await syncMondayAttendance(config,source,fake.fetcher),{checked:1,alreadyChecked:1,issues:[]});
 assert.deepEqual(await syncMondayAttendance(config,source,fake.fetcher),{checked:0,alreadyChecked:2,issues:[]});
 assert.equal(fake.calls.filter(c=>c.query.startsWith('mutation')).length,1);
});
test('missing/ambiguous mappings, moved items and changed emails never write',async()=>{
 for(const [participants,options] of [[[member('1',[]),member('2',['2','3'])],{}],[[member('1')],{move:true}],[[member('1')],{email:true}]]){
  const fake=transport(options),result=await syncMondayAttendance(config,snapshot(participants),fake.fetcher);
  assert.equal(result.checked,0);assert.equal(result.issues.length,participants.length);assert.ok(!fake.calls.some(c=>c.query.startsWith('mutation')));
 }
});
test('wrong account, duplicate title or non-checkbox fails before any write',async()=>{
 for(const metadata of [{...meta,account:{id:'wrong'}},{account:meta.account,boards:[{id:'2',columns:[...meta.boards[0].columns,{id:'duplicate',title:'Week 2',type:'checkbox'}]}]},{account:meta.account,boards:[{id:'2',columns:[{id:'week2',title:'Week 2',type:'text'}]}]}]){
  const fake=transport({metadata});await assert.rejects(syncMondayAttendance(config,snapshot([member('1')]),fake.fetcher),/Monday/);assert.equal(fake.calls.length,1);
 }
});
test('partial failures retain successes, sanitize errors and can be retried',async()=>{
 const fake=transport({fail:new Set(['2'])});const source=snapshot([member('1'),member('2')]);
 const result=await syncMondayAttendance(config,source,fake.fetcher);assert.equal(result.checked,1);assert.equal(result.issues.length,1);assert.ok(!JSON.stringify(result).includes('provider secret'));
 const retry=transport({checked:fake.checked});const again=await syncMondayAttendance(config,source,retry.fetcher);assert.equal(again.checked,1);assert.equal(again.alreadyChecked,1);
});
test('live revocation or attendance undo between read and write prevents export',async()=>{
 for(const revoked of [false,true]){
  let reads=0;const source=async()=>{reads++;if(reads===3){if(revoked)throw new Error('Attendance access changed');return {weekNumber:2,participants:[]};}return {weekNumber:2,participants:[member('1')]};};
  const fake=transport(),result=await syncMondayAttendance(config,source,fake.fetcher);assert.equal(result.checked,0);assert.equal(result.issues.length,1);assert.ok(!fake.calls.some(c=>c.query.startsWith('mutation')));
 }
});
test('rate limits, transport failures and lost mutation receipts are safely retryable',async()=>{
 const fake=transport();let first=true;
 const flaky=async(url,options)=>{const body=JSON.parse(options.body);if(body.query.startsWith('mutation')&&first){first=false;await fake.fetcher(url,options);throw new Error('lost response');}return fake.fetcher(url,options);};
 assert.equal((await syncMondayAttendance(config,snapshot([member('1')]),flaky)).checked,1);
 let attempts=0;
 const limited=async()=>{attempts++;return Response.json({errors:[{message:'private'}]},{status:429,headers:{'retry-after':'30'}});};
 await assert.rejects(syncMondayAttendance(config,snapshot([member('1')]),limited),/rate-limited/);assert.equal(attempts,1);
});
