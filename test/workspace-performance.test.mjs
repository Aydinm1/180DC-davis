import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { readWorkspaceRows } from '../src/lib/supabase/workspace-rows.ts';

function database({ gate = Promise.resolve(), fail, tables = {} } = {}) {
  const started = [];
  const query = name => {
    const q = {
      select() { return q; }, order() { return q; }, eq() { return q; }, is() { return q; },
      async range(from, to) {
        started.push({ name, from, to });
        await gate;
        return { data: (tables[name] ?? []).slice(from, to + 1), error: name === fail ? new Error('Unavailable') : null };
      },
    };
    return q;
  };
  return { started, from: query, rpc: query };
}

test('all 14 independent workspace reads start before any resolves, with full pagination', async () => {
  let release;
  const db = database({ gate: new Promise(resolve => { release = resolve; }), tables: { people: Array.from({ length: 101 }, (_, id) => ({ id })) } });
  const pending = readWorkspaceRows(db, true);
  assert.equal(db.started.length, 14, 'Independent reads must not wait for previous data sets');
  assert.equal(new Set(db.started.map(c => c.name)).size, 14);
  release();
  const rows = await pending;
  assert.equal(rows.people.data.length, 101);
  assert.deepEqual(db.started.filter(c => c.name === 'people').map(c => c.from), [0, 100]);
});

test('workspace reads fail closed, skip private activity for non-admin reads and never share results', async () => {
  await assert.rejects(readWorkspaceRows(database({ fail: 'case_progress' }), true), /could not be loaded/);
  const db = database();
  assert.deepEqual((await readWorkspaceRows(db, false)).activity.data, []);
  assert.ok(!db.started.some(c => c.name === 'admin_activity'));
  const [a, b] = await Promise.all([
    readWorkspaceRows(database({ tables: { people: [{ id: 'a' }] } }), true),
    readWorkspaceRows(database({ tables: { people: [{ id: 'b' }] } }), true),
  ]);
  assert.deepEqual(a.people.data, [{ id: 'a' }]);
  assert.deepEqual(b.people.data, [{ id: 'b' }]);
});

test('queue filtering uses Next-integrated local history rather than server navigation', () => {
  for (const name of ['admin-overview', 'admin-case-progress']) {
    const source = readFileSync(new URL(`../src/components/admin/${name}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /replaceLocalQuery/);
    assert.doesNotMatch(source, /router\.(replace|push)|useRouter/);
  }
  const query = readFileSync(new URL('../src/lib/navigation/local-query.ts', import.meta.url), 'utf8');
  assert.match(query, /window\.history\.replaceState/);
  assert.match(query, /useSyncExternalStore/);
  assert.match(query, /window\.dispatchEvent/);
  assert.match(query, /removeEventListener\('popstate', listener\)/);
  const data = readFileSync(new URL('../src/lib/supabase/data.ts', import.meta.url), 'utf8');
  assert.ok(data.indexOf('await requireUser(admin)') < data.indexOf('await readWorkspaceRows(db, admin)'));
  assert.doesNotMatch(data, /unstable_cache|use cache|service.role/i);
});
