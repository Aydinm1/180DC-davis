import test from 'node:test';
import assert from 'node:assert/strict';
import {changeBlock,mergeBlocks,upgradeRows,dayLabel} from '../src/lib/schedules/gantt.ts';
test('Gantt moves preserve duration and resize clamps to ten weeks',()=>{
 const b={id:'b',start:5,end:9};
 assert.deepEqual(changeBlock(b,'move',-20),{id:'b',start:1,end:5});
 assert.deepEqual(changeBlock(b,'move',100),{id:'b',start:66,end:70});
 assert.deepEqual(changeBlock(b,'start',30),{id:'b',start:9,end:9});
 assert.deepEqual(changeBlock(b,'end',100),{id:'b',start:5,end:70});
 assert.equal(dayLabel(9),'Week 2 Tue');assert.equal(dayLabel(70),'Week 10 Sun');
});
test('Gantt merges adjacent/overlapping blocks while preserving separate work and source objects',()=>{
 const blocks=[{id:'later',start:20,end:22},{id:'first',start:2,end:5},{id:'overlap',start:4,end:9},{id:'adjacent',start:10,end:11}];
 const before=structuredClone(blocks);
 assert.deepEqual(mergeBlocks(blocks),[{id:'first',start:2,end:11},{id:'later',start:20,end:22}]);assert.deepEqual(blocks,before);
});
test('legacy upgrade expands chosen weeks without inventing consultant or hour data',()=>{
 const rows=[{id:'task',name:'Meeting',weeks:[1,2,5]}];let id=0;
 assert.deepEqual(upgradeRows(rows,()=>String(++id)),[{id:'task',name:'Meeting',consultants:[],hours:null,blocks:[{id:'1',start:1,end:14},{id:'3',start:29,end:35}]}]);assert.deepEqual(rows[0].weeks,[1,2,5]);
});
