import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Read-only catalog checks on the local Docker database, never hosted credentials.
function query(sql) {
 const out=execFileSync('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8'});
 return JSON.parse(out.trim());
}
test('application tables fail closed to anonymous callers and direct client writes',()=>{
 const rows=query(`select json_agg(x) from (select n.nspname as schema,c.relname as name,c.relrowsecurity as rls,
 has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') as anon_access,
 has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER') as anon_mutation,
 has_any_column_privilege('authenticated',c.oid,'SELECT') as client_read,
 has_any_column_privilege('authenticated',c.oid,'INSERT,UPDATE,REFERENCES') as client_columns,
 has_table_privilege('authenticated',c.oid,'DELETE,TRUNCATE,TRIGGER') as client_mutation
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','p')) x`);
 assert.ok(rows.length>=41);
 for(const row of rows){
  const name=`${row.schema}.${row.name}`;
  assert.ok(!row.anon_access&&!row.anon_mutation&&!row.client_columns&&!row.client_mutation,name);
  if(row.schema==='private')assert.ok(!row.client_read,`${name} private read grant`);
  // Existing private retry ledger is unexposed and has no client grants; do not silently
  // allow this exception for any new table. Enabling its RLS is a hardening follow-up.
  if(name!=='private.submission_requests')assert.ok(row.rls,`${name} needs RLS`);
 }
 const config=readFileSync('supabase/config.toml','utf8');
 assert.match(config,/^schemas = \["public", "graphql_public"\]$/m);
});
test('privileged functions have safe search paths and deny anonymous execution',()=>{
 const rows=query(`select json_agg(x) from (select n.nspname as schema,p.proname as name,p.proconfig as config,
 p.prorettype::regtype::text as returns,has_function_privilege('anon',p.oid,'execute') as anon_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef) x`);
 assert.ok(rows.length>=75);
 for(const r of rows){
  if(r.name==='rls_auto_enable'&&r.returns==='event_trigger'){assert.ok(r.config.includes('search_path=pg_catalog'));continue;}
  assert.ok(r.config?.includes('search_path=""'),`${r.schema}.${r.name} search path`);
  assert.ok(!r.anon_execute,`${r.schema}.${r.name} anonymous execution`);
 }
});
test('actor-accepting upload/import/cleanup operations remain service-only',()=>{
 const rows=query(`select json_agg(x) from (select p.proname as name,
 has_function_privilege('anon',p.oid,'execute') as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute') as client_execute,
 has_function_privilege('service_role',p.oid,'execute') as service_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in ('file_upload','assignment_brief','grading_example','monday_import','monday_attendance_snapshot','cleanup_uploads','cleanup_grading_examples')) x`);
 assert.equal(rows.length,7);
 for(const r of rows)assert.ok(!r.anon_execute&&!r.client_execute&&r.service_execute,r.name);
});
test('file buckets remain private and browser policies cannot overwrite or delete',()=>{
 const buckets=query(`select json_agg(x) from (select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('submissions','grading-examples','assignment-briefs')) x`);
 assert.equal(buckets.length,3);
 for(const b of buckets){assert.equal(b.public,false,b.id);assert.equal(b.file_size_limit,20*1024*1024,b.id);assert.ok(!b.allowed_mime_types.some(t=>['image/svg+xml','text/html','application/javascript'].includes(t)));}
 const risky=query(`select coalesce(json_agg(x),'[]') from (select policyname,cmd,roles from pg_policies where schemaname='storage' and tablename='objects'
 and (roles&&array['anon','public']::name[] or cmd in ('UPDATE','DELETE','ALL') and roles&&array['authenticated']::name[])) x`);
 assert.deepEqual(risky,[]);
});
