import test from 'node:test';
import assert from 'node:assert/strict';
import {blockGeometry,changeBlock,mergeBlocks,upgradeRows,dayLabel} from '../src/lib/schedules/gantt.ts';
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

test('nearby bar grab areas leave the intervening day fully clickable at every zoom',()=>{
 const blocks=[{id:'mon',start:1,end:1},{id:'wed',start:3,end:3}];
 for(const width of [8,20,44]){
  const a=blockGeometry(blocks[0],blocks,width),b=blockGeometry(blocks[1],blocks,width);
  assert.ok(a.left+a.width<=width);assert.ok(b.left>=2*width);
  assert.equal(a.left+a.fillLeft,1);assert.equal(b.left+b.fillLeft,2*width+1);
  assert.equal(a.fillWidth,width-2);
 }
 assert.equal(blockGeometry(blocks[0],[blocks[0]],20).width,44);
 assert.deepEqual(mergeBlocks([...blocks,{id:'tue',start:2,end:2}]),[{id:'mon',start:1,end:3}]);
});
