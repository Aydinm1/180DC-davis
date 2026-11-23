import assert from 'node:assert/strict';
import test from 'node:test';
import { briefBlocks, briefInline, safeBriefUrl } from '../src/lib/program/brief.ts';
import { validateAdminWeek } from '../src/lib/program/admin.ts';

test('restricted assignment formatting supports headings, bold, paragraphs and both list types',()=>{
 const blocks=briefBlocks('## Your task\r\nResearch **Notion**.\r\n\r\n- Strength\n- Weakness\n\n### Recommend\n1. Evidence\n2. Source');
 assert.deepEqual(blocks.map(b=>b.type),['heading','paragraph','list','subheading','list']);
 assert.deepEqual(blocks[2].items,['Strength','Weakness']);assert.equal(blocks[4].ordered,true);
 assert.deepEqual(briefInline('Research **Notion** and [sources](https://example.com).').map(p=>p.type),['text','bold','text','link','text']);
});
test('brief links never activate HTML, images or unsafe protocols',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,bad','file:///tmp/a','//example.com','/admin'])assert.equal(safeBriefUrl(value),undefined);
 assert.equal(briefInline('[unsafe](javascript:alert)').some(p=>p.type==='link'),false);
 assert.deepEqual(briefInline('![image](https://example.com/pixel)'),[{type:'text',text:'![image](https://example.com/pixel)'}]);
 assert.deepEqual(briefInline('<script>alert(1)</script>'),[{type:'text',text:'<script>alert(1)</script>'}]);
 assert.equal(safeBriefUrl('https://example.com/?x=1&y=2'),'https://example.com/?x=1&y=2');
});

test('assignment summaries and instruction limits are validated before saving',()=>{
 const assignment={id:'a',title:'SWOT',instructions:'Research Notion',dueAt:'2026-10-28T20:00:00Z',weekNumber:1};
 const week={id:'w',cohortId:'c',weekNumber:1,title:'Week 1',description:'Learn',publicationState:'published',resources:[],assignments:[assignment]};
 assert.equal(validateAdminWeek(week),undefined);
 assert.match(validateAdminWeek({...week,assignments:[{...assignment,summary:'😀'.repeat(301)}]}),/300/);
 assert.match(validateAdminWeek({...week,assignments:[{...assignment,instructions:'x'.repeat(50001)}]}),/50,000/);
 assert.match(validateAdminWeek({...week,assignments:[{...assignment,instructionsFormat:'html'}]}),/format/);
 assert.equal(validateAdminWeek({...week,assignments:[{...assignment,summary:'😀'.repeat(300),instructionsFormat:'markdown'}]}),undefined);
});


test('structured activities own their instructions; Standard still requires its main brief',()=>{
 const assignment={id:'a',title:'Activity',instructions:'',dueAt:'2026-11-28T20:00:00Z',weekNumber:1};
 const week={id:'w',cohortId:'c',weekNumber:1,title:'Week 1',description:'Learn',publicationState:'published',resources:[],assignments:[assignment]};
 for(const workflow of ['guided','cases','investigation','schedule','slide_swap']){
  assert.equal(validateAdminWeek({...week,assignments:[{...assignment,workflow}]}),undefined);
  assert.match(validateAdminWeek({...week,assignments:[{...assignment,workflow,title:''}]}),/every assignment/);
 }
 for(const workflow of [undefined,'standard'])assert.match(validateAdminWeek({...week,assignments:[{...assignment,workflow}]}),/instructions/);
});
