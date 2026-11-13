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
