import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const exec=promisify(execFile);
const config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),anon=createClient(config.API_URL,config.ANON_KEY,options);
const ok=r=>{assert.ifError(r.error);return r.data;},q=s=>`'${String(s).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),otherCohort=randomUUID(),week=randomUUID(),draft=randomUUID(),otherWeek=randomUUID(),users=[];
const app=process.env.GAP_TEST_APP_URL;
if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role='member',{active=true,approved=true,domain='ucdavis.edu',participation='enrolled',target=cohort}={}){
 const email=`gap-attendance-test-${randomUUID()}@${domain}`,person=randomUUID(),enrollment=randomUUID();
 const user=ok(await root.auth.admin.createUser({email,email_confirm:true})).user;users.push({id:user.id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(user.id)},${q(user.id)},jsonb_build_object('sub',${q(user.id)},'email',${q(email)},'email_verified',true),'google',now(),now());
 insert into public.people(id,email,full_name) values(${q(person)},${q(email)},${q(role==='admin'?'Attendance Lead':'Attendance Member')});
 ${approved?`insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Attendance Test',${q(role)},${active});`:''}
 insert into public.cohort_enrollments(id,person_id,cohort_id,participation_status) values(${q(enrollment)},${q(person)},${q(target)},${q(participation)});`);
 const link=ok(await root.auth.admin.generateLink({type:'magiclink',email})),client=createClient(config.API_URL,config.ANON_KEY,options);
 ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
 if(active&&approved&&domain==='ucdavis.edu')ok(await client.rpc('sync_profile'));
 return{id:user.id,person,enrollment,client};
}
async function jar(user,expired=false){
 const cookies=new Map(),session=ok(await user.client.auth.getSession()).session;
 const client=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>cookies.set(c.name,c.value))}});
 ok(await client.auth.setSession(session));
 if(expired){
  const [header,body]=session.access_token.split('.');const unsigned=`${header}.${Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(body,'base64url')),exp:1})).toString('base64url')}`;
  const access_token=`${unsigned}.${createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url')}`;
  const name=[...cookies.keys()][0].replace(/\.\d+$/,'');return new Map([[name,'base64-'+Buffer.from(JSON.stringify({...session,access_token,refresh_token:'invalid-attendance-refresh',expires_at:1,expires_in:0})).toString('base64url')]]);
 }return cookies;
}
const call=(client,action,data={})=>client.rpc('attendance',{p_action:action,p_data:data});
const snapshot=()=>sql(`select jsonb_build_object('records',(select coalesce(jsonb_agg(r order by r.id),'[]') from public.attendance_records r join public.attendance_sessions s on s.id=r.session_id where s.week_id in (${q(week)},${q(draft)},${q(otherWeek)})),'history',(select coalesce(jsonb_agg(h order by h.id),'[]') from private.attendance_history h join public.attendance_sessions s on s.id=h.session_id where s.week_id in (${q(week)},${q(draft)},${q(otherWeek)})))`);
let sessionId,code;
async function session(lead){const data=ok(await call(lead.client,'admin_read',{cohortId:cohort}));const s=data.sessions.find(s=>s.week_id===week);sessionId=s?.id;code=s?.code;return s;}
async function action(input,cookies=new Map()){
 const manifest=JSON.parse(await readFile(process.env.GAP_TEST_ACTION_MANIFEST||'.next/server/server-reference-manifest.json','utf8'));
 const id=Object.entries(manifest.node).find(([,e])=>e.exportedName==='saveAttendance')?.[0];assert.ok(id);
 const response=await fetch(`${app}/attendance/${sessionId}`,{method:'POST',redirect:'manual',headers:{'next-action':id,'content-type':'text/plain;charset=UTF-8',origin:app,cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify([input])});
 return{body:await response.text(),redirect:response.headers.get('x-action-redirect')??''};
}
test('Workshop materials and attendance lifecycle, security and browser story',async t=>{
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'spring',2986,'2986-04-01','2986-06-01','active'),(${q(otherCohort)},'winter',2986,'2986-01-01','2986-03-01','active');
   insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Workshop test','Disposable attendance workshop',true),(${q(draft)},${q(cohort)},2,'Private workshop','Hidden draft',false),(${q(otherWeek)},${q(otherCohort)},1,'Other workshop','Other cohort',true);`);
  const lead=await fixture('admin'),member=await fixture(),other=await fixture(),inactive=await fixture('member',{active:false}),unapproved=await fixture('member',{approved:false}),wrong=await fixture('member',{domain:'example.com'}),withdrawn=await fixture('member',{participation:'withdrew'}),cross=await fixture('member',{target:otherCohort});
  await t.test('Workshop resource labels/order persist and drafts remain private',async()=>{
   ok(await lead.client.rpc('save_program_week',{p_data:{id:week,title:'Workshop test',description:'Disposable attendance workshop',publicationState:'published',assignments:[],resources:[{title:'Workshop exercise',type:'workshop',url:'https://example.com/workshop',sortOrder:2},{title:'Read first',type:'reading',url:'https://example.com/reading',sortOrder:1}]}}));
   await sql(`insert into public.resources(week_id,title,resource_type,url,sort_order) values(${q(draft)},'Private workshop materials','workshop','https://example.com/private',1)`);
   assert.deepEqual(ok(await member.client.from('resources').select('resource_type').eq('week_id',week).order('sort_order')).map(r=>r.resource_type),['reading','workshop']);
   assert.equal(ok(await member.client.from('resources').select('*').eq('week_id',draft)).length,0);
   assert.equal(ok(await lead.client.from('resources').select('*').eq('week_id',draft)).length,1);
  });
  await t.test('only admins open published active workshops; redisplay retains code/window',async()=>{
   for(const client of [anon,member.client,inactive.client,unapproved.client,wrong.client])assert.ok((await call(client,'open',{weekId:week,workshopDate:'2026-10-21'})).error);
   assert.ok((await call(lead.client,'open',{weekId:draft,workshopDate:'2026-10-21'})).error);
   await sql(`update public.program_cohorts set state='draft' where id=${q(cohort)}`);assert.ok((await call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'})).error);
   await sql(`update public.program_cohorts set state='active' where id=${q(cohort)}`);
   const opened=await Promise.all([call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'}),call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'})]);opened.forEach(ok);
   const first=await session(lead);assert.match(code,/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);assert.equal(Date.parse(first.closes_at)-Date.parse(first.opened_at),7200000);
   ok(await call(lead.client,'open',{weekId:week,workshopDate:'2026-10-22'}));assert.deepEqual(await session(lead),first);
  });
  await t.test('member authorization, private codes, forged identities and direct writes are denied',async()=>{
   const before=await snapshot();
   for(const client of [anon,inactive.client,unapproved.client,wrong.client,withdrawn.client,cross.client])assert.ok((await call(client,'check_in',{sessionId,code})).error);
   for(const client of [member.client,other.client]){
    assert.ok((await call(client,'admin_read',{cohortId:cohort})).error);
    assert.ok((await call(client,'close',{sessionId})).error);
    assert.ok((await call(client,'correct',{sessionId,enrollmentId:member.enrollment,present:true,expectedUpdatedAt:null})).error);
    assert.ok((await call(client,null,{sessionId,code})).error);
    assert.ok((await client.from('attendance_records').insert({session_id:sessionId,enrollment_id:member.enrollment,present:true,recorded_at:new Date().toISOString()})).error);
    assert.ok((await client.from('attendance_sessions').update({closed_at:new Date().toISOString()}).eq('id',sessionId)).error);
    const rows=ok(await client.from('attendance_sessions').select('*').eq('id',sessionId));assert.equal(rows.length,1);assert.equal('code' in rows[0],false);
   }
   assert.equal(ok(await cross.client.from('attendance_sessions').select('*').eq('id',sessionId)).length,0);
   const privateResult=await member.client.schema('private').from('attendance_codes').select('*');assert.ok(privateResult.error);
   assert.equal(await snapshot(),before);
  });
  await t.test('bad codes persist rate limits; spaces/hyphens normalize; duplicate/concurrent receipts are stable',async()=>{
   for(let i=0;i<10;i++)assert.match(ok(await call(member.client,'check_in',{sessionId,code:'ZZZZZZ'})).error,/not valid/);
   assert.match(ok(await call(member.client,'check_in',{sessionId,code})).error,/Too many/);
   await sql(`update private.attendance_attempts set failed_at=clock_timestamp()-interval '6 minutes' where session_id=${q(sessionId)} and person_id=${q(member.person)}`);
   const normalized=code.toLowerCase().split('').join(' - ');
   const results=await Promise.all([call(member.client,'check_in',{sessionId,code:normalized,enrollmentId:other.enrollment}),call(member.client,'check_in',{sessionId,code:normalized})]);
   const [a,b]=results.map(ok);assert.equal(a.id,b.id);assert.equal(a.enrollment_id,member.enrollment);
   assert.deepEqual(ok(await call(member.client,'check_in',{sessionId,code:'BAD'})),a);
   assert.equal(ok(await other.client.from('attendance_records').select('*').eq('id',a.id)).length,0);
   assert.equal(await sql(`select count(*) from private.attendance_history where session_id=${q(sessionId)}`),'1');
  });
  await t.test('closing/expiry/reopening retain receipts and corrections record actor/history with stale protection',async()=>{
   const old=await session(lead);ok(await call(lead.client,'close',{sessionId}));assert.match(ok(await call(other.client,'check_in',{sessionId,code})).error,/closed/);
   const receipt=ok(await call(member.client,'check_in',{sessionId,code}));assert.ok(receipt.present);
   const undo=ok(await call(lead.client,'correct',{sessionId,enrollmentId:member.enrollment,present:false,expectedUpdatedAt:receipt.updated_at}));assert.equal(undo.present,false);
   assert.equal((await call(lead.client,'correct',{sessionId,enrollmentId:member.enrollment,present:true,expectedUpdatedAt:receipt.updated_at})).error.code,'40001');
   const mark=ok(await call(lead.client,'correct',{sessionId,enrollmentId:member.enrollment,present:true,expectedUpdatedAt:undo.updated_at}));assert.ok(mark.present);
   ok(await call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'}));const reopened=await session(lead);assert.equal(reopened.id,old.id);assert.notEqual(reopened.code,old.code);
   assert.equal(ok(await call(member.client,'check_in',{sessionId,code})).id,mark.id);
   await sql(`with stamp as materialized(select clock_timestamp() t) update public.attendance_sessions set opened_at=stamp.t-interval '3 hours',closes_at=stamp.t-interval '1 hour' from stamp where id=${q(sessionId)}`);
   assert.match(ok(await call(other.client,'check_in',{sessionId,code})).error,/closed/);
   ok(await call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'}));await session(lead);
   const before=await snapshot();await sql(`begin;select set_config('request.jwt.claim.sub',${q(lead.id)},true);select public.attendance('correct',jsonb_build_object('sessionId',${q(sessionId)},'enrollmentId',${q(other.enrollment)},'present',true));rollback;`);assert.equal(await snapshot(),before);
   const history=ok(await call(lead.client,'admin_read',{cohortId:cohort})).history;assert.equal(history.filter(h=>h.source==='admin').length,2);assert.ok(history.filter(h=>h.source==='admin').every(h=>h.actor_id===lead.id));
   const raced=await Promise.all([call(other.client,'check_in',{sessionId,code}),call(lead.client,'close',{sessionId})]);raced.forEach(ok);
   const changed=ok(await other.client.from('attendance_records').select('*').eq('session_id',sessionId));assert.ok(changed.length<=1);
   const leadEmail=await sql(`select email from public.people where id=${q(lead.person)}`);assert.ok(leadEmail.includes('@ucdavis.edu'));
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await call(lead.client,'admin_read',{cohortId:cohort})).error);assert.ok((await call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'})).error);
   await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
  });
  await t.test('HTTP action and landing boundaries reject unauthorized/stale/malformed requests',{skip:!app},async()=>{
   await fetch(`${app}/attendance/${sessionId}`);
   const before=await snapshot();
   assert.match((await action({action:'check_in',sessionId,code})).redirect,/\/login/);
   for(const user of [inactive,unapproved,wrong])assert.match((await action({action:'check_in',sessionId,code},await jar(user))).redirect,/access-denied/);
   assert.match((await action({action:'check_in',sessionId,code},await jar(member,true))).redirect,/\/login/);
   for(const user of [withdrawn,cross])assert.match((await action({action:'check_in',sessionId,code},await jar(user))).body,/error/);
   assert.match((await action({action:'correct',sessionId,enrollmentId:member.enrollment,present:false,expectedUpdatedAt:null},await jar(member))).redirect,/access-denied/);
   for(const input of [null,{}, {action:'unknown'}, {action:'open',weekId:week,workshopDate:'2026-02-31'}, {action:'correct',sessionId,enrollmentId:member.enrollment,present:'false'}, {action:'close',sessionId:'forged'}])assert.match((await action(input,await jar(lead))).body,/error/);
   const publicHtml=await (await fetch(`${app}/attendance/${sessionId}`)).text();assert.ok(!publicHtml.includes(code));assert.ok(!publicHtml.includes('Workshop test'));assert.ok(publicHtml.includes('Sign in'));
   assert.equal(await snapshot(),before);
  });
  await t.test('returning enrollment histories and live deactivation remain separate',async()=>{
   ok(await call(lead.client,'open',{weekId:otherWeek,workshopDate:'2026-10-21'}));
   const second=ok(await call(lead.client,'admin_read',{cohortId:otherCohort})).sessions[0];
   assert.ok((await call(member.client,'check_in',{sessionId:second.id,code:second.code})).error);
   const enrollment=randomUUID();await sql(`insert into public.cohort_enrollments(id,person_id,cohort_id) values(${q(enrollment)},${q(member.person)},${q(otherCohort)})`);
   const receipt=ok(await call(member.client,'check_in',{sessionId:second.id,code:second.code}));assert.equal(receipt.enrollment_id,enrollment);
   assert.equal(await sql(`select count(distinct enrollment_id) from public.attendance_records where enrollment_id in(${q(member.enrollment)},${q(enrollment)})`),'2');
   await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);
   assert.ok((await call(member.client,'check_in',{sessionId:second.id,code:second.code})).error);
   assert.equal(ok(await member.client.from('attendance_records').select('*').eq('id',receipt.id)).length,0);
   if(app)assert.match((await action({action:'check_in',sessionId,code},await jar(member))).redirect,/access-denied/);
   await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
  });
  await t.test('desktop/phone QR sign-in handoff, manual code, retry, receipt and admin correction',{skip:!app},async()=>{
   await sql(`insert into public.program_weeks(id,cohort_id,week_number,title,description,published)
    select gen_random_uuid(),${q(cohort)},n,case n when 3 then 'From Data to Decisions' when 4 then 'Project Management & Crafting Recommendations' when 5 then 'Storytelling with Slides, Public Speaking & Stakeholder Management' else 'Week 6' end,'Disposable visual fixture',false from generate_series(3,6) n;`);
   const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-attendance-browser-'));
   try{for(const width of [1280,390]){
    ok(await call(lead.client,'open',{weekId:week,workshopDate:'2026-10-21'}));await session(lead);
    for(const user of [member,other]){const record=ok(await user.client.from('attendance_records').select('*').eq('session_id',sessionId).eq('enrollment_id',user.enrollment)).at(0);if(record?.present)ok(await call(lead.client,'correct',{sessionId,enrollmentId:user.enrollment,present:false,expectedUpdatedAt:record.updated_at}));}
    const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.setDefaultTimeout(20000);
    await page.goto(`${app}/attendance/${sessionId}#code=${code}`);await page.getByRole('link',{name:'Sign in to check in'}).waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),`gap-attendance:${sessionId}`),code);
    await page.getByRole('link',{name:'Sign in to check in'}).click();await page.waitForURL(/\/login\?next=/);assert.ok(!page.url().includes(code));assert.equal(await page.locator('input[name=next]').inputValue(),`/attendance/${sessionId}`);
    await ctx.addCookies([...(await jar(member))].map(([name,value])=>({name,value,url:app})));await page.goto(`${app}/attendance/${sessionId}`);await page.getByLabel('Six-character workshop code').waitFor();await page.waitForFunction(expected=>document.querySelector('#attendance-code')?.value===expected,code);
    const before=await snapshot();await page.reload();await page.getByLabel('Six-character workshop code').waitFor();assert.equal(await snapshot(),before);
    await page.getByLabel('Six-character workshop code').fill('ZZZZZZ');await page.getByRole('button',{name:'Mark me present'}).click();await page.getByRole('alert').filter({hasText:'not valid'}).waitFor();assert.equal(await page.getByLabel('Six-character workshop code').inputValue(),'ZZZZZZ');
    await page.getByLabel('Six-character workshop code').fill(code.toLowerCase());
    if(width===1280){
     const url=`${app}/attendance/${sessionId}`;
     const abort=async route=>route.request().method()==='POST'?route.abort('failed'):route.continue();
     await page.route(url,abort);await page.getByRole('button',{name:'Mark me present'}).click();await page.getByRole('alert').filter({hasText:'Could not confirm'}).waitFor();await page.unroute(url,abort);assert.equal(await page.getByLabel('Six-character workshop code').inputValue(),code.toLowerCase());
     const loseResponse=async route=>{if(route.request().method()==='POST'){await route.fetch();await route.abort('failed');}else await route.continue();};
     await page.route(url,loseResponse);await page.getByRole('button',{name:'Mark me present'}).click();await page.getByRole('alert').filter({hasText:'Could not confirm'}).waitFor();await page.unroute(url,loseResponse);
     assert.equal(ok(await member.client.from('attendance_records').select('*').eq('session_id',sessionId).eq('enrollment_id',member.enrollment)).at(0).present,true);
    }
    await page.getByRole('button',{name:'Mark me present'}).click();await page.getByRole('heading',{name:'You’re checked in'}).waitFor();await page.reload();await page.getByRole('heading',{name:'You’re checked in'}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screens,`receipt-${width}.png`),fullPage:true});
    await page.goto(`${app}/`);const checkIn=page.getByRole('link',{name:/Workshop check-in open/});await checkIn.waitFor();const continueLink=page.getByRole('link',{name:/^Continue/});await continueLink.waitFor();
    assert.equal(await page.getByText('Workshop test',{exact:true}).count(),1);await page.getByRole('heading',{name:'Week 1',exact:true}).waitFor();
    assert.equal(await page.locator('main header').getByRole('complementary',{name:'Workshop attendance'}).count(),1);
    assert.ok((await checkIn.boundingBox()).height>=44);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:join(screens,`dashboard-${width}.png`),fullPage:true});
    await checkIn.click();await page.waitForURL(`**/attendance/${sessionId}`);await page.getByRole('heading',{name:'You’re checked in'}).waitFor();
    await page.goto(`${app}/`);await page.getByRole('link',{name:/^Continue/}).click();await page.waitForURL('**/week/1');await page.getByRole('link',{name:/Workshop check-in open/}).waitFor();await page.getByRole('link',{name:/Workshop exercise/}).waitFor();
    const adminCtx=await browser.newContext({viewport:{width,height:900}});await adminCtx.addCookies([...(await jar(lead))].map(([name,value])=>({name,value,url:app})));const adminPage=await adminCtx.newPage();adminPage.setDefaultTimeout(20000);
    await adminPage.goto(`${app}/admin/attendance?cohort=${cohort}`);await adminPage.getByRole('heading',{name:'Attendance',exact:true}).waitFor();await adminPage.getByRole('img',{name:'Scan to check in for Week 1',exact:true}).waitFor();assert.match(await adminPage.getByRole('img',{name:'Scan to check in for Week 1',exact:true}).getAttribute('src'),/^data:image\/png;base64,/);
    const weekSelector=adminPage.getByRole('region',{name:'Program weeks'});
    await weekSelector.getByRole('button',{name:/Week 2.*Private workshop/}).click();
    await adminPage.getByRole('heading',{name:'Private workshop',exact:true}).waitFor();
    const firstWeek=weekSelector.getByRole('button',{name:/Week 1/});
    await firstWeek.focus();await adminPage.keyboard.press('Enter');
    await adminPage.getByRole('heading',{name:'Workshop test',exact:true}).waitFor();
    assert.doesNotMatch(await weekSelector.innerText(),/\d{4}-\d{2}-\d{2}/);
    await firstWeek.getByText('Workshop test',{exact:true}).waitFor();
    assert.match(await firstWeek.innerText(),/\d+ present/);
    assert.doesNotMatch(await adminPage.locator('main').innerText(),/Test check-ins are retained|Recorded attendance is retained|Not recorded does not mean absent|This code stays the same/);
    const unchanged=await session(lead),beforePresent=await snapshot();
    await adminPage.getByRole('button',{name:'Present check-in',exact:true}).click();
    const presentation=adminPage.getByRole('dialog',{name:'Week 1 · Workshop test',exact:true});await presentation.waitFor();
    if(width===1280)await adminPage.waitForFunction(()=>document.fullscreenElement===document.documentElement);
    assert.equal(await presentation.getByAltText('Scan to check in for Week 1').getAttribute('src'),await adminPage.locator('main').getByAltText('Scan to check in for Week 1').first().getAttribute('src'));
    await presentation.getByLabel(`Code ${code.split('').join(' ')}`,{exact:true}).waitFor();assert.equal(await presentation.getByText(/Attendance Member/).count(),0);
    assert.ok(await presentation.evaluate(el=>el.scrollWidth<=el.clientWidth));const bounds=await presentation.boundingBox();assert.equal(bounds.x,0);assert.equal(bounds.y,0);assert.equal(bounds.width,width);assert.equal(bounds.height,900);await adminPage.screenshot({path:join(screens,`presentation-${width}.png`)});
    await adminPage.setViewportSize({width,height:450});assert.ok(await presentation.evaluate(el=>el.scrollWidth<=el.clientWidth));assert.equal(await presentation.evaluate(el=>getComputedStyle(el).overflowY),'auto');await adminPage.setViewportSize({width,height:900});
    await presentation.getByRole('button',{name:'Exit presentation',exact:true}).click();await presentation.waitFor({state:'hidden'});
    await adminPage.waitForFunction(()=>!document.fullscreenElement);assert.equal(await adminPage.getByRole('button',{name:'Present check-in',exact:true}).evaluate(el=>el===document.activeElement),true);
    // Denied fullscreen still produces a full-window modal, with Escape and focus return.
    await adminPage.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Fixture fullscreen denial'));});
    await adminPage.getByRole('button',{name:'Present check-in',exact:true}).click();await presentation.waitFor();await adminPage.keyboard.press('Tab');assert.ok(await presentation.evaluate(el=>el.contains(document.activeElement)));
    await adminPage.keyboard.press('Escape');await presentation.waitFor({state:'hidden'});assert.equal(await adminPage.getByRole('button',{name:'Present check-in',exact:true}).evaluate(el=>el===document.activeElement),true);
    assert.equal(await snapshot(),beforePresent);assert.deepEqual(await session(lead),unchanged);
    await adminPage.getByRole('button',{name:'Present check-in',exact:true}).click();await presentation.waitFor();await adminPage.clock.setFixedTime(new Date(Date.parse(unchanged.closes_at)+1000));await presentation.getByRole('heading',{name:'Check-in closed',exact:true}).waitFor();assert.equal(await presentation.getByRole('img').count(),0);assert.equal(await presentation.getByLabel(`Code ${code.split('').join(' ')}`,{exact:true}).count(),0);await presentation.getByRole('button',{name:'Exit presentation',exact:true}).click();await adminPage.clock.setFixedTime(new Date());
    assert.equal(await adminPage.getByRole('button',{name:'Refresh',exact:true}).count(),0);await adminPage.reload();const search=adminPage.getByRole('searchbox',{name:'Search people'});const email=await sql(`select email from public.people where id=${q(other.person)}`);await search.fill(email);await adminPage.getByRole('button',{name:'Mark present',exact:true}).click();await adminPage.getByRole('button',{name:'Undo',exact:true}).waitFor();
    adminPage.once('dialog',d=>d.accept());await adminPage.getByRole('button',{name:'Undo',exact:true}).click();await adminPage.getByRole('button',{name:'Mark present',exact:true}).waitFor();await adminPage.reload();await search.fill(email);await adminPage.getByText('Not recorded',{exact:true}).waitFor();
    assert.ok(await adminPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await adminPage.screenshot({path:join(screens,`admin-${width}.png`),fullPage:true});
    await weekSelector.screenshot({path:join(screens,`cards-${width}.png`)});
    await adminPage.getByRole('combobox',{name:'Participation view',exact:true}).locator('..').screenshot({path:join(screens,`participation-${width}.png`)});
    await adminPage.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);await adminPage.getByRole('navigation',{name:'Week sections',exact:true}).getByRole('button',{name:'Materials',exact:true}).click();const types=adminPage.getByRole('combobox',{name:'Type',exact:true});await types.first().waitFor();assert.equal(await types.count(),2);assert.equal(await types.nth(1).inputValue(),'workshop');await types.nth(0).selectOption('workshop');await adminPage.getByRole('navigation',{name:'Week sections',exact:true}).getByRole('button',{name:'Overview',exact:true}).click();await adminPage.getByLabel(/^Description/).fill(`Disposable attendance workshop ${width}`);await adminPage.getByRole('button',{name:'Save changes',exact:true}).click();await adminPage.getByText('Week published.',{exact:true}).waitFor();await adminPage.reload();await adminPage.getByRole('navigation',{name:'Week sections',exact:true}).getByRole('button',{name:'Materials',exact:true}).click();assert.equal(await types.nth(0).inputValue(),'workshop');
    await adminPage.goto(`${app}/admin/preview/week/1?cohort=${cohort}`);await adminPage.getByRole('link',{name:/Workshop exercise/}).waitFor();const materials=await adminPage.locator('#materials ol > li').allTextContents();assert.match(materials[0],/Read first/);assert.match(materials[1],/Workshop exercise/);assert.ok(materials.every(value=>value.includes('Workshop')));
    await adminPage.goto(`${app}/admin/attendance?cohort=${cohort}`);
    await adminPage.getByRole('button',{name:'Close check-in',exact:true}).click();await adminPage.getByRole('button',{name:'Reopen check-in',exact:true}).waitFor();
    assert.equal(await adminPage.getByRole('button',{name:'Present check-in',exact:true}).count(),0);
    const closedHtml=await (await adminPage.request.get(`${app}/admin/attendance?cohort=${cohort}`)).text();
    assert.ok(!closedHtml.includes('data:image/png;base64,'),'Closed sessions must not serialize QR images');
    await adminPage.screenshot({path:join(screens,`admin-closed-${width}.png`),fullPage:true});await page.goto(`${app}/attendance/${sessionId}`);await page.getByRole('heading',{name:'You’re checked in'}).waitFor();await ctx.close();await adminCtx.close();
   }console.log(`Attendance screenshots: ${screens}`);}finally{await browser.close();}
  });
 }finally{
  await sql(`delete from private.attendance_history where session_id in(select id from public.attendance_sessions where week_id in(${q(week)},${q(draft)},${q(otherWeek)}));delete from private.attendance_attempts where session_id in(select id from public.attendance_sessions where week_id in(${q(week)},${q(draft)},${q(otherWeek)}));delete from public.attendance_records where session_id in(select id from public.attendance_sessions where week_id in(${q(week)},${q(draft)},${q(otherWeek)}));delete from public.attendance_sessions where week_id in(${q(week)},${q(draft)},${q(otherWeek)});delete from public.resources where week_id in(${q(week)},${q(draft)},${q(otherWeek)});delete from public.program_weeks where cohort_id in(${q(cohort)},${q(otherCohort)});delete from public.cohort_enrollments where cohort_id in(${q(cohort)},${q(otherCohort)});delete from public.program_cohorts where id in(${q(cohort)},${q(otherCohort)});`);
  for(const user of users){await sql(`delete from public.profiles where id=${q(user.id)};delete from public.approved_members where person_id=${q(user.person)};delete from public.people where id=${q(user.person)}`);ok(await root.auth.admin.deleteUser(user.id));}
  assert.equal(await sql(`select count(*) from public.program_cohorts where id in(${q(cohort)},${q(otherCohort)})`),'0');
 }
});
