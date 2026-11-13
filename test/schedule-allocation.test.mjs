import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleAllocation} from '../src/lib/schedules/allocation.ts';
const task=(data={})=>({id:'a',name:'Research',consultants:[1,2],hours:20,blocks:[{id:'b',start:6,end:10}],...data});
test('allocation splits total effort by consultant and scheduled days across week boundaries',()=>{
 const rows=[task()],before=structuredClone(rows),result=scheduleAllocation(rows);
 assert.equal(result.weeks[0][0].hours,4);assert.equal(result.weeks[1][0].hours,6);assert.equal(result.weeks[1][1].tasks[0].hours,6);assert.equal(result.weeks[0][2].hours,0);
 assert.equal(result.weeks.flat().reduce((sum,c)=>sum+c.hours,0),20);assert.deepEqual(rows,before);
});
test('allocation supports separate blocks, all five roles, overlaps and fractional hours',()=>{
 const result=scheduleAllocation([task({consultants:[1,2,3,4,5],hours:12.5,blocks:[{id:'a',start:1,end:1},{id:'b',start:1,end:1},{id:'c',start:70,end:70}]})]);
 assert.equal(result.weeks[0][4].hours,1.25);assert.equal(result.weeks[9][4].hours,1.25);assert.equal(result.weeks[4][0].hours,0);
});
test('allocation sums concurrent tasks and identifies omitted incomplete tasks',()=>{
 const result=scheduleAllocation([task({hours:10,consultants:[1],blocks:[{id:'b',start:1,end:1}]}),task({id:'second',hours:1.25,consultants:[1],blocks:[{id:'c',start:2,end:2}]}),task({id:'missing',hours:null}),task({id:'no-days',blocks:[]}),task({id:'no-staff',consultants:[]})]);
 assert.equal(result.weeks[0][0].hours,11.25);assert.equal(result.weeks[0][0].tasks.length,2);assert.deepEqual(result.incomplete,['missing','no-days','no-staff']);
 assert.equal(scheduleAllocation([]).weeks.flat().reduce((n,c)=>n+c.hours,0),0);
});
