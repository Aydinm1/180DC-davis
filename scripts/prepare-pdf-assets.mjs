import {cp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import postcss from 'postcss';

const source = new URL('../node_modules/pdfjs-dist/', import.meta.url);
const {version} = JSON.parse(await readFile(new URL('package.json', source), 'utf8'));
const target = new URL(`../public/pdfjs/${version}/`, import.meta.url);
await rm(target,{recursive:true,force:true});
await mkdir(target, {recursive:true});
for (const name of ['cmaps','standard_fonts','iccs','wasm','web/images']) {
  await cp(new URL(name,source),new URL(name==='web/images'?'images':name,target),{recursive:true,filter:path=>!path.toLowerCase().includes('quickjs')});
}
await cp(new URL('build/pdf.worker.min.mjs',source),new URL('pdf.worker.min.mjs',target));
await cp(new URL('LICENSE',source),new URL('LICENSE',target));
const css=postcss.parse(await readFile(new URL('web/pdf_viewer.css',source),'utf8'));
css.walkRules(rule=>{
  let parent=rule.parent;
  while(parent){
    if(parent.type==='rule'||parent.type==='atrule'&&/keyframes$/i.test(parent.name))return;
    parent=parent.parent;
  }
  rule.selectors=rule.selectors.map(selector=>selector.includes(':root')?selector.replaceAll(':root','.gap-pdf-reader'):`.gap-pdf-reader ${selector}`);
});
await writeFile(new URL('viewer.css',target),css.toString());
