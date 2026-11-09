import test from 'node:test';
import assert from 'node:assert/strict';
import {briefBlocks,briefInline} from '../src/lib/program/brief.ts';
import {teamBriefError} from '../src/lib/teams/briefs.ts';
test('safe brief tables preserve cells, inline formatting and subsequent instructions',()=>{
 const blocks=briefBlocks('## Inputs\n\n| Input | Meaning |\n|---|:---:|\n| **Fee** | `=B2*C2` |\n| Source | [Reference](https://example.com) |\n\n## Submit\nExplain your evidence.');
 assert.deepEqual(blocks.map(b=>b.type),['heading','table','heading','paragraph']);assert.deepEqual(blocks[1].headers,['Input','Meaning']);assert.equal(blocks[1].rows[0][0],'**Fee**');assert.equal(briefInline(blocks[1].rows[0][1])[0].type,'code');
 assert.deepEqual(briefBlocks('A | B\n--- | ---\none \\| two | `x|y`')[0].rows,[['one | two','`x|y`']]);
 assert.equal(briefBlocks('| a | b |\n| no | delimiter |')[0].type,'paragraph');assert.equal(briefBlocks('a | b\n--- | ---\nwrong | column | count')[1].type,'paragraph');
 assert.deepEqual(briefInline('<script>alert(1)</script>'),[{type:'text',text:'<script>alert(1)</script>'}]);
});
test('team brief input has independent bounded text and optimistic version validation',()=>{
 assert.equal(teamBriefError('',0),undefined);assert.equal(teamBriefError('😀'.repeat(50000),1),undefined);assert.ok(teamBriefError('x'.repeat(50001),1));assert.ok(teamBriefError('bad\0text',1));
 for(const version of [-1,1.5,'1',Infinity])assert.ok(teamBriefError('Brief',version));
});
