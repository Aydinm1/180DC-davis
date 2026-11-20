import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionBatchError,canManuallyComplete} from '../src/lib/program/bulk-completion.ts';
test('bulk credit validates bounds, UUIDs and duplicate assignment/enrollment pairs',()=>{
 const target={assignmentId:randomUUID(),enrollmentId:randomUUID()};
 assert.equal(completionBatchError([target]),undefined);
 for(const input of [null,[],[null],[{}],[{...target,enrollmentId:'bad'}],[target,target],[target,{assignmentId:target.assignmentId.toUpperCase(),enrollmentId:target.enrollmentId.toUpperCase()}],Array.from({length:101},()=>({...target,enrollmentId:randomUUID()}))])assert.ok(completionBatchError(input));
 assert.equal(completionBatchError([target,{...target,assignmentId:randomUUID()}]),undefined);
});
test('bulk eligibility excludes shared work, protected exercises, submitted/credited work and inactive scope',()=>{
 const row={enrollment:{id:'e',personId:'p',cohortId:'c',participationStatus:'enrolled'},assignment:{id:'a',workflow:'standard',submissionMode:'individual'}};
 const state={cohorts:[{id:'c',state:'active'}],weeks:[{cohortId:'c',publicationState:'published',assignments:[row.assignment]}],approvedMembers:[{personId:'p',active:true,role:'member'}]};
 assert.equal(canManuallyComplete(row,state),true);
 for(const patch of [{team:{}},{swapGroup:{}},{submission:{}},{completionCredit:{}},{enrollment:{...row.enrollment,participationStatus:'withdrew'}},...['cases','investigation','schedule','slide_swap'].map(workflow=>({assignment:{...row.assignment,workflow}})),{assignment:{...row.assignment,submissionMode:'team'}}])assert.equal(canManuallyComplete({...row,...patch},state),false);
 for(const patch of [{cohorts:[{id:'c',state:'archived'}]},{weeks:[{...state.weeks[0],publicationState:'draft'}]},{approvedMembers:[{personId:'p',active:false,role:'member'}]},{approvedMembers:[{personId:'p',active:true,role:'viewer'}]}])assert.equal(canManuallyComplete(row,{...state,...patch}),false);
});
