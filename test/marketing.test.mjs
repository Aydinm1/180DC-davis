import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import config from '../next.config.ts';
import { isMarketingPath, marketingSite } from '../src/lib/marketing/site.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('public marketing boundary is segment-exact and leaves GAP destinations unchanged', async () => {
  for (const path of ['/landing', '/landing/', '/landing/about', '/landing/a/b']) assert.equal(isMarketingPath(path), true);
  for (const path of ['/', '/login', '/admin', '/explore', '/auth/callback', '/week/1', '/landing-other', '/landingx', '/api/landing']) assert.equal(isMarketingPath(path), false);
  assert.equal(marketingSite.gapHref, '/');
  assert.deepEqual(await config.headers(), [{ source: '/landing/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]);
  assert.deepEqual(await config.redirects(), [
    { source: '/program', destination: '/', permanent: true },
    { source: '/program/:path+', destination: '/:path+', permanent: true },
  ]);
});

test('marketing proxy exits before configuration, cookie reads or Supabase calls', async () => {
  const calls = { config: 0, cookies: 0, client: 0, claims: 0 };
  const exports = {};
  const code = ts.transpileModule(read('src/proxy.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { exports, require(name) {
    if (name === '@/lib/marketing/site') return { isMarketingPath };
    if (name === '@/lib/supabase/config') return { supabaseConfig() { calls.config++; return { url: 'http://localhost', key: 'fixture' }; } };
    if (name === '@supabase/ssr') return { createServerClient(url, key, options) { calls.client++; options.cookies.getAll(); return { auth: { async getClaims() { calls.claims++; } } }; } };
    if (name === 'next/server') return { NextResponse: { next: () => ({ headers: new Headers(), cookies: { set() {} } }) } };
    throw new Error('Unexpected import: ' + name);
  } });
  const request = pathname => ({ nextUrl: { pathname }, cookies: { getAll() { calls.cookies++; return []; } } });
  for (const path of ['/landing', '/landing/about']) await exports.proxy(request(path));
  assert.deepEqual(calls, { config: 0, cookies: 0, client: 0, claims: 0 });
  for (const path of ['/', '/admin', '/explore', '/auth/callback', '/landing-other']) {
    const response = await exports.proxy(request(path));
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  assert.deepEqual(calls, { config: 5, cookies: 5, client: 5, claims: 5 });
});

test('marketing remains server-only, scoped and separate from protected providers', () => {
  for (const path of ['src/app/(marketing)/layout.tsx', 'src/app/(marketing)/landing/page.tsx', 'src/components/marketing/marketing-shell.tsx', 'src/components/marketing/landing-starter.tsx']) {
    const source = read(path);
    assert.doesNotMatch(source, /use client|@\/lib\/supabase|@\/lib\/auth|ActivityRecorder|MemberWorkspace|AppHeader|next\/headers|fetch\(/);
  }
  assert.doesNotMatch(read('src/components/marketing/marketing.module.css'), /:global|:root|(?:^|\n)(?:html|body|\*)\s*\{/);
  assert.doesNotMatch(read('src/components/marketing/landing-starter.tsx'), /\/landing/);
  assert.match(read('src/app/(marketing)/layout.tsx'), /robots: \{ index: false, follow: false \}/);
  assert.match(read('src/components/marketing/marketing-shell.tsx'), /href=\{marketingSite.gapHref\}/);
});
