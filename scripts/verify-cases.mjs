import { openAssignmentEditor } from './lib/week-editor.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readFile,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,opts),anon=createClient(config.API_URL,config.ANON_KEY,opts);
const ok=r=>{assert.ifError(r.error);return r.data;},q=v=>`'${String(v).replaceAll("'","''")}'`;
const sql=async v=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',v])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),aid=randomUUID(),browserAid=randomUUID(),users=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
const content={overview:'Eight fictional fixture cases',closing:'Reflection on structured thinking',cases:Array.from({length:8},(_,i)=>({number:i+1,title:`Fixture case ${i+1}`,scenario:`Scenario ${i+1}`,reference:`PRIVATE REFERENCE ${i+1}`}))};
async function fixture(role='member',settings={}){
 const person=randomUUID(),enrollment=randomUUID(),email=`gap-cases-${randomUUID()}@${settings.domain??'ucdavis.edu'}`;
 const id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Case Fixture');insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Case Fixture',${q(role)},${settings.active!==false});${role==='member'?`insert into public.cohort_enrollments(id,person_id,cohort_id) values(${q(enrollment)},${q(person)},${q(cohort)});`:''}`);
 const client=createClient(config.API_URL,config.ANON_KEY,opts),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));return {client,id,person,enrollment};
}
const mutate=(u,action,data,assignment=aid,request=randomUUID())=>u.client.rpc('mutate_case_exercise',{p_action:action,p_assignment:assignment,p_data:data,p_request:request});
const read=async(u,assignment=aid,preview=false)=>ok(await u.client.rpc('read_case_exercise',{p_assignment:assignment,p_preview:preview}));
const answer=(version,n)=>({version,caseNumber:n,method:'process',framework:'Fictional process framework',priority:'Investigate the first bottleneck'});
async function cookies(user){const jar=new Map(),ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(v=>jar.set(v.name,v.value))}});ok(await ssr.auth.setSession(ok(await user.client.auth.getSession()).session));return [...jar].map(([name,value])=>({name,value,url:app}));}
test('eight-case exercise lifecycle and boundaries',async t=>{
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2953,'2953-09-01','2953-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},2,'Cases workshop','Fictional local fixture',false);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(aid)},${q(week)},'Eight-case exercise','Exercise instructions',now()+interval '1 day',1,'individual'),(${q(browserAid)},${q(week)},'Browser eight-case exercise','Exercise instructions',now()+interval '1 day',2,'individual')`);
  const lead=await fixture('admin'),member=await fixture(),other=await fixture(),viewer=await fixture('viewer'),inactive=await fixture('member',{active:false}),wrong=await fixture('admin',{domain:'example.com'});
  await t.test('configuration permission, strict input, draft secrecy and private tables',async()=>{
   for(const u of [member,viewer,inactive,wrong])assert.ok((await mutate(u,'configure',{version:0,content})).error);
   assert.ok((await anon.rpc('read_case_exercise',{p_assignment:aid})).error);
   assert.ok((await mutate(lead,'configure',{version:0,content:{...content,cases:content.cases.slice(1)}})).error);
   for(const id of [aid,browserAid])ok(await mutate(lead,'configure',{version:0,content},id));
   assert.ok((await member.client.rpc('read_case_exercise',{p_assignment:aid})).error);
   assert.equal(await sql(`select bool_and(c.relrowsecurity and not has_table_privilege('authenticated',c.oid,'SELECT') and not has_table_privilege('service_role',c.oid,'SELECT')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('case_configs','case_runs','case_answers','case_receipts')`),'t');
   ok(await root.from('program_weeks').update({published:true}).eq('id',week));
   assert.ok((await mutate(lead,'configure',{version:1,content})).error);
  });
  await t.test('hidden references, sequential flow, rollback, idempotent retry and concurrent saves',async()=>{
   assert.ok((await read(member)).cases.every(c=>!c.reference&&!c.answer));
   assert.ok((await mutate(member,'save',answer(0,2))).error);
   assert.equal(await sql(`select count(*) from private.case_runs where assignment_id=${q(aid)}`),'0');
   const data=answer(0,1),request=randomUUID();ok(await mutate(member,'save',data,aid,request));ok(await mutate(member,'save',data,aid,request));
   assert.ok((await mutate(member,'save',{...data,framework:'Changed'},aid,request)).error);
   let s=await read(member);assert.equal(s.run.version,1);assert.equal(s.cases[0].reference,'PRIVATE REFERENCE 1');assert.ok(!s.cases[1].reference);assert.ok(!s.closing);
   assert.ok((await read(other)).cases.every(c=>!c.answer&&!c.reference));
   assert.ok((await member.client.rpc('read_case_exercise',{p_assignment:aid,p_enrollment:other.enrollment})).error);
   const results=await Promise.all([mutate(member,'save',{...answer(1,1),framework:'Concurrent A'}),mutate(member,'save',{...answer(1,1),framework:'Concurrent B'})]);assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.filter(r=>r.error?.code==='40001').length,1);
   s=await read(member);assert.ok((await mutate(member,'finish',{version:s.run.version,caseNumber:8})).error);
   assert.ok((await member.client.rpc('submit_response',{p_assignment:aid,p_type:'link',p_value:'https://example.com',p_request:randomUUID()})).error);
   assert.ok((await root.rpc('file_upload',{p_actor:member.id,p_action:'prepare',p_data:{assignmentId:aid,name:'exercise.pdf',size:100,mime:'application/pdf'}})).error);
   assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(aid)}`),'0');
  });
  await t.test('editable responses until Finish, automatic completion without submission and immutable receipt',async()=>{
   for(let n=1;n<=8;n++){
    let s=await read(member);if(n>1)ok(await mutate(member,'save',answer(s.run.version,n)));
    s=await read(member);assert.equal(s.cases[n-1].reference,`PRIVATE REFERENCE ${n}`);
    if(n<8)ok(await mutate(member,'next',{version:s.run.version,caseNumber:n}));
   }
   let s=await read(member);ok(await mutate(member,'save',{...answer(s.run.version,1),framework:'Edited after all eight references'}));
   s=await read(member);const d={version:s.run.version,caseNumber:8},id=randomUUID();ok(await mutate(member,'finish',d,aid,id));ok(await mutate(member,'finish',d,aid,id));
   s=await read(member);assert.ok(s.run.completedAt);assert.ok(s.closing);assert.equal(s.cases[0].answer.framework,'Edited after all eight references');
   const time=s.run.completedAt;ok(await mutate(member,'finish',d));assert.equal((await read(member)).run.completedAt,time);
   assert.ok((await mutate(member,'save',answer(s.run.version,1))).error);
   const progress=ok(await member.client.rpc('case_progress',{p_enrollment:member.enrollment}));assert.equal(progress[0].answered,8);assert.equal(progress[0].completed_at,time);
   assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(aid)}`),'0');
   assert.ok((await member.client.rpc('case_progress')).error);assert.ok((await other.client.rpc('case_progress',{p_enrollment:member.enrollment})).error);
  });
  await t.test('Viewer, deactivation, withdrawal and role revocation remain live',async()=>{
   assert.ok((await read(viewer,aid,true)).cases.every(c=>!c.answer&&!c.reference));
   for(const u of [viewer,inactive,wrong])assert.ok((await mutate(u,'save',answer(0,1))).error);
   await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);assert.ok((await member.client.rpc('read_case_exercise',{p_assignment:aid})).error);await sql(`update public.approved_members set active=true where person_id=${q(member.person)};update public.cohort_enrollments set participation_status='withdrew' where id=${q(other.enrollment)}`);assert.ok((await mutate(other,'save',answer(0,1))).error);
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await mutate(lead,'configure',{version:1,content})).error);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
  });
  await t.test('desktop/phone save, reveal, editing, reload, Finish and preview boundaries',{skip:!app},async()=>{
   const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-cases-'));
   try{
    const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),actionId=Object.entries(manifest.node).find(([,v])=>v.exportedName==='saveCaseExercise')?.[0];assert.ok(actionId);
    await sql(`update public.program_weeks set published=false where id=${q(week)}`);
    for(const setupWidth of [1280,390]){const setup=await browser.newContext({viewport:{width:setupWidth,height:900}});await setup.addCookies(await cookies(lead));const sp=await setup.newPage();await sp.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);const panel=sp.locator('#guided-'+browserAid);await openAssignmentEditor(sp,browserAid,'Activity setup');await panel.getByLabel('Challenge overview',{exact:true}).fill('Updated browser exercise overview '+setupWidth);await panel.getByRole('navigation',{name:'Challenge sections'}).getByRole('button',{name:'Cases',exact:true}).click();await panel.getByRole('combobox',{name:'Select case',exact:true}).selectOption('2');await panel.getByRole('textbox',{name:'Case scenario',exact:true}).fill('Retained second case scenario '+setupWidth);await panel.getByRole('combobox',{name:'Select case',exact:true}).selectOption('3');await panel.getByRole('combobox',{name:'Select case',exact:true}).selectOption('2');assert.equal(await panel.getByRole('textbox',{name:'Case scenario',exact:true}).inputValue(),'Retained second case scenario '+setupWidth);await openAssignmentEditor(sp,aid,'Details');await openAssignmentEditor(sp,browserAid,'Activity setup');assert.equal(await panel.getByRole('textbox',{name:'Case scenario',exact:true}).inputValue(),'Retained second case scenario '+setupWidth);await panel.getByRole('navigation',{name:'Challenge sections'}).getByRole('button',{name:'Overview',exact:true}).click();await panel.getByRole('button',{name:'Save eight-case workflow',exact:true}).click();await panel.getByText('Eight-case workflow saved.',{exact:true}).waitFor();await sp.reload();await openAssignmentEditor(sp,browserAid,'Activity setup');assert.equal(await sp.getByLabel('Challenge overview',{exact:true}).last().inputValue(),'Updated browser exercise overview '+setupWidth);assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await sp.screenshot({path:join(screens,`admin-cases-${setupWidth}.png`),fullPage:true});await setup.close();}await sql(`update public.program_weeks set published=true where id=${q(week)}`);
    for(const width of [1280,390]){
     const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(member));const p=await ctx.newPage();await p.goto(`${app}/week/2/assignments/${browserAid}`);
     if(width===1280){
      for(let n=1;n<=8;n++){
       await p.getByRole('radio',{name:/mathematical decomposition/i}).check();await p.getByLabel('2. Break down the problem',{exact:true}).fill('Browser framework '+n);await p.getByLabel('3. What would you investigate first, and why?',{exact:true}).fill('Investigate the driver '+n);
       if(n===1){const fail=async route=>route.request().headers()['next-action']===actionId?route.abort():route.continue();await p.route('**/*',fail);await p.getByRole('button',{name:'Save & reveal reference approach',exact:true}).click();await p.getByText(/Save could not be confirmed/).waitFor();assert.equal(await p.getByLabel('2. Break down the problem',{exact:true}).inputValue(),'Browser framework 1');await p.unroute('**/*',fail);}
       await p.getByRole('button',{name:'Save & reveal reference approach',exact:true}).click();await p.getByText(`PRIVATE REFERENCE ${n}`,{exact:true}).waitFor();
       if(n<8)await p.getByRole('button',{name:'Next case →',exact:true}).click();
      }
     }
     await p.reload();await p.getByText('PRIVATE REFERENCE 8',{exact:true}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:join(screens,`cases-${width}.png`),fullPage:true});
     if(width===390){await p.getByRole('button',{name:'Edit response',exact:true}).click();await p.getByLabel('2. Break down the problem',{exact:true}).fill('Revised on phone');await p.getByRole('button',{name:'Save & reveal reference approach',exact:true}).click();await p.getByText('Revised on phone',{exact:true}).waitFor();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Finish challenge',exact:true}).click();await p.getByRole('heading',{name:'Challenge complete',exact:true}).waitFor();await p.reload();await p.getByRole('heading',{name:'Challenge complete',exact:true}).waitFor();}
     await ctx.close();
     const preview=await browser.newContext({viewport:{width,height:900}});await preview.addCookies(await cookies(lead));const pp=await preview.newPage();let writes=0;pp.on('request',r=>{if(r.headers()['next-action']===actionId||r.url().includes('/storage/'))writes++;});await pp.goto(`${app}/admin/preview/week/2/assignments/${browserAid}?cohort=${cohort}`);await pp.getByRole('radio',{name:/process decomposition/i}).check();await pp.getByLabel('2. Break down the problem',{exact:true}).fill('Practice framework');await pp.getByLabel('3. What would you investigate first, and why?',{exact:true}).fill('Practice priority');await pp.getByRole('button',{name:'Save & reveal reference approach',exact:true}).click();await pp.getByText('PRIVATE REFERENCE 1',{exact:true}).waitFor();assert.equal(writes,0);await preview.close();
    }
    const progress=await browser.newContext();await progress.addCookies(await cookies(lead));const ap=await progress.newPage();await ap.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${browserAid}`);await ap.getByText('1 of 2 complete · Automatic exercise',{exact:true}).first().waitFor();await ap.getByRole('heading',{name:'Browser eight-case exercise',level:2,exact:true}).waitFor();assert.equal(await ap.getByRole('button',{name:'Mark complete',exact:true}).count(),0);await progress.close();
    const http=await browser.newContext();for(const u of [null,viewer,inactive,wrong,member]){const jar=u?await cookies(u):[];const response=await http.request.post(app+'/admin',{headers:{origin:app,'next-action':actionId,'content-type':'text/plain;charset=UTF-8',cookie:jar.map(v=>v.name+'='+v.value).join('; ')},data:JSON.stringify(['configure',aid,{version:1,content},randomUUID()])});assert.match(response.headers()['x-action-redirect']??await response.text(),/login|access-denied/);}await http.close();
    console.log('Case exercise screenshots: '+screens);
   }finally{await browser.close();}
  });

  await t.test('admin case inspection filters progress, protects answers and never grades or mutates runs',{skip:!app},async()=>{
   await sql(`update public.cohort_enrollments set participation_status='enrolled' where id=${q(other.enrollment)};update public.people set full_name='Completed Case Participant' where id=${q(member.person)};update public.approved_members set full_name='Completed Case Participant' where person_id=${q(member.person)};`);
   for(let n=1;n<=8;n++){let s=await read(other);ok(await mutate(other,'save',answer(s.run?.version??0,n)));if(n<8){s=await read(other);ok(await mutate(other,'next',{version:s.run.version,caseNumber:n}));}}
   const tester=await fixture();await sql(`update public.cohort_enrollments set is_test=true where id=${q(tester.enrollment)}`);ok(await mutate(tester,'save',answer(0,1)));
   const fingerprint=()=>sql(`select md5(jsonb_build_object('runs',(select jsonb_agg(to_jsonb(r) order by r.id) from private.case_runs r where assignment_id in(${q(aid)},${q(browserAid)})),'answers',(select jsonb_agg(to_jsonb(a) order by a.run_id,a.case_number) from private.case_answers a join private.case_runs r on r.id=a.run_id where r.assignment_id in(${q(aid)},${q(browserAid)})),'receipts',(select count(*) from private.case_receipts where actor_id in(${users.map(u=>q(u.id)).join(',')})),'submissions',(select count(*) from public.submissions where assignment_id in(${q(aid)},${q(browserAid)})))::text)`);
   const before=await fingerprint(),{chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-case-inspection-'));
   try{
    for(const width of [1280,390]){
     const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(lead));const p=await ctx.newPage();p.setDefaultTimeout(15000);
     const errors=[];p.on('pageerror',error=>errors.push(error.message));
     await p.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${aid}`);
     const roster=p.getByRole('region',{name:'Case exercise progress',exact:true}),filters=roster.getByLabel('Filter case progress');
     await filters.getByRole('button',{name:'All participants 3',exact:true}).waitFor();
     assert.equal(await roster.getByRole('button',{name:/Awaiting review|Revisions requested|Mark complete/}).count(),0);
     const filterRequests=[];const trackFilter=request=>{if(request.method()==='GET'&&new URL(request.url()).pathname==='/admin'&&request.headers().rsc==='1'&&!request.headers()['next-router-prefetch'])filterRequests.push(request.url());};p.on('request',trackFilter);
     await filters.getByRole('button',{name:'Complete 1',exact:true}).click();await p.waitForURL(u=>u.searchParams.get('caseStatus')==='complete');assert.equal(await roster.getByRole('link',{name:/^View answers/}).count(),1);
     await roster.getByRole('searchbox',{name:'Search participants',exact:true}).pressSequentially('Completed',{delay:1});await p.waitForURL(u=>u.searchParams.get('q')==='Completed');
     assert.deepEqual(filterRequests,[],'Case filtering and search must not refetch the server page');p.off('request',trackFilter);
     await roster.getByRole('link',{name:/^View answers/}).first().click();
     await p.getByRole('heading',{name:'Completed Case Participant',level:1,exact:true}).waitFor();
     await p.getByText('Edited after all eight references',{exact:true}).waitFor();await p.getByText('PRIVATE REFERENCE 1',{exact:true}).waitFor();
     assert.equal(await p.getByRole('button',{name:/Save review|Mark complete|Finish challenge/}).count(),0);
     await p.getByRole('navigation',{name:'Cases',exact:true}).getByRole('button',{name:'Case 2 · Saved',exact:true}).click();
     await p.getByText('PRIVATE REFERENCE 2',{exact:true}).waitFor();await p.getByText('Fictional process framework',{exact:true}).waitFor();
     assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:join(screens,`response-${width}.png`),fullPage:true});
     await p.reload();await p.getByText('Edited after all eight references',{exact:true}).waitFor();
     await p.getByRole('link',{name:'← Case progress',exact:true}).click();await p.waitForURL(u=>u.pathname==='/admin');
     assert.equal(new URL(p.url()).searchParams.get('caseStatus'),'complete');assert.equal(new URL(p.url()).searchParams.get('q'),'Completed');
     await filters.getByRole('button',{name:'Complete 1',exact:true}).waitFor();await roster.getByRole('searchbox',{name:'Search participants',exact:true}).fill('');await p.waitForURL(u=>!u.searchParams.has('q'));
     await filters.getByRole('button',{name:'In progress 1',exact:true}).click();await roster.getByText('8 of 8 cases saved',{exact:true}).waitFor();
     await filters.getByRole('button',{name:'Not started 1',exact:true}).click();await p.waitForURL(u=>u.searchParams.get('caseStatus')==='not_started');await roster.getByText('0 of 8 cases saved',{exact:true}).waitFor();await roster.getByRole('link',{name:/^View answers/}).click();await p.getByText('No saved response for this case.',{exact:true}).waitFor();
     await p.getByRole('link',{name:'← Case progress',exact:true}).click();await filters.getByRole('button',{name:'All participants 3',exact:true}).click();await p.waitForURL(u=>u.searchParams.get('caseStatus')==='all');
     await p.getByRole('combobox',{name:'Participation view',exact:true}).selectOption('test');await filters.getByRole('button',{name:'All participants 1',exact:true}).waitFor();await filters.getByRole('button',{name:'In progress 1',exact:true}).waitFor();
     await roster.getByRole('link',{name:/^View answers/}).click();await p.getByText('Test participant',{exact:true}).waitFor();await p.getByRole('link',{name:'← Case progress',exact:true}).click();await p.waitForURL(u=>u.pathname==='/admin');assert.equal(new URL(p.url()).searchParams.get('audience'),'test');
     assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:join(screens,`progress-${width}.png`),fullPage:true});assert.deepEqual(errors,[]);await ctx.close();
    }
    const http=await browser.newContext(),path=`/admin/cases/${aid}/${member.enrollment}?cohort=${cohort}`;
    for(const u of [null,member,viewer,inactive,wrong]){
     const jar=u?await cookies(u):[],r=await http.request.get(app+path,{headers:{cookie:jar.map(c=>c.name+'='+c.value).join('; ')}}),body=await r.text();
     assert.match(body,/Continue with Google|GAP access required|NEXT_REDIRECT;replace;\/(?:login|access-denied)/);assert.ok(!body.includes('Edited after all eight references')&&!body.includes('PRIVATE REFERENCE 1'));
    }
    const jar=await cookies(lead),headers={cookie:jar.map(c=>c.name+'='+c.value).join('; ')};
    for(const route of [`/admin/cases/${aid}/${randomUUID()}`,`/admin/cases/${aid}/${member.enrollment}?cohort=${randomUUID()}`,`/admin/cases/not-an-id/${member.enrollment}`]){
     const body=await(await http.request.get(app+route,{headers})).text();assert.match(body,/This page could not be found/);assert.ok(!body.includes('Edited after all eight references'));
    }
    await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);
    try{const body=await(await http.request.get(app+path,{headers})).text();assert.match(body,/GAP access required|NEXT_REDIRECT;replace;\/access-denied/);assert.ok(!body.includes('Edited after all eight references'));assert.ok((await lead.client.rpc('read_case_exercise',{p_assignment:aid,p_enrollment:member.enrollment})).error);}
    finally{await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);}
    await http.close();assert.equal(await fingerprint(),before,'Inspection must not change answers, finish times, receipts or submissions');
    console.log('Case inspection screenshots: '+screens);
   }finally{await browser.close();}
  });
 }finally{
  await sql(`delete from private.case_receipts where actor_id in(${users.map(u=>q(u.id)).join(',')||'null'});delete from private.case_answers where run_id in(select id from private.case_runs where assignment_id in(${q(aid)},${q(browserAid)}));delete from private.case_runs where assignment_id in(${q(aid)},${q(browserAid)});delete from private.case_configs where assignment_id in(${q(aid)},${q(browserAid)});delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)}`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
  assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
 }
});
