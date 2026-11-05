import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readMemberRows } from '../src/lib/supabase/member-rows.ts';
import { verifyProgramBrowser } from './lib/program-browser.mjs';
import { verifyMarketingHttp, verifyMarketingBrowser } from './lib/marketing-browser.mjs';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const exec = promisify(execFile);
const { stdout } = await exec('./node_modules/.bin/supabase', ['status','-o','json']);
const config = JSON.parse(stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1', 'Tests must use local Supabase');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth:{ persistSession:false,autoRefreshToken:false } });
const anonymous = createClient(config.API_URL,config.ANON_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
const q = value => `'${String(value).replaceAll("'","''")}'`;
async function sql(text) {
  const { stdout } = await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',text]);
  return stdout.trim();
}
const fixtures = [];
const cohortId = randomUUID();
const weekId = randomUUID();
const draftId = randomUUID();
const assignmentId = randomUUID();
let createdCohortId;
const browserCohorts = [];
const appUrl = process.env.GAP_TEST_APP_URL;
if (appUrl) assert.ok(['localhost', '127.0.0.1'].includes(new URL(appUrl).hostname), 'Application tests must stay local');
async function appPage(path, client) {
  const cookies = new Map();
  if (client) {
    const { data: { session } } = await client.auth.getSession();
    assert.ok(session);
    const ssr = createServerClient(config.API_URL, config.ANON_KEY, { cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => cookies.set(name, value)),
    } });
    assert.ifError((await ssr.auth.setSession(session)).error);
  }
  const response = await fetch(new URL(path, appUrl), { headers: {
    cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
    'user-agent': 'Googlebot',
  } });
  const html = await response.text();
  // Next can stream a redirect after the loading shell (HTTP 200 + refresh meta).
  const redirect = html.match(/id="__next-page-redirect"[^>]*content="\d+;url=(\/login|\/access-denied)"/);
  if (redirect) return appPage(redirect[1], client);
  return { response, html };
}
async function fixture(role='member', { active=true,google=true,approved=true,domain='ucdavis.edu' }={}) {
  const email = `gap-test-${randomUUID()}@${domain}`;
  const { data, error } = await admin.auth.admin.createUser({ email,email_confirm:true });
  assert.ifError(error);
  const userId=data.user.id, personId=randomUUID();
  fixtures.push({ userId,personId });
  if (google) await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at) values (${q(userId)},${q(userId)},jsonb_build_object('sub',${q(userId)},'email',${q(email)},'email_verified',true),'google',now(),now(),now())`);
  await sql(`insert into public.people(id,email,full_name) values (${q(personId)},${q(email)},'Integration Test');`);
  if(approved) await sql(`insert into public.approved_members(person_id,email,full_name,role,active) values (${q(personId)},${q(email)},'Integration Test',${q(role)},${active});`);
  const { data:link,error:linkError } = await admin.auth.admin.generateLink({ type:'magiclink',email });
  assert.ifError(linkError);
  const client=createClient(config.API_URL,config.ANON_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
  // Auth-issued fixture session, not a fake application identity or password-login route.
  const { error:sessionError } = await client.auth.verifyOtp({ token_hash:link.properties.hashed_token,type:'magiclink' });
  assert.ifError(sessionError);
  return { client,personId,userId,email };
}
const ok = result => { assert.ifError(result.error); return result.data; };

async function jarFor(person, expired = false, invalidRefresh = false) {
  if (!person) return new Map();
  const session = ok(await person.client.auth.getSession()).session;
  const jar = new Map();
  const ssr = createServerClient(config.API_URL, config.ANON_KEY, { cookies: {
    getAll: () => [...jar].map(([name,value]) => ({name,value})),
    setAll: values => values.forEach(({name,value}) => jar.set(name,value)),
  }});
  ok(await ssr.auth.setSession(session));
  if (!expired) return jar;
  const [header,body] = session.access_token.split('.');
  const unsigned = `${header}.${Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(body,'base64url')),exp:1})).toString('base64url')}`;
  const token = `${unsigned}.${createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url')}`;
  const name = [...jar.keys()][0].replace(/\.\d+$/,'');
  return new Map([[name,'base64-'+Buffer.from(JSON.stringify({...session,access_token:token,expires_at:1,expires_in:0,...(invalidRefresh ? {refresh_token:'invalid-test-refresh'} : {})})).toString('base64url')]]);
}
const cookieHeader = jar => [...jar].map(([name,value]) => `${name}=${value}`).join('; ');
async function action(name, args, jar) {
  let manifest;
  for (const path of [process.env.GAP_TEST_ACTION_MANIFEST || '.next/dev/server/server-reference-manifest.json','.next/server/server-reference-manifest.json']) {
    try { manifest = JSON.parse(await readFile(path,'utf8')); break; } catch { /* Try production output. */ }
  }
  const id = Object.entries(manifest.node).find(([,entry]) => entry.exportedName===name)?.[0];
  assert.ok(id, `Missing compiled ${name} action`);
  const response = await fetch(new URL(name==='saveAdmin'?'/admin/members':'/week/1', appUrl), {
    method:'POST',redirect:'manual',headers:{'next-action':id,'content-type':'text/plain;charset=UTF-8',origin:appUrl,cookie:cookieHeader(jar)},body:JSON.stringify(args),
  });
  return { response, body:await response.text(), redirect:response.headers.get('x-action-redirect') ?? '' };
}
async function fixtureSnapshot() {
  return sql(`select jsonb_build_object(
    'cohort',(select to_jsonb(c) from public.program_cohorts c where id=${q(cohortId)}),
    'weeks',(select jsonb_agg(w order by id) from public.program_weeks w where cohort_id=${q(cohortId)}),
    'enrollments',(select jsonb_agg(e order by id) from public.cohort_enrollments e where cohort_id=${q(cohortId)}),
    'submissions',(select jsonb_agg(s order by id) from public.submissions s where assignment_id=${q(assignmentId)}),
    'roster',(select jsonb_agg(r order by id) from public.approved_members r where person_id in (${fixtures.map(f=>q(f.personId)).join(',')})))`);
}

test('local Supabase Auth, API policies and persistent program mutations',async t => {
  try {
    await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values (${q(cohortId)},'winter',2999,'2999-01-01','2999-03-01','active');
      insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values
      (${q(weekId)},${q(cohortId)},1,'Test Week','Published test instructions',true),
      (${q(draftId)},${q(cohortId)},2,'Draft title','SECRET DRAFT',false);
      insert into public.assignments(id,week_id,title,instructions,due_at) values (${q(assignmentId)},${q(weekId)},'Test assignment','Submit a link',now()+interval '1 day');`);
    const lead=await fixture('admin'), member=await fixture(), other=await fixture();
    const inactive=await fixture('member',{ active:false }),wrong=await fixture('member',{ domain:'example.com' });
    const unapproved=await fixture('member',{ approved:false }),nongoogle=await fixture('member',{ google:false });
    for(const person of [member,other]) ok(await lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:person.personId,cohortId}}));
    await t.test('public landing ignores anonymous, signed-in and expired GAP sessions', { skip: !appUrl }, async () => {
      await verifyMarketingHttp({ appUrl, fixture, jarFor, sql });
    });
    await t.test('public landing desktop/phone keyboard, no-write visits and isolated styling', { skip: !process.env.GAP_TEST_BROWSER }, async () => {
      await verifyMarketingBrowser({ appUrl, fixture, jarFor, sql });
    });
    await t.test('application layouts enforce real cookie-session boundaries', { skip: !appUrl }, async () => {
      assert.match((await appPage('/')).html, /Continue with Google/);
      for (const denied of [inactive, wrong, unapproved, nongoogle]) {
        assert.match((await appPage('/', denied.client)).html, /GAP access required/);
      }
      assert.match((await appPage('/admin', member.client)).html, /GAP access required/);
      const dashboard = await appPage('/', member.client);
      assert.equal(dashboard.response.status, 200);
      assert.match(dashboard.html, /Test Week/);
      assert.doesNotMatch(dashboard.html, /SECRET DRAFT/);
      assert.match((await appPage('/admin', lead.client)).html, /Review queue/);
      assert.match((await appPage('/week/2', member.client)).html, /NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/);
    });
    await t.test('verified identities require current active roster and Google identity',async () => {
      assert.equal(ok(await lead.client.rpc('sync_profile'))[0].role,'admin');
      assert.equal(ok(await member.client.rpc('sync_profile'))[0].role,'member');
      for(const client of [anonymous,inactive.client,wrong.client,unapproved.client,nongoogle.client]) assert.ok((await client.rpc('sync_profile')).error);
      for(const client of [anonymous,member.client,inactive.client]) assert.ok((await client.rpc('admin_mutate',{p_action:'cohort_state',p_data:{id:cohortId,state:'archived'}})).error);
    });
    await t.test('draft catalog reveals no draft payload; member reads are isolated',async () => {
      const catalog=ok(await member.client.rpc('week_catalog',{p_cohort_id:cohortId}));
      assert.equal(catalog.length,2);
      assert.equal(catalog[1].title,'Draft title');
      assert.ok(!('description' in catalog[1]));
      assert.equal(ok(await member.client.from('program_weeks').select('*').eq('id',draftId)).length,0);
      assert.equal(ok(await member.client.from('people').select('*').eq('id',other.personId)).length,0);
      assert.ok((await member.client.schema('private').from('monday_application_links').select('*')).error);
      assert.ok((await member.client.from('approved_members').update({role:'admin'}).eq('person_id',member.personId)).error);
    });
    let current;
    await t.test('link submissions persist, preserve history, and reject duplicates/stale reviews',async () => {
      const concurrent=await Promise.all(Array.from({length:4},()=>member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/first'})));
      assert.equal(concurrent.filter(r=>!r.error).length,1);
      current=ok(await member.client.from('submissions').select('*').eq('assignment_id',assignmentId).eq('is_current',true).single());
      assert.equal(ok(await other.client.from('submissions').select('*').eq('id',current.id)).length,0);
      assert.ok((await member.client.from('submissions').insert({assignment_id:assignmentId,enrollment_id:current.enrollment_id,submission_type:'file',file_path:'fake',original_filename:'fake.pdf'})).error);
      const replaced=ok(await member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/revised',p_expected_id:current.id,p_expected_updated_at:current.updated_at}));
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'review',p_data:{id:current.id,status:'completed',expectedUpdatedAt:current.updated_at}})).error);
      current=ok(await member.client.from('submissions').select('*').eq('id',replaced).single());
      assert.equal(ok(await member.client.from('submissions').select('*').eq('assignment_id',assignmentId)).length,2);
      const receipt=ok(await lead.client.rpc('review_submission',{p_data:{id:current.id,status:'revision_requested',feedback:'Add a source.',expectedUpdatedAt:current.updated_at}}))[0];
      assert.equal(receipt.id,current.id);
      assert.notEqual(receipt.updated_at,current.updated_at);
      assert.ok((await lead.client.rpc('review_submission',{p_data:{id:current.id,status:'completed',expectedUpdatedAt:current.updated_at}})).error);
      assert.ok((await member.client.rpc('review_submission',{p_data:{id:current.id,status:'completed',expectedUpdatedAt:receipt.updated_at}})).error);
      assert.ok((await member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/stale',p_expected_id:current.id,p_expected_updated_at:current.updated_at})).error);
      current=ok(await member.client.from('submissions').select('*').eq('id',replaced).single());
      assert.equal(current.feedback,'Add a source.');
      assert.equal(current.updated_at,receipt.updated_at);
      if (appUrl) {
        const page = await appPage('/week/1/submission', member.client);
        assert.equal(page.response.status, 200);
        assert.match(page.html, /Add a source\./);
        assert.match((await appPage('/week/1/submission', member.client)).html, /Add a source\./);
      }
      ok(await lead.client.rpc('admin_mutate',{p_action:'review',p_data:{id:current.id,status:'completed',expectedUpdatedAt:current.updated_at}}));
      current=ok(await member.client.from('submissions').select('*').eq('id',replaced).single());
      assert.ok((await member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/closed',p_expected_id:current.id,p_expected_updated_at:current.updated_at})).error);
    });
    await t.test('publishing validates and retains assignments with history; failures roll back',async () => {
      const base={id:weekId,title:'Test Week',description:'Updated instructions',publicationState:'published',resources:[]};
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:base})).error);
      assert.equal(ok(await lead.client.from('program_weeks').select('description').eq('id',weekId).single()).description,'Published test instructions');
      ok(await lead.client.rpc('admin_mutate',{p_action:'week',p_data:{...base,assignment:{title:'Test assignment',instructions:'New instructions',dueAt:new Date().toISOString()}}}));
      assert.equal(ok(await member.client.from('program_weeks').select('description').eq('id',weekId).single()).description,'Updated instructions');
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:{id:draftId,title:'Draft title',description:'',publicationState:'published',resources:[]}})).error);
    });
    await t.test('admin cohorts, roster edits and returning enrollment preserve outcomes',async () => {
      createdCohortId = ok(await lead.client.rpc('admin_mutate', { p_action:'cohort_create', p_data: {
        quarter:'spring', year:2999, startsOn:'2999-04-01', endsOn:'2999-06-01', state:'draft',
      } }));
      const weeks = ok(await lead.client.from('program_weeks').select('*').eq('cohort_id',createdCohortId));
      assert.equal(weeks.length,6);
      assert.ok(weeks.every(w => !w.published));
      const original = ok(await lead.client.from('cohort_enrollments').select('*').eq('cohort_id',cohortId).eq('person_id',other.personId).single());
      ok(await lead.client.rpc('admin_mutate', { p_action:'enrollment', p_data: {
        id:original.id, participationStatus:'completed', advancementStatus:'promoted', promotionResponse:'joined',
      } }));
      const retries = await Promise.all(Array.from({length:4}, () => lead.client.rpc('admin_mutate', {
        p_action:'enroll', p_data:{personId:other.personId,cohortId:createdCohortId},
      })));
      assert.equal(new Set(retries.map(ok)).size,1);
      const history = ok(await lead.client.from('cohort_enrollments').select('*').eq('id',original.id).single());
      assert.equal(history.promotion_response,'joined');
      assert.equal(history.participation_status,'completed');
      const roster = ok(await lead.client.from('approved_members').select('*').eq('person_id',other.personId).single());
      ok(await lead.client.rpc('admin_mutate', { p_action:'roster', p_data: {
        id:roster.id,email:other.email,fullName:'Updated Test Name',role:'member',active:true,
      } }));
      assert.equal(ok(await other.client.rpc('sync_profile'))[0].full_name,'Updated Test Name');
    });
    await t.test('member query scoping, empty/admin portals, multiple cohorts and paginated history',async () => {
      const rows=await readMemberRows(member.client,member.personId);
      assert.equal(rows.cohort.id,cohortId);
      assert.deepEqual(rows.weeks.map(w=>w.id),[weekId]);
      assert.equal(rows.catalog.length,2);
      assert.equal(rows.submissions.length,2);
      assert.equal((await readMemberRows(lead.client,lead.personId)).cohort,undefined);
      // Even an admin's broadly authorized client must query only their chosen participation.
      const scoped=await readMemberRows(lead.client,other.personId);
      assert.equal(scoped.cohort,undefined); // Older participation completed; later cohort still draft.
      ok(await lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:lead.personId,cohortId}}));
      ok(await lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:lead.personId,cohortId:createdCohortId}}));
      ok(await lead.client.rpc('admin_mutate',{p_action:'cohort_state',p_data:{id:createdCohortId,state:'active'}}));
      assert.equal((await readMemberRows(lead.client,lead.personId)).cohort.id,createdCohortId);
      assert.equal((await readMemberRows(lead.client,lead.personId)).weeks.length,0);
      assert.equal((await readMemberRows(lead.client,lead.personId)).catalog.length,6);
      await sql(`insert into public.submissions(assignment_id,enrollment_id,submission_type,submitted_url,is_current)
        select ${q(assignmentId)},${q(current.enrollment_id)},'link','https://example.com/history/'||n,false from generate_series(1,1005) n`);
      assert.equal((await readMemberRows(member.client,member.personId)).submissions.length,1007);
      await sql(`delete from public.submissions where assignment_id=${q(assignmentId)} and submitted_url like 'https://example.com/history/%' and not is_current`);
    });
    await t.test('direct Server Actions enforce every non-upload mutation boundary', {skip:!appUrl}, async () => {
      const leadJar=await jarFor(lead),memberJar=await jarFor(member);
      await appPage('/admin/members',lead.client); await appPage('/week/1',member.client);
      const roster=ok(await admin.from('approved_members').select('id').eq('person_id',other.personId).single());
      const enrollment=ok(await admin.from('cohort_enrollments').select('id').eq('cohort_id',cohortId).eq('person_id',member.personId).single());
      const requests=[
        ['cohort_create',{quarter:'fall',year:2997,startsOn:'2997-09-01',endsOn:'2997-12-01',state:'draft'}],
        ['cohort_state',{id:cohortId,state:'archived'}],
        ['enroll',{personId:lead.personId,cohortId}],
        ['enrollment',{id:enrollment.id,participationStatus:'withdrew',advancementStatus:'pending'}],
        ['roster',{id:roster.id,email:other.email,fullName:'FORGED',role:'admin',active:true}],
        ['week',{id:weekId,title:'FORGED',description:'FORGED',publicationState:'draft',resources:[],assignment:{title:'Test',instructions:'Forged',dueAt:new Date().toISOString()}}],
        ['review',{id:current.id,status:'revision_requested',feedback:'FORGED',expectedUpdatedAt:current.updated_at}],
      ];
      const before=await fixtureSnapshot();
      for(const denied of [null,member,inactive,wrong,unapproved,nongoogle]) {
        const jar=await jarFor(denied);
        for(const args of requests) assert.match((await action('saveAdmin',args,jar)).redirect,denied ? /\/access-denied/ : /\/login/);
        if(denied!==member) assert.match((await action('saveLink',[assignmentId,'https://example.com/forged'],jar)).redirect,denied ? /\/access-denied/ : /\/login/);
      }
      for(const payload of [null,[],42,'invalid']) assert.match((await action('saveAdmin',['week',payload],leadJar)).body,/Invalid form data/);
      assert.match((await action('saveAdmin',['unknown',{}],leadJar)).body,/Unknown operation/);
      assert.match((await action('saveAdmin',['week',{id:randomUUID()}],leadJar)).body,/Could not save/);
      assert.match((await action('saveAdmin',['review',{id:current.id,status:'submitted',expectedUpdatedAt:'2000-01-01T00:00:00Z'}],leadJar)).body,/changed/);
      for(const args of [[assignmentId,null],[{},'https://example.com'],[assignmentId,'javascript:alert(1)'],[assignmentId,'https://example.com',current.id],[randomUUID(),'https://example.com']])
        assert.match((await action('saveLink',args,memberJar)).body,/error/);
      assert.match((await action('saveLink',[assignmentId,'https://example.com',current.id,current.updated_at],await jarFor(other))).body,/error/);
      await sql(`update public.approved_members set role='member' where person_id=${q(lead.personId)}`);
      for(const args of requests) assert.match((await action('saveAdmin',args,leadJar)).redirect,/\/access-denied/);
      await sql(`update public.approved_members set role='admin' where person_id=${q(lead.personId)}`);
      // Role updates change timestamps; normalize that field when comparing unchanged work.
      const after=await fixtureSnapshot();
      const stable = value => JSON.stringify(JSON.parse(value), (key,v) => key==='updated_at'?undefined:v);
      assert.equal(stable(after),stable(before));
    });
    await t.test('application refreshes expired access tokens and rejects invalid/revoked refresh sessions', {skip:!appUrl}, async () => {
      for(const role of ['member','admin']) {
        const person=await fixture(role);
        const jar=await jarFor(person,true);
        const response=await fetch(new URL(role==='admin'?'/admin':'/',appUrl),{headers:{cookie:cookieHeader(jar),'user-agent':'Googlebot'},redirect:'manual'});
        const body=await response.text();
        assert.equal(response.status,200);
        assert.doesNotMatch(body,/__next-page-redirect|Continue with Google/);
        const setCookies=response.headers.getSetCookie();
        assert.ok(setCookies.some(value=>value.includes('base64-')), 'Refreshed session must reach browser');
        const refreshed=new Map();
        for(const value of setCookies){const pair=value.split(';')[0], index=pair.indexOf('=');refreshed.set(pair.slice(0,index),decodeURIComponent(pair.slice(index+1)));}
        const serialized=[...refreshed].filter(([,value])=>value).sort(([a],[b])=>a.localeCompare(b)).map(([,value])=>value).join('');
        const session=JSON.parse(Buffer.from(serialized.slice(7),'base64url'));
        assert.ok(session.expires_at>Date.now()/1000);
        assert.equal(ok(await admin.auth.getUser(session.access_token)).user.id,person.userId);
        assert.match((await action('saveLink',[assignmentId,'https://example.com'],await jarFor(person,true,true))).redirect,/\/login/);
        // Revoke the real refresh session, then retry the expired access cookie.
        const revoked=await jarFor(person,true);
        ok(await person.client.auth.signOut());
        assert.match((await action('saveLink',[assignmentId,'https://example.com'],revoked)).redirect,/\/login/);
      }
    });
    await t.test('desktop/phone publishing, roster, submission, feedback and browser sign-out', {skip:!process.env.GAP_TEST_BROWSER,timeout:180000},async()=>{
      assert.ok(appUrl);
      await verifyProgramBrowser({appUrl,lead,fixture,jarFor,admin,ok,browserCohorts,action});
    });
    await t.test('roster changes override stale profiles and existing sessions',async () => {
      const memberJar=appUrl ? await jarFor(member) : null;
      await sql(`update public.approved_members set role='member' where person_id=${q(lead.personId)}`);
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'cohort_state',p_data:{id:cohortId,state:'archived'}})).error);
      await sql(`update public.approved_members set active=false where person_id=${q(member.personId)}`);
      assert.ok((await member.client.rpc('sync_profile')).error);
      assert.equal(ok(await member.client.from('submissions').select('*')).length,0);
      if(appUrl) {
        assert.match((await appPage('/admin',lead.client)).html,/GAP access required/);
        assert.match((await appPage('/',member.client)).html,/GAP access required/);
        assert.match((await action('saveLink',[assignmentId,'https://example.com/revoked'],memberJar)).redirect,/\/access-denied/);
      }
      ok(await other.client.auth.signOut());
      assert.ok((await other.client.rpc('sync_profile')).error);
    });
  } finally {
    for(const id of browserCohorts) await sql(`delete from public.submissions where enrollment_id in (select id from public.cohort_enrollments where cohort_id=${q(id)});
      delete from public.assignments where week_id in (select id from public.program_weeks where cohort_id=${q(id)});
      delete from public.program_weeks where cohort_id=${q(id)};
      delete from public.cohort_enrollments where cohort_id=${q(id)};
      delete from public.program_cohorts where id=${q(id)};`);
    if (createdCohortId) await sql(`delete from public.program_weeks where cohort_id=${q(createdCohortId)};
      delete from public.cohort_enrollments where cohort_id=${q(createdCohortId)};
      delete from public.program_cohorts where id=${q(createdCohortId)};`);
    await sql(`delete from public.submissions where assignment_id=${q(assignmentId)} and supersedes_submission_id is not null;
      delete from public.submissions where assignment_id=${q(assignmentId)};
      delete from public.assignments where week_id=${q(weekId)};
      delete from public.program_weeks where cohort_id=${q(cohortId)};
      delete from public.cohort_enrollments where cohort_id=${q(cohortId)};
      delete from public.program_cohorts where id=${q(cohortId)};`);
    for(const f of fixtures) {
      ok(await admin.auth.admin.deleteUser(f.userId));
      await sql(`delete from public.approved_members where person_id=${q(f.personId)};delete from public.people where id=${q(f.personId)};`);
    }
  }
});
