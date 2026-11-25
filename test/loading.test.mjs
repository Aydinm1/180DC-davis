import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

test('route fallback is branded, accessible and motion-optional without client dependencies', () => {
  const source = readFileSync(new URL('../src/components/ui/route-loading.tsx', import.meta.url), 'utf8');
  assert.match(source, /min-h-svh.*items-center justify-center/);
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(source, /180dc-uc-davis-landscape-dark.png/);
  assert.match(source, /loading="eager"/);
  assert.match(source, /motion-safe:animate-pulse/);
  assert.match(source, /className="sr-only">Loading GAP…/);
  assert.doesNotMatch(source, /use client|useEffect|fetch\(|setTimeout|fixed/);
});


test('every route loading boundary reuses the standard 180 component',()=>{
 const root=new URL('../src/app/',import.meta.url);
 const paths=readdirSync(root,{recursive:true}).filter(p=>p.endsWith('loading.tsx'));
 assert.ok(paths.length>=4);
 for(const path of paths)assert.equal(readFileSync(new URL(path,root),'utf8').trim(),"export { RouteLoading as default } from '@/components/ui/route-loading';",path);
});
