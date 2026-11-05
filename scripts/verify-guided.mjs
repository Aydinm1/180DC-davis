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
import {pdf} from '../test/upload-fixtures.mjs';
import {guidedOverview,directionIntro,finalBrief} from '../src/lib/guided/content.ts';

const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),anon=createClient(config.API_URL,config.ANON_KEY,options);
const ok=r=>{assert.ifError(r.error);return r.data;},q=v=>`'${String(v).replaceAll("'","''")}'`;
const sql=async v=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',v])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),aid=randomUUID(),browserAid=randomUUID(),standard=randomUUID(),team=randomUUID(),otherTeam=randomUUID(),users=[],paths=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role='member',tid=team,settings={}){
 const person=randomUUID(),enrollment=randomUUID(),email=`gap-guided-${randomUUID()}@${settings.domain??'ucdavis.edu'}`;
 const id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Guided Fixture');insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Guided Fixture',${q(role)},${settings.active!==false});${role==='member'?`insert into public.cohort_enrollments(id,person_id,cohort_id) values(${q(enrollment)},${q(person)},${q(cohort)});${tid?`insert into public.team_memberships(enrollment_id,team_id) values(${q(enrollment)},${q(tid)});`:''}`:''}`);
 const client=createClient(config.API_URL,config.ANON_KEY,options),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));return {client,id,person,enrollment,email};
}
const mutate=(u,action,data,assignment=aid,request=randomUUID())=>u.client.rpc('mutate_guided_project',{p_action:action,p_assignment:assignment,p_data:data,p_request:request});
const read=async(u,assignment=aid)=>ok(await u.client.rpc('read_guided_project',{p_assignment:assignment}));
const research={risk1:'Risk A · Item 1A page 5',risk2:'Risk B · Item 1A page 6',question:'How could the company retain first-time customers?'};
const proposal={risk:'Risk A page 5',direction:'Retention',question:'How could retention improve?',evidence:'Public retention disclosures and competitor benchmarks'};
const send=(u,assignment=aid)=>u.client.rpc('submit_response',{p_assignment:assignment,p_type:'link',p_value:'https://example.com/team-document',p_request:randomUUID()});
async function cookies(user){const jar=new Map(),ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(v=>jar.set(v.name,v.value))}});ok(await ssr.auth.setSession(ok(await user.client.auth.getSession()).session));return [...jar].map(([name,value])=>({name,value,url:app}));}

test('guided project lifecycle, privacy and final submission gates',async t=>{
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2952,'2952-09-01','2952-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},2,'Guided workshop','Fictional local fixture',false);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(aid)},${q(week)},'Guided consulting problem','Guided task',now()+interval '1 day',1,'team'),(${q(browserAid)},${q(week)},'Browser guided task','Guided task',now()+interval '1 day',2,'team'),(${q(standard)},${q(week)},'Standard task','Ordinary task',now()+interval '1 day',3,'individual');insert into public.cohort_teams(id,cohort_id,name) values(${q(team)},${q(cohort)},'Team 1'),(${q(otherTeam)},${q(cohort)},'Team 2');`);
  const lead=await fixture('admin'),member=await fixture(),mate=await fixture(),other=await fixture('member',otherTeam),viewer=await fixture('viewer'),inactive=await fixture('member',null,{active:false}),wrong=await fixture('admin',null,{domain:'example.com'}),unassigned=await fixture('member',null);
  const configData={version:0,workflow:'guided',overview:guidedOverview,directionIntro,finalBrief};
  await t.test('private storage tables and helper/RPC grants deny direct browser access',async()=>{
   assert.equal(await sql(`select bool_and(c.relrowsecurity and not has_table_privilege('authenticated',c.oid,'SELECT') and not has_table_privilege('authenticated',c.oid,'INSERT') and not has_table_privilege('service_role',c.oid,'SELECT')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('guided_configs','guided_recommendations','guided_states','guided_requests','guided_receipts')`),'t');
   assert.equal(await sql(`select has_function_privilege('anon','public.read_guided_project(uuid,uuid)','EXECUTE') or has_function_privilege('anon','public.mutate_guided_project(text,uuid,jsonb,uuid)','EXECUTE') or has_function_privilege('authenticated','private.guided_ready(uuid,uuid)','EXECUTE')`),'f');
  });
  await t.test('admin configuration, draft secrecy and publication readiness',async()=>{
   for(const u of [member,viewer,inactive,wrong])assert.ok((await mutate(u,'config',configData)).error);
   assert.ok((await anon.rpc('read_guided_project',{p_assignment:aid})).error);
   assert.ok((await member.client.rpc('read_guided_project',{p_assignment:aid})).error);
   for(const assignment of [aid,browserAid])ok(await mutate(lead,'config',configData,assignment));
   assert.ok((await root.from('program_weeks').update({published:true}).eq('id',week)).error);
   for(const assignment of [aid,browserAid])for(const tid of [team,otherTeam])ok(await mutate(lead,'recommendation',{version:0,teamId:tid,company:'Fictional Company',title:tid===team?'Private Team One Direction':'Private Team Two Direction',guidance:'## Scope\n\n- Public reports\n- Competitor research'},assignment));
   ok(await root.from('program_weeks').update({published:true}).eq('id',week));
   const initial=await read(member);assert.equal(initial.recommendation,null);assert.equal(initial.state,null);assert.equal(initial.teams,undefined);
   const v=await read(viewer);assert.equal(v.state,undefined);assert.equal(v.recommendation,undefined);assert.equal(v.teams,undefined);
   assert.ok((await member.client.rpc('read_guided_project',{p_assignment:aid,p_team:otherTeam})).error);
   assert.ok((await send(member)).error);
  });
  await t.test('shared research, original snapshot, version conflicts and immutable recommendations',async()=>{
   const request=randomUUID(),data={version:0,research};
   assert.ok((await mutate(member,'research',{version:0,research:{...research,forged:{timestamp:'client'}}})).error);
   const responses=await Promise.all([mutate(member,'research',data,aid,request),mutate(member,'research',data,aid,request)]);responses.forEach(ok);
   assert.equal((await read(member)).state.version,1);assert.equal((await read(mate)).recommendation.title,'Private Team One Direction');
   assert.equal(await sql(`select locked from public.cohort_teams where id=${q(team)}`),'t');
   assert.ok((await mutate(mate,'research',{version:0,research})).error);
   const revised={risk1:'Updated first risk and page 7',risk2:'Updated second risk and page 8',question:'Revised question'};
   ok(await mutate(mate,'research',{version:1,research:revised}));
   const admin=await read(lead),s=admin.teams.find(t=>t.id===team).state;assert.deepEqual(s.original_research,research);assert.deepEqual(s.research,revised);assert.deepEqual((await read(member)).state.research,revised);
   assert.equal((await read(other)).recommendation,null);
   assert.ok((await mutate(lead,'recommendation',{version:1,teamId:team,company:'Changed',title:'Changed',guidance:'Changed'})).error);
   for(const user of [viewer,inactive,wrong,unassigned])assert.ok((await mutate(user,'research',data)).error);
   await sql(`update public.cohort_enrollments set participation_status='withdrew' where id=${q(mate.enrollment)}`);assert.ok((await mutate(mate,'research',{version:2,research})).error);await sql(`update public.cohort_enrollments set participation_status='enrolled' where id=${q(mate.enrollment)}`);
  });
  await t.test('alternative revisions, admin decisions, stale approvals and duplicate-safe requests',async()=>{
   let s=await read(member);ok(await mutate(member,'alternative',{version:s.state.version,proposal}));assert.ok((await send(member)).error);
   s=await read(member);const req=s.requests.find(r=>r.status==='pending');
   assert.ok((await mutate(member,'decide',{version:s.state.version,teamId:team,requestId:req.id,decision:'approved',note:''})).error);
   assert.ok((await mutate(lead,'decide',{version:s.state.version,teamId:team,requestId:req.id,decision:'changes_requested',note:''})).error);
   ok(await mutate(lead,'decide',{version:s.state.version,teamId:team,requestId:req.id,decision:'changes_requested',note:'Narrow your question'}));
   assert.ok((await send(member)).error);s=await read(member);assert.equal(s.requests[0].decision_note,'Narrow your question');
   ok(await mutate(member,'alternative',{version:s.state.version,proposal:{...proposal,question:'A narrower question'}}));s=await read(member);
   assert.ok((await mutate(lead,'decide',{version:s.state.version,teamId:team,requestId:req.id,decision:'approved',note:''})).error);
   const next=s.requests.find(r=>r.status==='pending'),data={version:s.state.version,teamId:team,requestId:next.id,decision:'approved',note:'Approved scope'},id=randomUUID();
   ok(await mutate(lead,'decide',data,aid,id));ok(await mutate(lead,'decide',data,aid,id));
   s=await read(member);assert.equal(s.requests.filter(r=>r.status==='approved').length,1);
   ok(await mutate(member,'alternative',{version:s.state.version,proposal}));assert.ok((await send(member)).error);
   s=await read(member);ok(await mutate(member,'recommended',{version:s.state.version}));
  });
  await t.test('prepared uploads cannot bypass new approval gates; finalization freezes work',async()=>{
   for(const [name,mime] of [['proof.png','image/png'],['proof.jpg','image/jpeg'],['proof.webp','image/webp']])assert.ok((await root.rpc('file_upload',{p_actor:member.id,p_action:'prepare',p_data:{assignmentId:aid,name,size:100,mime}})).error);
   const p=ok(await root.rpc('file_upload',{p_actor:member.id,p_action:'prepare',p_data:{assignmentId:aid,name:'project.pdf',size:pdf.length,mime:'application/pdf'}}));paths.push(p.path);
   ok(await member.client.storage.from('submissions').upload(p.path,pdf,{contentType:'application/pdf'}));
   const forged=await sql(`begin;update private.upload_intents set mime_type='image/png',original_filename='forged.png' where id=${q(p.id)};select public.file_upload(${q(member.id)},'finalize',${q(p.id)},'{"size":${pdf.length},"mime":"image/png"}');rollback;`);
   assert.match(forged,/invalid/);assert.equal((await read(member)).state.frozen,false);
   let s=await read(member);ok(await mutate(member,'alternative',{version:s.state.version,proposal}));
   assert.ok((await root.rpc('file_upload',{p_actor:member.id,p_action:'finalize',p_intent:p.id,p_data:{size:pdf.length,mime:'application/pdf'}})).error);
   assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(aid)}`),'0');
   s=await read(member);ok(await mutate(member,'recommended',{version:s.state.version}));
   assert.ok((await member.client.rpc('submit_response',{p_assignment:aid,p_type:'text',p_value:'Not a document',p_request:randomUUID()})).error);
   const receipt=ok(await root.rpc('file_upload',{p_actor:member.id,p_action:'finalize',p_intent:p.id,p_data:{size:pdf.length,mime:'application/pdf'}}));assert.equal(receipt.state,'committed');
   assert.equal(ok(await root.rpc('file_upload',{p_actor:member.id,p_action:'finalize',p_intent:p.id,p_data:{size:pdf.length,mime:'application/pdf'}})).submissionId,receipt.submissionId);
   s=await read(member);assert.equal(s.state.frozen,true);assert.ok((await mutate(member,'research',{version:s.state.version,research})).error);
   assert.ok((await mutate(member,'alternative',{version:s.state.version,proposal})).error);
   assert.ok((await mutate(lead,'config',{...configData,version:1,workflow:'standard'})).error);
   assert.equal((await read(mate)).state.frozen,true);
  });
  await t.test('concurrent direction/submission, original workflow and live role revocation',async()=>{
   ok(await mutate(other,'research',{version:0,research}));ok(await mutate(other,'recommended',{version:1}));
   const race=await Promise.all([send(other),mutate(other,'alternative',{version:2,proposal})]);
   const state=await read(other),count=await sql(`select count(*) from public.submissions where assignment_id=${q(aid)} and team_id=${q(otherTeam)}`);
   if(count==='1'){assert.equal(state.state.frozen,true);assert.ok(race[1].error);}else{assert.equal(count,'0');assert.ok(race[0].error);assert.equal(state.requests[0].status,'pending');}
   ok(await send(member,standard));
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await mutate(lead,'config',{...configData,version:1})).error);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
   await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);assert.ok((await member.client.rpc('read_guided_project',{p_assignment:aid})).error);await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
  });
  await t.test('new team missing setup preserves research and remains blocked until configured',async()=>{
   const late=randomUUID();await sql(`insert into public.cohort_teams(id,cohort_id,name,is_test) values(${q(late)},${q(cohort)},'Late Test Team',true)`);
   const tester=await fixture('member',null);await sql(`update public.cohort_enrollments set is_test=true where id=${q(tester.enrollment)};insert into public.team_memberships(enrollment_id,team_id) values(${q(tester.enrollment)},${q(late)})`);
   ok(await mutate(tester,'research',{version:0,research}));assert.equal((await read(tester)).recommendation,null);assert.ok((await send(tester)).error);
   ok(await mutate(lead,'recommendation',{version:0,teamId:late,company:'Late fixture',title:'Late setup',guidance:'Public sources only'}));
   assert.equal((await read(tester)).state.research.risk1,research.risk1);ok(await mutate(tester,'recommended',{version:1}));
   assert.ok((await viewer.client.schema('private').from('guided_states').select('*')).error);
  });
  await t.test('desktop/phone shared workflow, admin approval and zero-write preview',{skip:!app},async()=>{
   const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-guided-'));
   const actionManifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),guidedActionId=Object.entries(actionManifest.node).find(([,v])=>v.exportedName==='saveGuidedProject')?.[0];assert.ok(guidedActionId);
   try{for(const width of [1280,390]){
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(member));const page=await ctx.newPage();
    await page.goto(`${app}/week/2/assignments/${browserAid}`);await page.getByRole('navigation',{name:'Assignment views'}).getByRole('button',{name:'Workspace',exact:true}).click();
    if(width===1280){
     for(const [label,value] of [['Risk #1, heading and page reference',research.risk1],['Risk #2, heading and page reference',research.risk2],['Initial consulting question',research.question]])await page.getByLabel(label,{exact:true}).fill(value);
     let viewWrites=0;const trackView=r=>{if(r.headers()['next-action']===guidedActionId)viewWrites++;};page.on('request',trackView);await page.getByRole('button',{name:'Read research instructions',exact:true}).click();await page.getByRole('navigation',{name:'Assignment views'}).getByRole('button',{name:'Workspace',exact:true}).click();assert.equal(await page.getByLabel('Initial consulting question',{exact:true}).inputValue(),research.question);assert.equal(viewWrites,0);page.off('request',trackView);
     const loseResponse=async route=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']===guidedActionId)await route.abort();else await route.continue();};await page.route('**/*',loseResponse);
     await page.getByRole('button',{name:'Save research & reveal direction',exact:true}).click();await page.getByText(/Save could not be confirmed\. Your input is retained/).waitFor();assert.equal(await page.getByLabel('Risk #1, heading and page reference',{exact:true}).inputValue(),research.risk1);await page.unroute('**/*',loseResponse);
     await page.getByRole('button',{name:'Save research & reveal direction',exact:true}).click();await page.getByText('Private Team One Direction',{exact:true}).waitFor();assert.equal((await read(member,browserAid)).state.version,1);
     await page.getByRole('button',{name:'Continue with recommended direction',exact:true}).click();await page.getByRole('button',{name:'Submit assignment',exact:true}).waitFor();
     const recommendedContext=await browser.newContext({viewport:{width,height:900}});await recommendedContext.addCookies(await cookies(lead));const recommendedPage=await recommendedContext.newPage();await recommendedPage.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${browserAid}`);
     const inbox=recommendedPage.getByRole('region',{name:'Direction requests',exact:true});await inbox.getByText('No direction requests awaiting approval.',{exact:true}).waitFor();assert.equal(await inbox.getByRole('button',{name:'Approve direction',exact:true}).count(),0);
     await recommendedPage.getByText('Team project progress',{exact:true}).click();await recommendedPage.getByText('Using your recommended direction',{exact:true}).waitFor();await recommendedPage.getByRole('article',{name:'Team 1 project progress',exact:true}).getByText(research.question,{exact:true}).filter({visible:true}).waitFor();await recommendedPage.screenshot({path:join(screens,'recommended-progress.png'),fullPage:true});await recommendedContext.close();
     await page.getByRole('navigation',{name:'Project steps'}).getByRole('button',{name:/Direction/}).click();await page.getByRole('button',{name:'Request an alternative',exact:true}).click();
     for(const [label,value] of [['Relevant risk and citation',proposal.risk],['Proposed direction',proposal.direction],['Focused consulting question',proposal.question],['Investigation and accessible evidence plan',proposal.evidence]])await page.getByLabel(label,{exact:true}).fill(value);
     await page.getByRole('button',{name:'Send for approval',exact:true}).click();await page.getByText('Alternative: Pending approval',{exact:true}).waitFor();
     const admin=await browser.newContext({viewport:{width,height:900}});await admin.addCookies(await cookies(lead));const ap=await admin.newPage();await ap.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${browserAid}`);
     assert.doesNotMatch(await ap.locator('main').innerText(),/Counts describe assignment submissions|This does not mean the week is complete|Preparation approvals are separate|Official teams only/);await ap.getByRole('heading',{name:'No submissions awaiting review',exact:true}).waitFor();assert.ok(await ap.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await ap.screenshot({path:join(screens,`review-copy-${width}.png`),fullPage:true});const note=ap.getByLabel('Decision note',{exact:true});await note.fill('Please narrow this proposed scope.');
     const failDecision=async route=>route.request().headers()['next-action']===guidedActionId?route.abort():route.continue();await ap.route('**/*',failDecision);await ap.getByRole('button',{name:'Request changes',exact:true}).click();await ap.getByText(/Save could not be confirmed/).waitFor();assert.equal(await note.inputValue(),'Please narrow this proposed scope.');await ap.unroute('**/*',failDecision);
     let pendingState=await read(member,browserAid);ok(await mutate(mate,'research',{version:pendingState.state.version,research:{...research,question:'Updated current team question'}},browserAid));
     await ap.getByRole('button',{name:'Request changes',exact:true}).click();await ap.getByText(/changed|Reload|reload/).filter({visible:true}).first().waitFor();assert.equal(await note.inputValue(),'Please narrow this proposed scope.');
     await ap.getByRole('button',{name:'Refresh request',exact:true}).click();await ap.getByRole('button',{name:'Review updated request',exact:true}).waitFor();assert.equal(await note.inputValue(),'Please narrow this proposed scope.');await ap.getByRole('button',{name:'Review updated request',exact:true}).click();await ap.getByRole('button',{name:'Request changes',exact:true}).click();await ap.getByText('Decision saved.',{exact:true}).waitFor();await ap.getByText('No direction requests awaiting approval.',{exact:true}).waitFor();
     await page.reload();await page.getByRole('navigation',{name:'Project steps'}).getByRole('button',{name:/Direction/}).click();await page.getByText('Alternative: Changes requested',{exact:true}).waitFor();await page.getByText('Please narrow this proposed scope.',{exact:true}).waitFor();await page.getByRole('button',{name:'Revise alternative request',exact:true}).click();await page.getByRole('button',{name:'Send for approval',exact:true}).click();await page.getByText('Alternative: Pending approval',{exact:true}).waitFor();
     await ap.reload();await ap.getByLabel('Decision note',{exact:true}).fill('Browser approved scope');await ap.getByRole('button',{name:'Approve direction',exact:true}).click();await ap.getByText('Decision saved.',{exact:true}).waitFor();await admin.close();
    }
    await page.reload();await page.getByRole('button',{name:/Final document/}).click();await page.getByRole('button',{name:'Submit assignment',exact:true}).click();assert.equal(await page.getByRole('button',{name:/^Write response/}).count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screens,`guided-${width}.png`),fullPage:true});
    if(width===390){
     await page.getByRole('button',{name:/^Upload file/}).click();await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'guided-browser.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByRole('button',{name:'Read final-document brief',exact:true}).click();await page.getByRole('heading',{name:'Project instructions',exact:true}).waitFor();await page.getByRole('navigation',{name:'Assignment views'}).getByRole('button',{name:'Workspace',exact:true}).click();assert.equal(await page.getByLabel('Choose file',{exact:true}).evaluate(el=>el.files[0]?.name),'guided-browser.pdf');
     let releaseTransfer;const holdTransfer=new Promise(resolve=>{releaseTransfer=resolve;});
     const isTransfer=r=>['POST','PATCH'].includes(r.method())&&r.url().includes('/storage/v1/upload/resumable');
     const pauseTransfer=async route=>{if(isTransfer(route.request()))await holdTransfer;await route.continue();};
     await page.route('**/*',pauseTransfer);
     try{
      const transferStarted=page.waitForRequest(isTransfer,{timeout:15000});
      await page.getByRole('button',{name:'Submit assignment',exact:true}).click();await transferStarted;
      await page.getByRole('button',{name:'Read final-document brief',exact:true}).click();await page.getByRole('heading',{name:'Project instructions',exact:true}).waitFor();
      await page.getByRole('navigation',{name:'Assignment views'}).getByRole('button',{name:'Workspace',exact:true}).click();
      assert.equal(await page.getByLabel('Choose file',{exact:true}).evaluate(el=>el.files[0]?.name),'guided-browser.pdf');
     }finally{releaseTransfer();}
     await page.getByRole('link',{name:'View submission',exact:true}).waitFor();await page.unroute('**/*',pauseTransfer);
     const attempt=ok(await root.from('submissions').select('*').eq('assignment_id',browserAid).eq('team_id',team).eq('is_current',true).single());paths.push(attempt.file_path);
     await page.reload();await page.getByRole('button',{name:/Final document/}).click();await page.getByRole('link',{name:'View submission',exact:true}).click();await page.getByRole('heading',{name:'Submission received',exact:true}).waitFor();
     const admin=await browser.newContext({viewport:{width,height:900}});await admin.addCookies(await cookies(lead));const ap=await admin.newPage();await ap.goto(`${app}/admin/submissions/${attempt.id}?cohort=${cohort}&week=${week}&assignment=${browserAid}`);await ap.getByText('Confirmed project direction',{exact:true}).click();await ap.getByText('Approved alternative',{exact:false}).waitFor();
     const dl=await ap.request.get(`${app}/api/submissions/${attempt.id}/download`);assert.equal(dl.status(),200);assert.ok((await dl.body()).equals(pdf));await ap.getByLabel('Request revision',{exact:true}).check();await ap.getByLabel('Feedback (required)',{exact:true}).fill('Clarify the evidence plan.');await ap.getByRole('button',{name:'Save review',exact:true}).click();await ap.getByText('Review saved.',{exact:true}).waitFor();
     await page.reload();await page.getByText('Clarify the evidence plan.',{exact:true}).waitFor();await page.getByRole('button',{name:'Revise submission',exact:true}).click();await page.getByRole('button',{name:/^Submit link/}).click();await page.getByLabel('Submission link',{exact:true}).fill('https://example.com/revised-guided-document');await page.getByRole('button',{name:'Revise submission',exact:true}).last().click();await page.getByRole('heading',{name:'Previous submissions',exact:true}).waitFor();await admin.close();
    }
    await ctx.close();
    const setup=await browser.newContext({viewport:{width,height:900}});await setup.addCookies(await cookies(lead));const sp=await setup.newPage();await sp.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);const panel=sp.locator('#guided-'+browserAid);await openAssignmentEditor(sp,browserAid,'Activity setup');await panel.getByRole('navigation',{name:'Guided project sections'}).getByRole('button',{name:'Team directions',exact:true}).click();await panel.getByRole('combobox').last().selectOption(otherTeam);await panel.getByLabel('Company',{exact:true}).fill('Edited fixture company '+width);await panel.getByRole('navigation',{name:'Guided project sections'}).getByRole('button',{name:'Overview',exact:true}).click();assert.equal(await panel.getByLabel('Company',{exact:true}).isVisible(),false);await panel.getByRole('navigation',{name:'Guided project sections'}).getByRole('button',{name:'Team directions',exact:true}).click();assert.equal(await panel.getByLabel('Company',{exact:true}).inputValue(),'Edited fixture company '+width);await panel.getByRole('button',{name:'Save team direction',exact:true}).click();await panel.getByText('Project settings saved.',{exact:true}).waitFor();await sp.reload();const savedPanel=sp.locator('#guided-'+browserAid);await openAssignmentEditor(sp,browserAid,'Activity setup');await savedPanel.getByRole('navigation',{name:'Guided project sections'}).getByRole('button',{name:'Team directions',exact:true}).click();await savedPanel.getByRole('combobox').last().selectOption(otherTeam);assert.equal(await savedPanel.getByLabel('Company',{exact:true}).inputValue(),'Edited fixture company '+width);assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await sp.screenshot({path:join(screens,`guided-admin-${width}.png`),fullPage:true});await setup.close();
    const actionManifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),activityId=Object.entries(actionManifest.node).find(([,v])=>v.exportedName==='recordActivity')?.[0];const preview=await browser.newContext({viewport:{width,height:900}});await preview.addCookies(await cookies(lead));const pp=await preview.newPage();let writes=0;pp.on('request',r=>{if(r.method()==='POST'&&(r.headers()['next-action']&&r.headers()['next-action']!==activityId||r.url().includes('/storage/')))writes++;});await pp.goto(`${app}/admin/preview/week/2/assignments/${browserAid}?cohort=${cohort}`);await pp.getByLabel('Sample team',{exact:true}).selectOption(team);await pp.getByRole('navigation',{name:'Assignment views'}).getByRole('button',{name:'Workspace',exact:true}).click();await pp.getByRole('button',{name:/Final document/}).click();await pp.getByRole('button',{name:'Preview submission',exact:true}).click();assert.equal(writes,0);await preview.close();
   }
   const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),actionId=Object.entries(manifest.node).find(([,v])=>v.exportedName==='saveGuidedProject')?.[0];assert.ok(actionId);
   const http=await browser.newContext();for(const user of [null,viewer,inactive,wrong,member]){const jar=user?await cookies(user):[];const response=await http.request.post(app+'/admin',{headers:{origin:app,'next-action':actionId,'content-type':'text/plain;charset=UTF-8',cookie:jar.map(v=>v.name+'='+v.value).join('; ')},data:JSON.stringify(['config',aid,configData,randomUUID()])});assert.match(response.headers()['x-action-redirect']??await response.text(),/login|access-denied/);}await http.close();
   const explore=await browser.newContext({viewport:{width:390,height:900}});await explore.addCookies(await cookies(viewer));const ep=await explore.newPage();let exploreWrites=0;const activityId=Object.entries(actionManifest.node).find(([,v])=>v.exportedName==='recordActivity')?.[0];ep.on('request',r=>{if(r.method()==='POST'&&(r.headers()['next-action']&&r.headers()['next-action']!==activityId||r.url().includes('/storage/')))exploreWrites++;});await ep.goto(`${app}/explore/week/2/assignments/${browserAid}?cohort=${cohort}`);assert.equal(await ep.getByLabel('Sample team',{exact:true}).count(),0);assert.doesNotMatch(await ep.locator('main').innerText(),/Private Team One Direction|Private Team Two Direction|Browser approved scope|Risk A · Item 1A page 5/);await ep.getByRole('navigation',{name:'Assignment views'}).getByRole('button',{name:'Workspace',exact:true}).click();await ep.getByRole('navigation',{name:'Project steps'}).getByRole('button',{name:/Final document/}).click();await ep.getByRole('button',{name:'Try submission preview',exact:true}).click();assert.equal(await ep.getByRole('button',{name:/^Write response/}).count(),0);assert.equal(exploreWrites,0);await explore.close();
   console.log('Guided screenshots: '+screens);}finally{await browser.close();}
  });
 }finally{
  if(paths.length)ok(await root.storage.from('submissions').remove(paths));
  await sql(`delete from private.guided_receipts where actor_id in(${users.map(u=>q(u.id)).join(',')||'null'});delete from private.guided_requests where assignment_id in(${q(aid)},${q(browserAid)});delete from private.guided_states where assignment_id in(${q(aid)},${q(browserAid)});delete from private.guided_recommendations where assignment_id in(${q(aid)},${q(browserAid)});delete from private.guided_configs where assignment_id in(${q(aid)},${q(browserAid)});delete from private.submission_requests where target_id in(select id from public.submission_targets where assignment_id in(${q(aid)},${q(browserAid)},${q(standard)}));delete from private.upload_intents where assignment_id in(${q(aid)},${q(browserAid)},${q(standard)});delete from public.submissions where assignment_id in(${q(aid)},${q(browserAid)},${q(standard)});delete from public.submission_targets where assignment_id in(${q(aid)},${q(browserAid)},${q(standard)});delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.team_memberships where team_id in(select id from public.cohort_teams where cohort_id=${q(cohort)});delete from public.cohort_teams where cohort_id=${q(cohort)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)}`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
  assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
 }
});
