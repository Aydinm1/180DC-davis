import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleReferenceError} from '../src/lib/grading/types.ts';
const sample={formatVersion:2,original:[],revised:[],explanation:''};
test('schedule grading guidance permits empty drafts/removal and validates both plans',()=>{
 assert.equal(scheduleReferenceError(sample),undefined);assert.equal(scheduleReferenceError(null),undefined);
 for(const bad of [{...sample,formatVersion:1},{...sample,explanation:'x'.repeat(2001)},{...sample,original:[{id:'invalid'}]},{...sample,revised:[{id:'invalid'}]}])assert.ok(scheduleReferenceError(bad));
});
