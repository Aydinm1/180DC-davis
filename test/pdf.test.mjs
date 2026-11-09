import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import postcss from 'postcss';
import {isPdfFile,pdfSignature,pdfUrls} from '../src/lib/pdf/types.ts';
import {makePdf} from './pdf-fixtures.mjs';

test('PDF detection uses stored MIME, with narrowly bounded historical filename fallback',()=>{
 assert.ok(isPdfFile('application/pdf','file.bin'));
 assert.ok(isPdfFile(null,'Research.PDF'));
 assert.ok(isPdfFile(undefined,'Research.pdf'));
 assert.ok(!isPdfFile('image/jpeg','research.pdf'));
 assert.ok(!isPdfFile(null,'research.pdf.exe'));
 assert.ok(pdfSignature(makePdf()));
 assert.ok(pdfSignature(Buffer.from('%PDF-2.0')));
 for(const bytes of [Buffer.from('%PDF-9.0'),Buffer.from('not a PDF'),Buffer.from(''),Buffer.from('x%PDF-1.7')])assert.ok(!pdfSignature(bytes));
 assert.deepEqual(pdfUrls({kind:'submission',id:'document',name:'private.pdf'}),{preview:'/api/submissions/document/pdf',download:'/api/submissions/document/download'});
 assert.equal(pdfUrls({kind:'example',id:'example',name:'model.pdf'}).preview,'/api/grading-examples/example/pdf');
});

test('PDF.js worker is version matched, local and CSS rules cannot leak into GAP',async()=>{
 const pkg=JSON.parse(await readFile('package.json','utf8'));
 const version=pkg.dependencies['pdfjs-dist'];assert.match(version,/^\d+\.\d+\.\d+$/);
 const reader=await readFile('src/components/admin/pdf-reader.tsx','utf8');assert.ok(reader.includes(`/pdfjs/${version}/`));
 const css=postcss.parse(await readFile(`public/pdfjs/${version}/viewer.css`,'utf8'));
 css.walkRules(rule=>{
  let parent=rule.parent;while(parent){if(parent.type==='rule'||parent.type==='atrule'&&/keyframes$/i.test(parent.name))return;parent=parent.parent;}
  for(const selector of rule.selectors)assert.match(selector,/^\.gap-pdf-reader(?:\s|\b)/);
 });
 const worker=await readFile(`public/pdfjs/${version}/pdf.worker.min.mjs`,'utf8');assert.ok(worker.includes(version));
 assert.match(reader,/annotationMode:pdf.AnnotationMode.DISABLE/);assert.match(reader,/enableXfa:false/);assert.ok(!reader.includes('PDFScriptingManager'));
});
