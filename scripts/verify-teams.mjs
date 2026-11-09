import {showReview} from './lib/review-workspace.mjs';
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
import {pdf} from '../test/upload-fixtures.mjs';
import sharp from 'sharp';
import {readMemberRows} from '../src/lib/supabase/member-rows.ts';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,opts),anon=createClient(config.API_URL,config.ANON_KEY,opts);
const ok=r=>{assert.ifError(r.error);return r.data;},q=v=>`'${String(v).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),assignment=randomUUID(),individual=randomUUID(),uploadAssignment=randomUUID(),users=[],paths=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role='member',settings={}){
 const email=`gap-team-${randomUUID()}@${settings.domain??'ucdavis.edu'}`,person=randomUUID(),enrollment=randomUUID();
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
const response=(u,value,{aid=assignment,id,version,request=randomUUID(),type='text'}={})=>u.client.rpc('submit_response',{p_assignment:aid,p_type:type,p_value:value,p_request:request,p_expected:id,p_version:version});
const current=async()=>ok(await root.from('submissions').select('*').eq('assignment_id',assignment).eq('is_current',true).single());
const teamOp=(lead,action,data)=>lead.client.rpc('manage_team',{p_action:action,p_data:data});
const file=(u,action,data={},intent)=>root.rpc('file_upload',{p_actor:u.id,p_action:action,p_data:data,p_intent:intent});

test('admin-assigned teams share one private submission without altering individual history',async t=>{
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2988,'2988-09-01','2988-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Teams fixture','Disposable teamwork',true);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(assignment)},${q(week)},'Shared research','Submit one response for your team',now()+interval '1 day',1,'team'),(${q(individual)},${q(week)},'Individual research','Individual response',now()+interval '1 day',2,'individual'),(${q(uploadAssignment)},${q(week)},'Team upload','Team upload response',now()+interval '1 day',3,'team');`);
  const lead=await fixture('admin',{name:'Lead Fixture'}),a=await fixture('member',{name:'Alice Fixture'}),b=await fixture('member',{name:'Bob Fixture'}),outsider=await fixture('member',{name:'Outsider Fixture'}),tester=await fixture('member',{test:true}),viewer=await fixture('viewer'),inactive=await fixture('member',{active:false}),wrong=await fixture('member',{domain:'example.com'});
  let team;
  const teamRow=async()=>ok(await root.from('cohort_teams').select('*').eq('id',team).single());
  const members=async ids=>teamOp(lead,'members',{id:team,version:(await teamRow()).version,enrollmentIds:ids});
  await t.test('only admins assign teams; cohort/test boundaries and membership versions are enforced',async()=>{
   for(const u of [a,b,viewer,inactive,wrong])assert.ok((await teamOp(u,'create',{cohortId:cohort,name:'Denied',isTest:false})).error);
   assert.ok((await anon.rpc('manage_team',{p_action:'create',p_data:{cohortId:cohort,name:'Denied',isTest:false}})).error);
   assert.ok((await response(a,'No team')).error);
   team=ok(await teamOp(lead,'create',{cohortId:cohort,name:'Research Team',isTest:false}));
   assert.ok((await members([a.enrollment,tester.enrollment])).error);ok(await members([a.enrollment,b.enrollment]));
   assert.ok((await teamOp(lead,'members',{id:team,version:0,enrollmentIds:[]})).error);
   assert.ok((await a.client.from('team_memberships').delete().eq('enrollment_id',a.enrollment)).error);
   assert.ok((await lead.client.rpc('set_test_participation',{p_id:a.enrollment,p_is_test:true})).error);
   const own=ok(await a.client.rpc('my_team',{p_enrollment:a.enrollment}));assert.equal(own.members.length,2);assert.equal(own.name,'Research Team');assert.ok(!JSON.stringify(own).includes(b.email));
   assert.ok((await a.client.rpc('my_team',{p_enrollment:outsider.enrollment})).error);
  });
  await t.test('concurrent first saves accept one; request replay is stable and no per-member copies exist',async()=>{
   const request=randomUUID(),otherRequest=randomUUID();const firstResults=await Promise.all([response(a,'First shared response',{request}),response(b,'Other first response',{request:otherRequest})]);
   assert.equal(firstResults.filter(r=>!r.error).length,1);assert.equal(firstResults.find(r=>r.error).error.code,'40001');
   const first=firstResults.find(r=>!r.error),winner=firstResults[0].error?b:a,winnerRequest=firstResults[0].error?otherRequest:request,winnerText=firstResults[0].error?'Other first response':'First shared response';
   assert.equal(ok(await response(winner,winnerText,{request:winnerRequest})),first.data);
   assert.ok((await response(winner,'Different content',{request:winnerRequest})).error);
   let s=await current();const results=await Promise.all([response(a,'Alice replacement',{id:s.id,version:s.updated_at}),response(b,'Bob replacement',{id:s.id,version:s.updated_at})]);
   assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error).error.code,'40001');
   assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(assignment)} and is_current`),'1');
   s=await current();assert.equal(s.team_id,team);assert.equal(s.enrollment_id,null);assert.ok([a.person,b.person].includes(s.submitted_by));
   assert.equal(ok(await b.client.from('submissions').select('*').eq('assignment_id',assignment)).length,2);
   assert.equal(ok(await outsider.client.from('submissions').select('*').eq('assignment_id',assignment)).length,0);
   assert.ok((await members([a.enrollment])).error);assert.ok((await teamOp(lead,'delete',{id:team,version:(await teamRow()).version})).error);
   ok(await teamOp(lead,'rename',{id:team,version:(await teamRow()).version,name:'Research Team'}));
  });
  await t.test('shared review races, completed restrictions, individual preservation and live revocation',async()=>{
   let s=await current();const results=await Promise.all([
    lead.client.rpc('review_submission',{p_data:{id:s.id,status:'completed',feedback:'Team approved',expectedUpdatedAt:s.updated_at}}),
    response(b,'Racing with review',{id:s.id,version:s.updated_at})]);
   assert.equal(results.filter(r=>!r.error).length,1);
   s=await current();if(s.status!=='completed')ok(await lead.client.rpc('review_submission',{p_data:{id:s.id,status:'completed',feedback:'Team approved',expectedUpdatedAt:s.updated_at}}));
   s=await current();assert.ok((await response(a,'Cannot replace approval',{id:s.id,version:s.updated_at})).error);
   assert.equal(ok(await b.client.from('submissions').select('feedback').eq('id',s.id).single()).feedback,'Team approved');
   const individualId=ok(await response(a,'Private individual',{aid:individual}));assert.equal(ok(await b.client.from('submissions').select('id').eq('id',individualId)).length,0);
   for(const u of [viewer,inactive,wrong]){assert.equal(ok(await u.client.from('submissions').select('id').eq('assignment_id',assignment)).length,0);assert.ok((await response(u,'Denied')).error);}
   await sql(`update public.approved_members set active=false where person_id=${q(b.person)}`);assert.equal(ok(await b.client.from('submissions').select('id').eq('assignment_id',assignment)).length,0);assert.ok((await response(b,'Denied')).error);
   await sql(`update public.approved_members set active=true where person_id=${q(b.person)};update public.cohort_enrollments set participation_status='withdrew' where id=${q(b.enrollment)}`);assert.equal(ok(await b.client.from('submissions').select('id').eq('assignment_id',assignment)).length,0);
   await sql(`update public.cohort_enrollments set participation_status='enrolled' where id=${q(b.enrollment)}`);
   const data=await readMemberRows(b.client,b.person);assert.ok(data.submissions.some(row=>row.id===s.id));assert.ok(!data.submissions.some(row=>row.id===individualId));
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await teamOp(lead,'rename',{id:team,version:(await teamRow()).version,name:'Denied'})).error);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
  });
  await t.test('team files retain immutable history, reject stale finalizers and authorize teammate downloads',async()=>{
   const prepared=ok(await file(a,'prepare',{assignmentId:uploadAssignment,name:'team.pdf',size:pdf.length,mime:'application/pdf'}));paths.push(prepared.path);
   ok(await a.client.storage.from('submissions').upload(prepared.path,pdf,{contentType:'application/pdf'}));assert.ok((await b.client.storage.from('submissions').download(prepared.path)).error);
   const receipt=ok(await file(a,'finalize',{size:pdf.length,mime:'application/pdf'},prepared.id));assert.equal(receipt.state,'committed');assert.equal(ok(await file(a,'finalize',{},prepared.id)).submissionId,receipt.submissionId);
   assert.equal(ok(await b.client.storage.from('submissions').download(prepared.path)).size,pdf.length);assert.ok((await outsider.client.storage.from('submissions').download(prepared.path)).error);
   assert.ok((await a.client.storage.from('submissions').update(prepared.path,pdf)).error);ok(await outsider.client.storage.from('submissions').remove([prepared.path]));assert.equal(ok(await b.client.storage.from('submissions').download(prepared.path)).size,pdf.length);
   const s=ok(await root.from('submissions').select('*').eq('id',receipt.submissionId).single());
   const stale=ok(await file(a,'prepare',{assignmentId:uploadAssignment,name:'stale.pdf',size:pdf.length,mime:'application/pdf',expectedId:s.id,expectedUpdatedAt:s.updated_at}));paths.push(stale.path);ok(await a.client.storage.from('submissions').upload(stale.path,pdf,{contentType:'application/pdf'}));
   ok(await response(b,'Replaced file with text',{aid:uploadAssignment,id:s.id,version:s.updated_at}));assert.equal(ok(await file(a,'finalize',{size:pdf.length,mime:'application/pdf'},stale.id)).error,'stale');
   assert.equal(ok(await b.client.storage.from('submissions').download(prepared.path)).size,pdf.length);
   assert.ok((await b.client.rpc('file_upload',{p_actor:b.id,p_action:'finalize',p_intent:stale.id})).error);
  });
  await t.test('team screenshots retain private teammate/admin access and reject outsiders',async()=>{
   const bytes=await sharp({create:{width:20,height:10,channels:3,background:'white'}}).png().toBuffer();
   const prior=ok(await root.from('submissions').select('*').eq('assignment_id',uploadAssignment).eq('is_current',true).single());
   const intent=ok(await file(a,'prepare',{assignmentId:uploadAssignment,name:'team.png',size:bytes.length,mime:'image/png',expectedId:prior.id,expectedUpdatedAt:prior.updated_at}));paths.push(intent.path);
   ok(await a.client.storage.from('submissions').upload(intent.path,bytes,{contentType:'image/png'}));
   const receipt=ok(await file(a,'finalize',{size:bytes.length,mime:'image/png'},intent.id));assert.equal(receipt.state,'committed');
   assert.equal(ok(await b.client.storage.from('submissions').download(intent.path)).size,bytes.length);
   assert.ok((await outsider.client.storage.from('submissions').download(intent.path)).error);
   if(app)for(const [user,status] of [[b,200],[lead,200],[outsider,404],[viewer,404]]){
    const jar=await cookies(user),response=await fetch(`${app}/api/submissions/${receipt.submissionId}/image`,{headers:{cookie:jar.map(c=>c.name+'='+c.value).join('; ')}});
    assert.equal(response.status,status);
   }
  });
  await t.test('membership changes invalidate pending uploads and mode changes roll back safely',async()=>{
   const otherTeam=ok(await teamOp(lead,'create',{cohortId:cohort,name:'Unsubmitted team',isTest:false}));
   ok(await teamOp(lead,'members',{id:otherTeam,version:0,enrollmentIds:[outsider.enrollment]}));
   const intent=ok(await file(outsider,'prepare',{assignmentId:uploadAssignment,name:'before-move.pdf',size:pdf.length,mime:'application/pdf'}));paths.push(intent.path);ok(await outsider.client.storage.from('submissions').upload(intent.path,pdf,{contentType:'application/pdf'}));
   ok(await teamOp(lead,'members',{id:otherTeam,version:1,enrollmentIds:[]}));assert.equal(ok(await file(outsider,'finalize',{size:pdf.length,mime:'application/pdf'},intent.id)).error,'stale');
   const items=ok(await root.from('assignments').select('*').eq('week_id',week)).map(a=>({id:a.id,title:a.title,instructions:a.instructions,dueAt:a.due_at,submissionMode:a.id===assignment?'individual':a.submission_mode}));
   assert.ok((await lead.client.rpc('save_program_week',{p_data:{id:week,title:'Must roll back',description:'Disposable teamwork',publicationState:'published',assignments:items,resources:[]}})).error);
   assert.equal(ok(await root.from('program_weeks').select('title').eq('id',week).single()).title,'Teams fixture');
   const empty=randomUUID();await sql(`insert into public.assignments(id,week_id,title,instructions,due_at,sort_order) values(${q(empty)},${q(week)},'New team assignment','Instructions',now(),4)`);
   const all=ok(await root.from('assignments').select('*').eq('week_id',week)).map(a=>({id:a.id,title:a.title,instructions:a.instructions,dueAt:a.due_at,submissionMode:a.id===empty?'team':a.submission_mode}));
   ok(await lead.client.rpc('save_program_week',{p_data:{id:week,title:'Teams fixture',description:'Disposable teamwork',publicationState:'published',assignments:all,resources:[]}}));
   assert.equal(ok(await root.from('assignments').select('submission_mode').eq('id',empty).single()).submission_mode,'team');
  });
  await t.test('direct HTTP team actions and historical downloads recheck live access',{skip:!app},async()=>{
   const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
   const actionId=name=>Object.entries(manifest.node).find(([,e])=>e.exportedName===name)?.[0];assert.ok(actionId('saveTeam'));
   async function action(user,args,name='saveTeam'){
    const jar=user?await cookies(user):[];
    const r=await fetch(app+'/admin/members',{method:'POST',redirect:'manual',headers:{origin:app,'next-action':actionId(name),'content-type':'text/plain;charset=UTF-8',cookie:jar.map(c=>c.name+'='+c.value).join('; ')},body:JSON.stringify(args)});
    return{redirect:r.headers.get('x-action-redirect')??'',body:await r.text()};
   }
   for(const u of [a,b,viewer,inactive,wrong])assert.match((await action(u,['rename',{id:team,version:0,name:'Forbidden'}])).redirect,/access-denied/);
   assert.match((await action(null,['rename',{id:team,version:0,name:'Forbidden'}])).redirect,/login/);
   for(const args of [['unknown',{}],['members',{id:'forged',version:0,enrollmentIds:[]}],['create',{cohortId:cohort,name:'Bad',isTest:'false'}]])assert.match((await action(lead,args)).body,/Invalid team/);
   for(const u of [inactive,wrong,viewer])assert.match((await action(u,[assignment,'Forged response',null,null,randomUUID()],'saveText')).redirect,/access-denied/);
   assert.match((await action(outsider,[assignment,'Not on this team'],'saveText')).body,/Could not submit/);
   const fileRow=ok(await root.from('submissions').select('id').eq('assignment_id',uploadAssignment).eq('submission_type','file').eq('mime_type','application/pdf').single());
   for(const[u,status]of [[a,200],[b,200],[lead,200],[outsider,404],[viewer,404],[inactive,404],[wrong,404],[null,401]]){
    const jar=u?await cookies(u):[],r=await fetch(`${app}/api/submissions/${fileRow.id}/download`,{headers:{cookie:jar.map(c=>c.name+'='+c.value).join('; ')}});assert.equal(r.status,status);assert.match(r.headers.get('cache-control'),/no-store/);if(status===200)assert.equal((await r.arrayBuffer()).byteLength,pdf.length);
   }
   assert.equal((await teamRow()).name,'Research Team');
  });
  await t.test('desktop/phone shared work, review, feedback, setup and HTTP authorization',{skip:!app},async()=>{
   const{chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-teams-'));
   const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),actionId=Object.entries(manifest.node).find(([,e])=>e.exportedName==='saveTeam')?.[0];assert.ok(actionId);
   try{for(const width of [1280,390]){
    const browserAssignment=randomUUID();await sql(`insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(browserAssignment)},${q(week)},'Browser shared work ${width}','Research instructions',now(),5,'individual')`);
    const setup=await browser.newContext({viewport:{width,height:900}});await setup.addCookies(await cookies(lead));const sp=await setup.newPage();await sp.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);
    await openAssignmentEditor(sp,browserAssignment);await sp.locator(`input[value="Browser shared work ${width}"]`).locator('..').locator('..').getByRole('combobox',{name:'Submission type',exact:false}).selectOption('team');await sp.getByRole('button',{name:'Save changes',exact:true}).click();await sp.getByText('Week published.',{exact:true}).waitFor();await setup.close();
    const sender=await browser.newContext({viewport:{width,height:900}});await sender.addCookies(await cookies(a));const send=await sender.newPage();
    await send.goto(`${app}/week/1/assignments/${browserAssignment}`);await send.getByRole('button',{name:'Submit assignment',exact:true}).click();await send.getByRole('button',{name:'Write response',exact:false}).click();await send.getByRole('textbox',{name:'Your response',exact:true}).fill(`Shared browser response ${width}`);
    const staleContext=await browser.newContext({viewport:{width,height:900}});await staleContext.addCookies(await cookies(b));const stalePage=await staleContext.newPage();await stalePage.goto(`${app}/week/1/assignments/${browserAssignment}`);await stalePage.getByRole('button',{name:'Submit assignment',exact:true}).click();await stalePage.getByRole('button',{name:'Write response',exact:false}).click();await stalePage.getByRole('textbox',{name:'Your response',exact:true}).fill('Keep this teammate draft');
    await send.getByRole('button',{name:'Submit assignment',exact:true}).click();await send.getByRole('link',{name:'View submission',exact:true}).waitFor();await stalePage.getByRole('button',{name:'Submit assignment',exact:true}).click();await stalePage.getByText('Your submission changed. Refresh before submitting again.',{exact:true}).waitFor();assert.equal(await stalePage.getByRole('textbox',{name:'Your response',exact:true}).inputValue(),'Keep this teammate draft');await staleContext.close();
    await send.reload();await send.getByRole('link',{name:'View submission',exact:true}).waitFor();await sender.close();
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(b));const page=await ctx.newPage();
    await page.goto(`${app}/week/1/assignments/${browserAssignment}`);await page.getByRole('link',{name:'View submission',exact:true}).click();await page.getByText(`Shared browser response ${width}`,{exact:true}).waitFor();await page.getByRole('button',{name:'Replace submission',exact:true}).click();await page.getByRole('button',{name:'Submit link',exact:false}).click();await page.getByRole('textbox',{name:'Submission link',exact:true}).fill('https://example.com/shared-'+width);await page.getByRole('button',{name:'Replace submission',exact:true}).click();await page.getByText('https://example.com/shared-'+width,{exact:true}).waitFor();await page.reload();await page.getByText('https://example.com/shared-'+width,{exact:true}).waitFor();
    await page.goto(`${app}/week/1/assignments/${assignment}`);await page.getByRole('region',{name:'Your team'}).getByRole('heading',{name:'Research Team'}).waitFor();await page.getByRole('region',{name:'Your team'}).getByText('Bob Fixture',{exact:true}).waitFor();await page.getByRole('link',{name:'View feedback',exact:true}).click();await page.getByText('Team approved',{exact:true}).waitFor();await page.reload();await page.getByText('Team approved',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screens,`team-${width}.png`),fullPage:true});
    const denied=await ctx.request.post(app+'/admin/members',{headers:{'next-action':actionId,'content-type':'text/plain;charset=UTF-8'},data:JSON.stringify(['rename',{id:team,version:0,name:'Forged'}])});assert.match(denied.headers()['x-action-redirect']??await denied.text(),/access-denied/);
    await ctx.close();const admin=await browser.newContext({viewport:{width,height:900}});await admin.addCookies(await cookies(lead));const p=await admin.newPage();await p.goto(`${app}/admin?cohort=${cohort}&assignment=${assignment}&status=all`);await p.getByRole('heading',{name:'Review queue'}).waitFor();assert.equal(await p.locator('#submissions').getByText('Research Team',{exact:true}).filter({visible:true}).count(),1);
    const pending=ok(await root.from('submissions').select('id').eq('assignment_id',browserAssignment).eq('is_current',true).single());await p.goto(`${app}/admin/submissions/${pending.id}?cohort=${cohort}&week=${week}`);await p.getByRole('heading',{name:'Research Team',exact:true}).waitFor();await showReview(p);await p.getByRole('radio',{name:'Request revision',exact:true}).check();await p.getByRole('textbox',{name:'Feedback (required)',exact:true}).fill('Team browser feedback '+width);await p.getByRole('button',{name:'Save review',exact:true}).click();await p.getByText('Review saved.',{exact:true}).waitFor();
    const check=await browser.newContext({viewport:{width,height:900}});await check.addCookies(await cookies(a));const cp=await check.newPage();await cp.goto(`${app}/week/1/submission?assignment=${browserAssignment}`);await cp.getByText('Team browser feedback '+width,{exact:true}).waitFor();await check.close();
    await p.goto(`${app}/admin/members?cohort=${cohort}`);await p.getByRole('button',{name:'Teams',exact:true}).click();
    const teamsPanel=p.getByRole('region',{name:'Teams',exact:true});
    assert.equal(await teamsPanel.getByRole('combobox',{name:'Select team',exact:true}).inputValue(),team);
    assert.equal(await teamsPanel.getByRole('textbox').count(),0);
    await p.getByText('Team actions',{exact:true}).focus();await p.keyboard.press('Enter');assert.equal(await p.getByRole('button',{name:'Rename team',exact:true}).isVisible(),true);await p.keyboard.press('Enter');
    await p.getByRole('button',{name:'Add team',exact:true}).click();
    const suggested=await teamsPanel.getByRole('form',{name:'Add team'}).locator('p').first().textContent();
    const collision=ok(await teamOp(lead,'create',{cohortId:cohort,name:suggested.replace('Create ',''),isTest:false}));
    await p.getByRole('button',{name:'Create team',exact:true}).click();
    await teamsPanel.getByRole('alert').getByText('That team name is already in use.',{exact:false}).waitFor();
    await p.waitForFunction(old=>document.querySelector('form[aria-label="Add team"] p')?.textContent!==old,suggested);
    assert.equal(ok(await root.from('cohort_teams').select('id').eq('id',collision)).length,1);
    const nextName=(await teamsPanel.getByRole('form',{name:'Add team'}).locator('p').first().textContent()).replace('Create ','');
    await p.getByRole('button',{name:'Create team',exact:true}).click();
    await p.getByText(`${nextName} created. Choose Edit members to assign participants.`,{exact:true}).waitFor();
    const created=ok(await root.from('cohort_teams').select('id').eq('cohort_id',cohort).eq('name',nextName).single());
    await p.waitForFunction(id=>document.querySelector('section[aria-label="Teams"] select')?.value===id,created.id,{timeout:5000});
    assert.equal(await p.getByRole('combobox',{name:'Select team',exact:true}).inputValue(),created.id);
    await p.getByRole('button',{name:'Edit members',exact:true}).click();await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).check();
    let switchPrompt=false;p.once('dialog',dialog=>{switchPrompt=true;return dialog.dismiss();});await p.getByRole('combobox',{name:'Select team',exact:true}).selectOption(team);
    assert.equal(switchPrompt,true,'switching dirty teams must ask before discarding changes');
    assert.equal(await p.getByRole('combobox',{name:'Select team',exact:true}).inputValue(),created.id);
    assert.equal(await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).isChecked(),true);
    await teamsPanel.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(ok(await root.from('team_memberships').select('enrollment_id').eq('team_id',created.id)).length,0);
    await p.getByRole('button',{name:'Edit members',exact:true}).click();await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).check();
    await sql(`update public.cohort_teams set version=version+1 where id=${q(created.id)}`);
    await p.getByRole('button',{name:'Save members',exact:true}).click();await teamsPanel.getByRole('alert').getByText('This team changed.',{exact:false}).waitFor();
    assert.equal(await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).isChecked(),true);
    await teamsPanel.getByRole('button',{name:'Cancel',exact:true}).click();await p.reload();await p.getByRole('button',{name:'Teams',exact:true}).click();
    await p.getByRole('combobox',{name:'Select team',exact:true}).selectOption(created.id);await p.getByRole('button',{name:'Edit members',exact:true}).click();await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).check();await p.getByRole('button',{name:'Save members',exact:true}).click();
    for(let count=0;count<30;count++){if(await sql(`select count(*) from public.team_memberships where team_id=${q(created.id)}`)==='1')break;await new Promise(r=>setTimeout(r,100));}assert.equal(await sql(`select count(*) from public.team_memberships where team_id=${q(created.id)}`),'1');
    await teamsPanel.getByRole('list',{name:'Assigned participants',exact:true}).getByText('Outsider Fixture',{exact:true}).waitFor();
    assert.equal(await p.getByRole('combobox',{name:'Select team',exact:true}).inputValue(),created.id);
    await p.getByText('Team actions',{exact:true}).click();await p.getByRole('button',{name:'Rename team',exact:true}).click();
    await p.getByRole('textbox',{name:'Team name',exact:true}).fill('Browser Team '+width);await p.getByRole('button',{name:'Save name',exact:true}).click();await p.getByText('Team name saved.',{exact:true}).waitFor();
    assert.equal(await p.getByRole('combobox',{name:'Select team',exact:true}).inputValue(),created.id);
    await p.reload();await p.getByRole('button',{name:'Teams',exact:true}).click();await p.getByRole('combobox',{name:'Select team',exact:true}).selectOption(created.id);
    await teamsPanel.getByRole('list',{name:'Assigned participants',exact:true}).getByText('Outsider Fixture',{exact:true}).waitFor();
    await p.getByRole('button',{name:'Edit members',exact:true}).click();assert.equal(await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).isChecked(),true);await p.getByRole('checkbox',{name:'Outsider Fixture',exact:true}).uncheck();await p.getByRole('button',{name:'Save members',exact:true}).click();
    for(let count=0;count<30;count++){if(await sql(`select count(*) from public.team_memberships where team_id=${q(created.id)}`)==='0')break;await new Promise(r=>setTimeout(r,100));}assert.equal(await sql(`select count(*) from public.team_memberships where team_id=${q(created.id)}`),'0');
    await p.getByText('Team members saved.',{exact:true}).waitFor();await p.getByText('Team actions',{exact:true}).click();
    p.once('dialog',dialog=>dialog.dismiss());await p.getByRole('button',{name:'Delete team',exact:true}).click();assert.equal(ok(await root.from('cohort_teams').select('id').eq('id',created.id)).length,1);
    p.once('dialog',dialog=>dialog.accept());await p.getByRole('button',{name:'Delete team',exact:true}).click();await p.getByText('Team deleted.',{exact:true}).waitFor();assert.equal(ok(await root.from('cohort_teams').select('id').eq('id',created.id)).length,0);
    await p.reload();await p.getByRole('button',{name:'Teams',exact:true}).click();await p.getByRole('combobox',{name:'Select team',exact:true}).selectOption(team);await p.getByText(/Membership locked after (?:research or )?submission/).waitFor();assert.equal(await p.getByRole('button',{name:'Edit members',exact:true}).isDisabled(),true);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:join(screens,`teams-admin-${width}.png`),fullPage:true});
    await p.goto(`${app}/admin?cohort=${cohort}&week=${week}`);await p.waitForLoadState('networkidle');await p.getByRole('heading',{name:'Review queue',exact:true}).waitFor();const summary=p.getByLabel('Week submissions',{exact:true}).locator('p').first();assert.equal(await summary.evaluate(el=>getComputedStyle(el).fontSize),'14px');assert.match(await summary.evaluate(el=>getComputedStyle(el).fontFamily),/Montserrat/i);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:join(screens,`review-counts-${width}.png`),fullPage:true});await admin.close();
   }console.log('Team screenshots: '+screens);}finally{await browser.close();}
  });
 }finally{
  if(paths.length)ok(await root.storage.from('submissions').remove(paths));
  await sql(`delete from private.submission_requests where target_id in(select t.id from public.submission_targets t join public.assignments a on a.id=t.assignment_id where a.week_id=${q(week)});delete from private.upload_intents where assignment_id in(select id from public.assignments where week_id=${q(week)});update public.submissions set supersedes_submission_id=null where assignment_id in(select id from public.assignments where week_id=${q(week)});delete from public.submissions where assignment_id in(select id from public.assignments where week_id=${q(week)});delete from public.submission_targets where assignment_id in(select id from public.assignments where week_id=${q(week)});delete from public.team_memberships where team_id in(select id from public.cohort_teams where cohort_id=${q(cohort)});delete from public.cohort_teams where cohort_id=${q(cohort)};delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
  assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
 }
});
