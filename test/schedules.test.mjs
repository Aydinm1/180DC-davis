import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleRowsError,scheduleInputError} from '../src/lib/schedules/types.ts';
const row={id:'00000000-0000-4000-8000-000000000001',name:'Kickoff',weeks:[1,3,10]};
test('schedules allow editable presets, ten discrete weeks and incomplete drafts',()=>{
 assert.equal(scheduleRowsError([row],true),undefined);assert.equal(scheduleRowsError([{...row,name:'',weeks:[]}]),undefined);assert.ok(scheduleRowsError([{...row,name:'',weeks:[]}],true));
 for(const rows of [[row,{...row}],Array.from({length:31},()=>row),[{...row,weeks:[0]}],[{...row,weeks:[11]}],[{...row,weeks:[2,2]}],[{...row,weeks:[1.5]}],[{...row,name:'a'.repeat(201)}]])assert.ok(scheduleRowsError(rows));
});
test('schedule operations require bounded content, versions and submission explanations',()=>{
 const config={overview:'Instructions',scenario:'Original case',disruption:'Private change',starter:[row]};
 assert.equal(scheduleInputError('configure',{version:0,content:config}),undefined);
 assert.ok(scheduleInputError('configure',{version:0,content:{...config,disruption:''}}));
 assert.equal(scheduleInputError('draft',{version:0,configVersion:1,rows:[],explanation:''}),undefined);
 assert.ok(scheduleInputError('reveal',{version:0,configVersion:1,rows:[],explanation:''}));
 assert.ok(scheduleInputError('submit',{version:1,configVersion:1,rows:[row],explanation:''}));
 assert.equal(scheduleInputError('submit',{version:1,configVersion:1,rows:[row],explanation:'Moved the research window.'}),undefined);
 for(const version of [-1,0.5,'0',null])assert.ok(scheduleInputError('draft',{version,configVersion:1,rows:[],explanation:''}));
 assert.ok(scheduleInputError('draft',{version:1,configVersion:1,rows:[row],explanation:'a'.repeat(2001)}));
});

test('day schedules require valid ranges, consultants and total effort at completion',()=>{
 const day={id:row.id,name:'Research',blocks:[{id:'00000000-0000-4000-8000-000000000002',start:2,end:5}],consultants:[1,3],hours:8.25};
 assert.equal(scheduleRowsError([day],true,2),undefined);assert.equal(scheduleRowsError([{...day,category:'client_call'}],true,2),undefined);assert.ok(scheduleRowsError([{...day,category:'red'}],true,2));assert.ok(scheduleRowsError([{...day,category:null}],true,2));
 const starter={...day,consultants:[],hours:null};
 assert.equal(scheduleRowsError([starter],true,2,false),undefined);
 assert.ok(scheduleRowsError([starter],true,2));
 assert.equal(scheduleRowsError([{...starter,name:'',blocks:[]}],false,2),undefined);
 for(const patch of [{consultants:[1,1]},{consultants:[6]},{hours:0},{hours:-2},{hours:Infinity},{hours:1.001},{hours:1.0000000001},{blocks:[{...day.blocks[0],end:71}]},{blocks:[{...day.blocks[0],start:0}]},{blocks:[{...day.blocks[0],start:8,end:2}]},{blocks:[...day.blocks,{id:'00000000-0000-4000-8000-000000000003',start:5,end:8}]},{blocks:[...day.blocks,{...day.blocks[0],start:9,end:10}]},{weeks:[1]}])assert.ok(scheduleRowsError([{...day,...patch}],false,2));
 assert.equal(scheduleRowsError([{...day,hours:0.29}],true,2),undefined);
 assert.equal(scheduleInputError('configure',{version:0,content:{formatVersion:2,overview:'Instructions',scenario:'Original',disruption:'Change',starter:[starter]}}),undefined);
});

test('task count is not capped at thirty for day or legacy schedules',()=>{
 const rows=Array.from({length:60},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,name:'Task '+i,weeks:[1]}));
 assert.equal(scheduleRowsError(rows,true),undefined);
 assert.equal(scheduleRowsError(rows.map(({id,name})=>({id,name,blocks:[{id:'00000000-0000-4000-8000-000000000099',start:1,end:2}],consultants:[1],hours:1})),true,2),undefined);
});
