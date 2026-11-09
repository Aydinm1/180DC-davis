import { openAssignmentEditor } from './lib/week-editor.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,opts),anon=createClient(config.API_URL,config.ANON_KEY,opts);
const ok=r=>{assert.ifError(r.error);return r.data;},q=v=>`'${String(v).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),foreignCohort=randomUUID(),week=randomUUID(),assignment=randomUUID(),individual=randomUUID(),second=randomUUID(),users=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role='member',settings={}){
 const email=`gap-team-brief-${randomUUID()}@${settings.domain??'ucdavis.edu'}`,person=randomUUID(),enrollment=randomUUID();
 const id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},${q(settings.name??'Team Fixture')});insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},${q(settings.name??'Team Fixture')},${q(role)},${settings.active!==false});`);
 if(role!=='viewer')await sql(`insert into public.cohort_enrollments(id,person_id,cohort_id,is_test) values(${q(enrollment)},${q(person)},${q(cohort)},${!!settings.test})`);
 const client=createClient(config.API_URL,config.ANON_KEY,opts),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
 if(settings.active!==false&&(!settings.domain||settings.domain==='ucdavis.edu'))ok(await client.rpc('sync_profile'));
 return{id,person,enrollment,email,client};
}
async function cookies(user){
 const jar=new Map(),ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});
 ok(await ssr.auth.setSession(ok(await user.client.auth.getSession()).session));return [...jar].map(([name,value])=>({name,value,url:app}));
}
const body=process.env.GAP_TEST_BRIEF_SOURCE?await readFile(process.env.GAP_TEST_BRIEF_SOURCE,'utf8'):'# Team-specific strategy\n\n## Your consulting question\n\n**Under which conditions is the proposed membership viable?**\n\n## Research\n\n- Compare published offers.\n- Label assumptions clearly.\n\n| Input | Meaning | Source |\n|---|---|---|\n| Fee | Annual price | [Reference](https://example.com) |\n| Redemption | Estimated proportion | `=B2*C2` |\n\n## Required exhibit\n\n'+('Build a scenario model and explain the evidence behind your recommendation.\n\n'.repeat(24));
const read=async(u,aid=assignment,team)=>ok(await u.client.rpc('read_assignment_team_briefs',{p_assignment:aid,...(team?{p_team:team}:{})}));
const save=(u,team,text,version,aid=assignment,request=randomUUID())=>u.client.rpc('save_assignment_team_brief',{p_assignment:aid,p_team:team,p_instructions:text,p_version:version,p_request:request});
const teamOp=(u,action,data)=>u.client.rpc('manage_team',{p_action:action,p_data:data});
test('private assignment/team briefs preserve ordinary team work',async t=>{
 try {
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2978,'2978-09-01','2978-12-01','active'),(${q(foreignCohort)},'fall',2979,'2979-09-01','2979-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},3,'Team briefs','Disposable local fixture',false);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(assignment)},${q(week)},'Team analysis','Shared Week 3 instructions',now()+interval '1 day',1,'team'),(${q(second)},${q(week)},'Other team analysis','Other instructions',now()+interval '1 day',2,'team'),(${q(individual)},${q(week)},'Individual assignment','Individual instructions',now()+interval '1 day',3,'individual')`);
  const lead=await fixture('admin'),a=await fixture(),mate=await fixture(),b=await fixture(),tester=await fixture('member',{test:true}),unassigned=await fixture(),viewer=await fixture('viewer'),inactive=await fixture('member',{active:false}),wrong=await fixture('member',{domain:'example.com'});
  const teams=[];for(const [name,isTest,cohortId,enrollmentIds] of [['Team 1',false,cohort,[a.enrollment,mate.enrollment]],['Team 2',false,cohort,[b.enrollment]],['Test team',true,cohort,[tester.enrollment]],['Foreign team',false,foreignCohort,[]]]){
   const id=ok(await teamOp(lead,'create',{cohortId,name,isTest}));const row=ok(await root.from('cohort_teams').select('*').eq('id',id).single());if(enrollmentIds.length)ok(await teamOp(lead,'members',{id,version:row.version,enrollmentIds}));teams.push(id);
  }
  const [one,two,testTeam,foreignTeam]=teams;
  await t.test('admin-only independent briefs, exact retry and optimistic conflicts',async()=>{
   assert.ok((await anon.rpc('read_assignment_team_briefs',{p_assignment:assignment})).error);
   for(const u of [a,viewer,inactive,wrong])assert.ok((await save(u,one,'Denied',0)).error);
   assert.ok((await save(lead,foreignTeam,body,0)).error);assert.ok((await save(lead,one,body,0,individual)).error);
   assert.ok((await save(lead,one,'x'.repeat(50001),0)).error);
   const request=randomUUID();let first=ok(await save(lead,one,body,0,assignment,request));assert.equal(first.version,1);assert.deepEqual(ok(await save(lead,one,body,0,assignment,request)),first);assert.ok((await save(lead,one,'Different',0,assignment,request)).error);
   ok(await save(lead,two,'PRIVATE TEAM TWO BRIEF',0));ok(await save(lead,testTeam,'PRIVATE TEST BRIEF',0));ok(await save(lead,one,'OTHER ASSIGNMENT BRIEF',0,second));
   const concurrent=await Promise.all([save(lead,one,body+'First edit',1),save(lead,one,body+'Second edit',1)]);assert.equal(concurrent.filter(r=>!r.error).length,1);assert.equal(concurrent.find(r=>r.error).error.code,'40001');
   first=(await read(lead,assignment,one))[0];ok(await save(lead,one,body,first.version));
   assert.equal((await read(lead,second,one))[0].instructions,'OTHER ASSIGNMENT BRIEF');
   assert.equal(await sql(`select c.relrowsecurity and not has_table_privilege('authenticated',c.oid,'SELECT') and not has_table_privilege('service_role',c.oid,'SELECT') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname='assignment_team_briefs'`),'t');
   assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(assignment)}`),'0');
  });
  await t.test('draft privacy, own-team reads, Test separation and live access',async()=>{
   assert.ok((await a.client.rpc('read_assignment_team_briefs',{p_assignment:assignment})).error);ok(await root.from('program_weeks').update({published:true}).eq('id',week));
   for(const u of [a,mate]){const rows=await read(u);assert.equal(rows.length,1);assert.equal(rows[0].teamId,one);assert.equal(rows[0].instructions,body);assert.ok(!JSON.stringify(rows).includes('PRIVATE TEAM TWO'));}
   assert.equal((await read(b))[0].instructions,'PRIVATE TEAM TWO BRIEF');assert.equal((await read(tester))[0].instructions,'PRIVATE TEST BRIEF');assert.deepEqual(await read(unassigned),[]);
   for(const u of [viewer,inactive,wrong])assert.ok((await u.client.rpc('read_assignment_team_briefs',{p_assignment:assignment})).error);
   assert.ok((await a.client.rpc('read_assignment_team_briefs',{p_assignment:assignment,p_team:two})).error);
   await sql(`update public.approved_members set active=false where person_id=${q(a.person)}`);assert.ok((await a.client.rpc('read_assignment_team_briefs',{p_assignment:assignment})).error);await sql(`update public.approved_members set active=true where person_id=${q(a.person)};update public.cohort_enrollments set participation_status='withdrew' where id=${q(b.enrollment)}`);assert.ok((await b.client.rpc('read_assignment_team_briefs',{p_assignment:assignment})).error);await sql(`update public.cohort_enrollments set participation_status='enrolled' where id=${q(b.enrollment)}`);
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await save(lead,one,'Denied',3)).error);assert.deepEqual(await read(lead),[]);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
  });
  await t.test('briefs do not change team submission, completion or membership rules',async()=>{
   ok(await a.client.rpc('submit_response',{p_assignment:assignment,p_type:'text',p_value:'Shared fixture analysis',p_request:randomUUID()}));const s=ok(await root.from('submissions').select('*').eq('assignment_id',assignment).eq('is_current',true).single());
   assert.equal(s.team_id,one);assert.equal(s.status,'submitted');assert.equal((await read(mate))[0].instructions,body);
   ok(await lead.client.rpc('review_submission',{p_data:{id:s.id,status:'completed',feedback:'Approved fixture analysis',expectedUpdatedAt:s.updated_at}}));assert.equal(ok(await root.from('submissions').select('status').eq('id',s.id).single()).status,'completed');
   const team=ok(await root.from('cohort_teams').select('*').eq('id',one).single());assert.ok(team.locked);assert.ok((await teamOp(lead,'members',{id:one,version:team.version,enrollmentIds:[]})).error);
   ok(await root.from('program_weeks').update({published:false}).eq('id',week));assert.ok((await root.from('assignments').update({workflow:'guided'}).eq('id',second)).error);
   let brief=(await read(lead,second,one))[0];ok(await save(lead,one,' \n\t',brief.version,second));ok(await root.from('assignments').update({submission_mode:'individual'}).eq('id',second));ok(await root.from('assignments').update({submission_mode:'team'}).eq('id',second));
   ok(await root.from('program_weeks').update({published:true}).eq('id',week));
  });
  await t.test('desktop/phone editing, long brief/table, preview, privacy and retained drafts',{skip:!app},async()=>{
   const working=(await read(lead,second,one))[0];ok(await save(lead,one,'## Working brief\n\nPrepare one shared response.',working.version,second));
   const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const screenshots=await mkdtemp(join(tmpdir(),'gap-team-briefs-'));
   try{for(const width of [1280,390]){
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(lead));const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);await openAssignmentEditor(page,assignment,'Instructions');await page.locator('summary:visible').filter({hasText:/^Team briefs$/}).click();const editor=page.locator('details').filter({has:page.getByRole('combobox',{name:'Team brief team',exact:true})});await page.getByRole('combobox',{name:'Team brief team',exact:true}).selectOption(one);
    await editor.getByLabel('Team-specific instructions',{exact:true}).fill(body+'\nSaved from browser '+width);page.once('dialog',d=>d.dismiss());await page.getByRole('combobox',{name:'Team brief team',exact:true}).selectOption(two);
    if(await page.getByRole('combobox',{name:'Team brief team',exact:true}).inputValue()!==one)throw new Error('Unsaved team selection was not retained');
    const before=(await read(lead,assignment,one))[0];ok(await save(lead,one,body+'\nOther admin edit',before.version));
    await editor.getByRole('button',{name:'Save team brief',exact:true}).click();await page.getByText('This team brief changed. Copy your edits before reloading',{exact:true}).waitFor();assert.equal(await editor.getByLabel('Team-specific instructions',{exact:true}).inputValue(),body+'\nSaved from browser '+width);
    page.once('dialog',d=>d.accept());await page.reload();await openAssignmentEditor(page,assignment,'Instructions');await page.locator('summary:visible').filter({hasText:/^Team briefs$/}).click();await page.getByRole('combobox',{name:'Team brief team',exact:true}).selectOption(one);await editor.getByLabel('Team-specific instructions',{exact:true}).fill(body+'\nSaved from browser '+width);
    await editor.getByRole('button',{name:'Save team brief',exact:true}).click();await page.getByText('Team brief saved.',{exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Team brief team',exact:true}).inputValue(),one);
    await page.getByRole('combobox',{name:'Team brief team',exact:true}).selectOption(two);assert.equal(await editor.getByLabel('Team-specific instructions',{exact:true}).inputValue(),'PRIVATE TEAM TWO BRIEF');await page.screenshot({path:join(screenshots,`editor-${width}.png`),fullPage:true});
    await page.goto(`${app}/admin/preview/week/3/assignments/${assignment}?cohort=${cohort}`);await page.getByRole('combobox',{name:'Sample team',exact:true}).selectOption(two);await page.getByText('PRIVATE TEAM TWO BRIEF',{exact:true}).waitFor();await page.getByRole('combobox',{name:'Sample team',exact:true}).selectOption(one);await page.getByRole('heading',{name:/^Your consulting question$/i}).waitFor();
    const member=await browser.newContext({viewport:{width,height:900}});await member.addCookies(await cookies(mate));const mp=await member.newPage();await mp.goto(`${app}/week/3/assignments/${assignment}`);await mp.getByRole('button',{name:'Instructions',exact:true}).click();await mp.getByRole('heading',{name:/^Your consulting question$/i}).waitFor();assert.equal(await mp.locator('table').count(),1);assert.equal(await mp.getByText('PRIVATE TEAM TWO BRIEF',{exact:true}).count(),0);assert.ok(!(await mp.content()).includes('PRIVATE TEST BRIEF'));assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:join(screenshots,`member-${width}.png`),fullPage:true});
    await mp.getByRole('region',{name:'Instruction table',exact:true}).focus();assert.equal(await mp.getByRole('region',{name:'Instruction table',exact:true}).evaluate(el=>el===document.activeElement),true);
    await mp.goto(`${app}/week/3/assignments/${second}`);await mp.getByRole('button',{name:'Open workspace →',exact:true}).click();await mp.getByRole('button',{name:'Submit assignment',exact:true}).click();await mp.getByRole('button',{name:/^Write response/}).click();await mp.getByLabel('Your response',{exact:true}).fill('Local shared-response draft');await mp.getByRole('button',{name:'Instructions',exact:true}).click();await mp.getByRole('heading',{name:'Working brief',exact:true}).waitFor();await mp.getByRole('button',{name:'Workspace',exact:true}).click();assert.equal(await mp.getByLabel('Your response',{exact:true}).inputValue(),'Local shared-response draft');
    await page.goto(`${app}/week/3/assignments/${assignment}`);assert.ok(!(await page.content()).includes('PRIVATE TEAM TWO BRIEF'));
    await member.close();assert.deepEqual(errors,[]);await ctx.close();
   }
   const vc=await browser.newContext();await vc.addCookies(await cookies(viewer));const vp=await vc.newPage();await vp.goto(`${app}/explore/week/3/assignments/${assignment}?cohort=${cohort}`);const html=await vp.content();assert.ok(!html.includes('PRIVATE TEAM TWO BRIEF')&&!html.includes('Your consulting question')&&!html.includes('PRIVATE TEST BRIEF'));await vc.close();console.log('Team brief screenshots: '+screenshots);
   }finally{await browser.close();}
   assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(second)}`),'0');
  });
  await t.test('forged application saves cannot mutate team briefs',{skip:!app},async()=>{
   const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));const action=Object.entries(manifest.node).find(([,v])=>v.exportedName==='saveTeamBrief')?.[0];assert.ok(action);
   const before=JSON.stringify(await read(lead));
   for(const u of [null,a,viewer,inactive,wrong]){const jar=u?await cookies(u):[];const r=await fetch(`${app}/week/3/assignments/${assignment}`,{method:'POST',redirect:'manual',headers:{'next-action':action,'content-type':'text/plain;charset=UTF-8',origin:app,cookie:jar.map(c=>c.name+'='+c.value).join('; ')},body:JSON.stringify([assignment,two,'Forged brief',0,randomUUID()])});const text=await r.text();assert.ok(r.status>=300||/login|access-denied/.test(text));assert.ok(!text.includes('PRIVATE TEAM TWO BRIEF'));}
   assert.equal(JSON.stringify(await read(lead)),before);
  });
 }finally{
  await sql(`delete from private.submission_requests where actor_id in(${users.map(u=>q(u.id)).join(',')||'null'});delete from public.submissions where assignment_id in(${q(assignment)},${q(second)},${q(individual)});delete from public.submission_targets where assignment_id in(${q(assignment)},${q(second)},${q(individual)});delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.team_memberships where team_id in(select id from public.cohort_teams where cohort_id in(${q(cohort)},${q(foreignCohort)}));delete from public.cohort_teams where cohort_id in(${q(cohort)},${q(foreignCohort)});delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id in(${q(cohort)},${q(foreignCohort)})`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
 }
});
