import assert from 'node:assert/strict';
import test from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {openAssignmentEditor} from './lib/week-editor.mjs';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,opts),anon=createClient(config.API_URL,config.ANON_KEY,opts);
const ok=r=>{assert.ifError(r.error);return r.data;},q=v=>`'${String(v).replaceAll("'","''")}'`;
const sql=async v=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',v])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),aid=randomUUID(),browserAid=randomUUID(),unconfigured=randomUUID(),users=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
const ids=Array.from({length:7},()=>randomUUID());
const content={overview:'## Investigation overview\n\nFind the fictional suspect in your workbook.',workbookUrl:'https://example.com/student-workbook',acceptedNames:['Fictional Person','F. Person'],gradingGuidance:'PRIVATE GRADING GUIDANCE',stages:[{id:ids[0],title:'Normalize',hints:[{id:ids[1],title:'Cleanup',body:'PRIVATE FIRST HINT `=TRIM(PROPER(E2))`',optional:false},{id:ids[2],title:'Second hint',body:'PRIVATE SECOND HINT',optional:false}]},{id:ids[3],title:'Find the holder',hints:[{id:ids[4],title:'First time test',body:'PRIVATE TIME HINT',optional:false},{id:ids[5],title:'Optional combined time test',body:'PRIVATE OPTIONAL HINT',optional:true},{id:ids[6],title:'Holder name',body:'PRIVATE HOLDER HINT',optional:false}]}]};
async function fixture(role='member',settings={}){
 const person=randomUUID(),enrollment=randomUUID(),email=`gap-investigation-${randomUUID()}@${settings.domain??'ucdavis.edu'}`;
 const id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Investigation Fixture');insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Investigation Fixture',${q(role)},${settings.active!==false});${role==='member'?`insert into public.cohort_enrollments(id,person_id,cohort_id,is_test) values(${q(enrollment)},${q(person)},${q(cohort)},${settings.test===true});`:''}`);
 const client=createClient(config.API_URL,config.ANON_KEY,opts),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));return {client,id,person,enrollment};
}
const mutate=(u,action,data,assignment=aid,request=randomUUID())=>u.client.rpc('mutate_investigation',{p_action:action,p_assignment:assignment,p_data:data,p_request:request});
const read=async(u,assignment=aid,preview=false)=>ok(await u.client.rpc('read_investigation',{p_assignment:assignment,p_preview:preview}));
const answer=(version,name='Fictional Person',reason='Badge event A precedes unlock B; checkout C spans the crime window.')=>({version,name,reason,expectedId:null,expectedUpdatedAt:null});
async function cookies(user){const jar=new Map(),ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(v=>jar.set(v.name,v.value))}});ok(await ssr.auth.setSession(ok(await user.client.auth.getSession()).session));return [...jar].map(([name,value])=>({name,value,url:app}));}
test('spreadsheet investigation lifecycle and security',async t=>{
 try {
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2957,'2957-09-01','2957-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},3,'Spreadsheet investigation','Disposable local fixture',false);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values${[aid,browserAid,unconfigured].map((id,i)=>`(${q(id)},${q(week)},${q(i===1?'Browser investigation':'Spreadsheet investigation')},'Investigate the spreadsheet',now()+interval '1 day',${i+1},'individual')`).join(',')}`);
  const lead=await fixture('admin'),member=await fixture(),other=await fixture(),tester=await fixture('member',{test:true}),viewer=await fixture('viewer'),inactive=await fixture('member',{active:false}),wrong=await fixture('admin',{domain:'example.com'});
  await t.test('private configuration, readiness and unpublished content',async()=>{
   for(const u of [member,viewer,inactive,wrong])assert.ok((await mutate(u,'configure',{version:0,content})).error);
   assert.ok((await anon.rpc('read_investigation',{p_assignment:aid})).error);
   assert.ok((await mutate(lead,'configure',{version:0,content:{...content,acceptedNames:[]}})).error);
   for(const id of [aid,browserAid])ok(await mutate(lead,'configure',{version:0,content},id));
   assert.ok((await member.client.rpc('read_investigation',{p_assignment:aid})).error);
   assert.equal(await sql(`select bool_and(c.relrowsecurity and not has_table_privilege('authenticated',c.oid,'SELECT') and not has_table_privilege('service_role',c.oid,'SELECT')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relkind='r' and c.relname like 'investigation_%'`),'t');
   ok(await root.from('assignments').update({workflow:'investigation'}).eq('id',unconfigured));
   assert.ok((await root.from('program_weeks').update({published:true}).eq('id',week)).error);
   ok(await root.from('assignments').update({workflow:'standard'}).eq('id',unconfigured));
   ok(await root.from('program_weeks').update({published:true}).eq('id',week));
  });
  await t.test('progressive and optional reveals, duplicate receipts, no draft overwrites',async()=>{
   const clean=JSON.stringify(await read(member));for(const secret of ['Fictional Person','PRIVATE FIRST HINT','PRIVATE SECOND HINT','PRIVATE GRADING GUIDANCE'])assert.ok(!clean.includes(secret));
   assert.ok((await mutate(member,'reveal',{version:0,hintId:ids[2]})).error);
   const d=answer(0,'Draft suspect','My locally saved evidence'),request=randomUUID();ok(await mutate(member,'draft',d,aid,request));ok(await mutate(member,'draft',d,aid,request));
   assert.ok((await mutate(member,'draft',{...d,reason:'changed'},aid,request)).error);
   ok(await mutate(member,'reveal',{version:1,hintId:ids[1]}));ok(await mutate(member,'reveal',{version:1,hintId:ids[1]}));
   let state=await read(member);assert.equal(state.run.version,1);assert.equal(state.run.reason,d.reason);assert.match(state.stages[0].hints[0].body,/PRIVATE FIRST/);assert.equal(state.stages[0].hints[1].body,null);
   ok(await mutate(member,'reveal',{version:1,hintId:ids[4]}));ok(await mutate(member,'reveal',{version:1,hintId:ids[6]}));
   state=await read(member);assert.equal(state.stages[1].hints[1].body,null);assert.match(state.stages[1].hints[2].body,/PRIVATE HOLDER/);
   assert.equal((await read(other)).run,null);assert.equal((await read(viewer,aid,true)).config,null);
  });
  await t.test('wrong names preserve draft, normalization and atomic hint snapshots',async()=>{
   let result=ok(await mutate(member,'submit',answer(1,'Wrong suspect')));assert.equal(result.incorrect,true);
   let state=await read(member);assert.equal(state.run.name,'Wrong suspect');assert.equal(state.submission,null);
   const responses=await Promise.all([mutate(member,'draft',answer(2)),mutate(member,'draft',answer(2))]);assert.equal(responses.filter(r=>!r.error).length,1);assert.equal(responses.find(r=>r.error).error.code,'40001');
   const request=randomUUID(),data=answer(3,'\tＦｉｃｔｉｏｎａｌ　 Person\n');result=ok(await mutate(member,'submit',data,aid,request));assert.ok(result.submissionId);assert.deepEqual(ok(await mutate(member,'submit',data,aid,request)),result);
   state=await read(member);assert.equal(state.submission.status,'submitted');assert.equal(state.run.version,4);
   const ref=ok(await lead.client.rpc('investigation_review',{p_submission:result.submissionId}));assert.equal(ref.hints.length,3);assert.equal(ref.reason,data.reason);assert.equal(ref.guidance,content.gradingGuidance);
   ok(await mutate(member,'reveal',{version:4,hintId:ids[5]}));assert.equal(ok(await lead.client.rpc('investigation_review',{p_submission:result.submissionId})).hints.length,3);
   const zero=ok(await mutate(other,'submit',answer(0,'F. Person')));assert.equal(ok(await lead.client.rpc('investigation_review',{p_submission:zero.submissionId})).hints.length,0);
   const insights=ok(await lead.client.rpc('investigation_insights',{p_assignment:aid}));assert.equal(insights.hints.find(h=>h.id===ids[1]).opened,1);assert.equal(insights.participants.find(p=>p.enrollmentId===member.enrollment).hints.length,4);
  });
  await t.test('revision replacement, frozen snapshots and completion only after review',async()=>{
   const state=await read(member),old=state.submission.id;
   ok(await lead.client.rpc('review_submission',{p_data:{id:old,status:'revision_requested',feedback:'Clarify the key timestamps',expectedUpdatedAt:state.submission.updatedAt}}));
   const revised=await read(member);const data={...answer(4,'Fictional Person','Revised evidence cites event D and key E.'),expectedId:old,expectedUpdatedAt:revised.submission.updatedAt};
   const result=ok(await mutate(member,'submit',data));assert.notEqual(result.submissionId,old);assert.equal(ok(await lead.client.rpc('investigation_review',{p_submission:old})).hints.length,3);assert.equal(ok(await lead.client.rpc('investigation_review',{p_submission:result.submissionId})).hints.length,4);
   const current=await read(member);ok(await lead.client.rpc('review_submission',{p_data:{id:result.submissionId,status:'completed',feedback:'Evidence approved',expectedUpdatedAt:current.submission.updatedAt}}));
   assert.ok((await mutate(member,'draft',answer(5))).error);ok(await mutate(member,'reveal',{version:5,hintId:ids[2]}));
   assert.equal((await read(member)).submission.status,'completed');
  });
  await t.test('participation, revocation, cross-member reads and forged submission paths',async()=>{
   assert.ok((await anon.rpc('mutate_investigation',{p_action:'draft',p_assignment:aid,p_data:answer(0),p_request:randomUUID()})).error);
   for(const u of [viewer,inactive,wrong]){assert.ok((await mutate(u,'draft',answer(0))).error);assert.ok((await u.client.rpc('investigation_insights',{p_assignment:aid})).error);assert.ok((await u.client.rpc('investigation_review',{p_submission:(await read(member)).submission.id})).error);}
   for(const type of ['text','link'])assert.ok((await other.client.rpc('submit_response',{p_assignment:aid,p_type:type,p_value:type==='text'?'Fictional Person':'https://example.com',p_request:randomUUID()})).error);
   assert.equal((await lead.client.rpc('set_assignment_completion',{p_action:'grant',p_assignment:aid,p_enrollment:tester.enrollment})).error?.code,'42501');
   assert.equal((await root.rpc('file_upload',{p_actor:other.id,p_action:'prepare',p_data:{assignmentId:aid,name:'x.pdf',size:10,mime:'application/pdf'}})).error?.code,'42501');
   assert.ok((await other.client.from('submissions').insert({assignment_id:aid,enrollment_id:other.enrollment,submission_type:'text',submitted_text:'forged'})).error);
   ok(await mutate(tester,'reveal',{version:0,hintId:ids[1]}));assert.equal(ok(await lead.client.rpc('investigation_insights',{p_assignment:aid,p_test:true})).hints[0].opened,1);assert.equal(ok(await lead.client.rpc('investigation_insights',{p_assignment:aid})).hints[0].opened,1);
   await sql(`update public.cohort_enrollments set participation_status='withdrew' where id=${q(tester.enrollment)}`);assert.ok((await tester.client.rpc('read_investigation',{p_assignment:aid})).error);
   await sql(`update public.approved_members set active=false where person_id=${q(other.person)}`);assert.ok((await mutate(other,'reveal',{version:1,hintId:ids[1]})).error);await sql(`update public.approved_members set active=true where person_id=${q(other.person)}`);
   const unapproved=await fixture();await sql(`delete from public.approved_members where person_id=${q(unapproved.person)}`);assert.ok((await mutate(unapproved,'draft',answer(0))).error);
   const cross=await fixture();await sql(`delete from public.cohort_enrollments where id=${q(cross.enrollment)}`);assert.ok((await mutate(cross,'draft',{...answer(0),enrollmentId:other.enrollment})).error);
   ok(await root.from('program_cohorts').update({state:'archived'}).eq('id',cohort));assert.ok((await mutate(other,'draft',answer(1))).error);ok(await root.from('program_cohorts').update({state:'active'}).eq('id',cohort));
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await lead.client.rpc('investigation_insights',{p_assignment:aid})).error);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
   ok(await root.from('program_weeks').update({published:false}).eq('id',week));assert.ok((await mutate(lead,'configure',{version:1,content})).error);assert.ok((await root.from('assignments').update({workflow:'standard'}).eq('id',aid)).error);ok(await root.from('program_weeks').update({published:true}).eq('id',week));
  });
  await t.test('prepared-upload Storage/finalization bypass rolls back; hint/submission race snapshots serialize',async()=>{
   const state=await read(other),intent=randomUUID(),sid=randomUUID(),path=`${other.id}/${aid}/${sid}-forged.pdf`,bytes=Buffer.from('%PDF-1.7\nfixture');
   const target=await sql(`select target_id from public.submissions where id=${q(state.submission.id)}`);
   await sql(`insert into private.upload_intents(id,owner_id,assignment_id,enrollment_id,target_id,submission_id,path,original_filename,expected_size,mime_type,expected_id,expected_updated_at) values(${q(intent)},${q(other.id)},${q(aid)},${q(other.enrollment)},${q(target)},${q(sid)},${q(path)},'forged.pdf',${bytes.length},'application/pdf',${q(state.submission.id)},${q(state.submission.updatedAt)})`);
   try{
    assert.ok((await other.client.storage.from('submissions').upload(path,bytes,{contentType:'application/pdf'})).error);
    ok(await root.storage.from('submissions').upload(path,bytes,{contentType:'application/pdf'}));
    assert.equal((await root.rpc('file_upload',{p_actor:other.id,p_action:'finalize',p_intent:intent,p_data:{size:bytes.length,mime:'application/pdf'}})).error?.code,'42501');
    assert.equal((await read(other)).submission.id,state.submission.id);assert.equal(await sql(`select state from private.upload_intents where id=${q(intent)}`),'pending');
   }finally{ok(await root.storage.from('submissions').remove([path]));await sql(`delete from private.upload_intents where id=${q(intent)}`);}
   const u=await fixture(),request=randomUUID();const results=await Promise.all([mutate(u,'submit',answer(0),aid,request),mutate(u,'reveal',{version:0,hintId:ids[1]})]);results.forEach(ok);
   const reference=ok(await lead.client.rpc('investigation_review',{p_submission:results[0].data.submissionId}));assert.ok(reference.hints.length===0||reference.hints.length===1);
   const original=JSON.stringify(reference);ok(await mutate(u,'reveal',{version:1,hintId:ids[2]}));assert.equal(JSON.stringify(ok(await lead.client.rpc('investigation_review',{p_submission:results[0].data.submissionId}))),original);
  });
  await t.test('desktop/phone workspace, input retention, review and zero-write preview',{skip:!app},async()=>{
   const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const screens=await mkdtemp(join(tmpdir(),'gap-investigation-'));
   try{
   const setupCtx=await browser.newContext({viewport:{width:1280,height:900}});await setupCtx.addCookies(await cookies(lead));const setup=await setupCtx.newPage();
   ok(await root.from('program_weeks').update({published:false}).eq('id',week));
   await setup.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);await openAssignmentEditor(setup,unconfigured,'Activity setup');const ui=setup.locator('section[aria-label="Activity setup"]:visible');await ui.getByRole('combobox',{name:/^Workflow/}).selectOption('investigation');
   await setup.getByRole('button',{name:'Save investigation',exact:true}).click();await setup.getByText('Enter a valid student workbook URL.',{exact:true}).waitFor();
   await ui.getByLabel('Student workbook URL',{exact:true}).fill('https://example.com/student-only');await ui.getByLabel('Canonical suspect name — private',{exact:true}).fill('Fixture configured name');await ui.getByLabel('Accepted variants — one per line',{exact:true}).fill('Alias\n');
   await setup.getByRole('button',{name:'Save investigation',exact:true}).click();await setup.getByText('Investigation saved.',{exact:true}).waitFor();
   let configured=await read(lead,unconfigured,true);assert.equal(configured.stages.length,4);assert.equal(configured.stages.flatMap(s=>s.hints).length,15);assert.deepEqual(configured.config.acceptedNames,['Fixture configured name','Alias']);
   await setup.setViewportSize({width:390,height:900});assert.ok(await setup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await setup.screenshot({path:join(screens,'setup-390.png'),fullPage:true});await setup.setViewportSize({width:1280,height:900});
   await setup.getByRole('button',{name:'Stages and hints',exact:true}).click();await ui.getByRole('combobox',{name:/^Stage/}).selectOption({index:3});await ui.getByRole('combobox',{name:/^Hint/}).selectOption({index:3});assert.equal(await ui.getByLabel('Optional reveal — does not block later hints',{exact:true}).isChecked(),true);await ui.getByLabel('Hint content',{exact:true}).fill('Unsaved formula edits');
   ok(await mutate(lead,'configure',{version:configured.configVersion,content:{...configured.config,overview:'Another admin updated the overview.'}},unconfigured));
   await setup.getByRole('button',{name:'Save investigation',exact:true}).click();await setup.getByText('Configuration changed. Copy your edits before reloading',{exact:true}).waitFor();assert.equal(await ui.getByLabel('Hint content',{exact:true}).inputValue(),'Unsaved formula edits');
   await setupCtx.close();ok(await root.from('program_weeks').update({published:true}).eq('id',week));
   for(const width of [1280,390]){
    const u=await fixture();const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(u));const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${app}/week/3/assignments/${browserAid}`);await page.getByRole('button',{name:'Open workspace →',exact:true}).click();
    await page.getByRole('button',{name:'Stage 1',exact:true}).focus();await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Stage 2',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await page.getByRole('button',{name:'Stage 2',exact:true}).getAttribute('aria-current'),'step');await page.getByRole('button',{name:'Stage 1',exact:true}).click();
    await page.getByLabel('Suspect’s name').fill('Wrong');await page.getByLabel('Supporting evidence').fill('My evidence stays here while opening hints.');
    let fail=true;await page.route('**/week/3/assignments/'+browserAid,route=>{if(fail&&route.request().method()==='POST'){fail=false;return route.abort();}return route.continue();});
    await page.getByRole('button',{name:'Reveal next hint',exact:true}).click();await page.getByText(/Could not confirm the save|Save could not be confirmed/).waitFor();assert.equal(await page.getByLabel('Supporting evidence').inputValue(),'My evidence stays here while opening hints.');
    await page.getByRole('button',{name:'Reveal next hint',exact:true}).click();await page.getByText('Hint opened.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Supporting evidence').inputValue(),'My evidence stays here while opening hints.');await page.getByText('=TRIM(PROPER(E2))',{exact:true}).waitFor();
    if(width===1280){
     ok(await mutate(u,'draft',answer(0,'Remote saved name','Saved from another device.'),browserAid));
     await page.getByRole('button',{name:'Reveal next hint',exact:true}).click();await page.getByText('PRIVATE SECOND HINT',{exact:true}).waitFor();
     await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Your response changed in another tab. Copy your input before reloading',{exact:true}).waitFor();assert.equal(await page.getByLabel('Supporting evidence').inputValue(),'My evidence stays here while opening hints.');
     await page.reload();await page.getByLabel('Suspect’s name').waitFor();assert.equal(await page.getByLabel('Suspect’s name').inputValue(),'Remote saved name');
     await page.getByLabel('Suspect’s name').fill('Wrong');await page.getByLabel('Supporting evidence').fill('My evidence stays here while opening hints.');
    }
    await page.getByRole('button',{name:'Submit conclusion',exact:true}).click();await page.getByText(/That name doesn’t match/).waitFor();assert.equal(await page.getByLabel('Suspect’s name').inputValue(),'Wrong');
    await page.reload();await page.getByLabel('Suspect’s name').waitFor();assert.equal(await page.getByLabel('Supporting evidence').inputValue(),'My evidence stays here while opening hints.');
    await page.getByRole('button',{name:'Stage 2',exact:true}).click();await page.getByRole('button',{name:'Reveal optional combined time test',exact:true}).click();await page.getByText('PRIVATE OPTIONAL HINT',{exact:true}).waitFor();
    await page.getByLabel('Suspect’s name').fill('Fictional Person');await page.getByRole('button',{name:'Submit conclusion',exact:true}).click();await page.getByText('Conclusion submitted for review.',{exact:true}).waitFor();
    const sub=(await read(u,browserAid)).submission.id;assert.equal((await read(u,browserAid)).submission.status,'submitted');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screens,`workspace-${width}.png`),fullPage:true});
    const opened=width===1280?3:2;const adminCtx=await browser.newContext({viewport:{width,height:900}});await adminCtx.addCookies(await cookies(lead));const ap=await adminCtx.newPage();await ap.goto(`${app}/admin/submissions/${sub}?cohort=${cohort}`);await ap.getByText(`Hints opened before this submission · ${opened}`,{exact:true}).waitFor();await ap.getByRole('textbox').last().fill('Feedback persists while viewing hints');await ap.getByText(`Hints opened before this submission · ${opened}`,{exact:true}).click();assert.equal(await ap.getByRole('textbox').last().inputValue(),'Feedback persists while viewing hints');await ap.screenshot({path:join(screens,`review-${width}.png`),fullPage:true});
    await ap.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${browserAid}`);await ap.getByText('Hint insights · Official',{exact:true}).click();await ap.getByRole('heading',{name:'Hints opened',exact:true}).waitFor();assert.ok(await ap.getByText(new RegExp(`${opened} opened`)).count());
    await ap.screenshot({path:join(screens,`insights-${width}.png`),fullPage:true});await adminCtx.close();assert.deepEqual(errors,[]);await ctx.close();
   }
   const previewCtx=await browser.newContext();await previewCtx.addCookies(await cookies(lead));const pp=await previewCtx.newPage();const before=await sql(`select count(*) from private.investigation_receipts`);await pp.goto(`${app}/admin/preview/week/3/assignments/${browserAid}?cohort=${cohort}`);await pp.getByRole('button',{name:'Open workspace →',exact:true}).click();await pp.getByRole('button',{name:'Reveal next hint',exact:true}).click();await pp.getByText('=TRIM(PROPER(E2))',{exact:true}).waitFor();assert.equal(await sql(`select count(*) from private.investigation_receipts`),before);await previewCtx.close();console.log('Investigation screenshots: '+screens);
   const viewerCtx=await browser.newContext();await viewerCtx.addCookies(await cookies(viewer));const vp=await viewerCtx.newPage();await vp.goto(`${app}/explore/week/3/assignments/${browserAid}?cohort=${cohort}`);await vp.getByText('Fictional practice · Nothing is saved or submitted.',{exact:true}).waitFor();await vp.getByRole('heading',{name:'Investigation overview',exact:true}).waitFor();assert.equal(await vp.getByRole('link',{name:'Open student workbook ↗',exact:true}).getAttribute('href'),content.workbookUrl);const html=await vp.content();for(const secret of ['PRIVATE FIRST HINT','PRIVATE GRADING GUIDANCE','Fictional Person'])assert.ok(!html.includes(secret));await vp.getByRole('button',{name:'Open workspace →',exact:true}).click();await vp.getByRole('button',{name:'Reveal next hint',exact:true}).click();await vp.getByText('In this fictional example, compare the badge and door records for the same person.',{exact:true}).waitFor();await viewerCtx.close();
   }finally{await browser.close();}
  });
  await t.test('forged application actions cannot configure or mutate another role’s investigation',{skip:!app},async()=>{
   const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));const action=Object.entries(manifest.node).find(([,v])=>v.exportedName==='saveInvestigation')?.[0];assert.ok(action);
   const fingerprint=()=>sql(`select jsonb_build_array((select count(*) from private.investigation_runs where assignment_id=${q(aid)}),(select count(*) from private.investigation_reveals v join private.investigation_runs r on r.id=v.run_id where r.assignment_id=${q(aid)}),(select count(*) from public.submissions where assignment_id=${q(aid)}))::text`);const before=await fingerprint();
   for(const [u,operation] of [[null,'draft'],[viewer,'draft'],[inactive,'reveal'],[wrong,'configure'],[other,'configure']]){
    const jar=u?await cookies(u):[];const response=await fetch(`${app}/week/3/assignments/${aid}`,{method:'POST',redirect:'manual',headers:{origin:app,'next-action':action,'content-type':'text/plain;charset=UTF-8',cookie:jar.map(c=>c.name+'='+c.value).join('; ')},body:JSON.stringify([operation,aid,{version:0,name:'',reason:'',hintId:ids[1]},randomUUID()])});const body=await response.text();assert.ok(response.status>=300||/Access denied|access-denied|login|Could not save/.test(body));assert.ok(!body.includes('PRIVATE GRADING GUIDANCE')&&!body.includes('PRIVATE SECOND HINT'));
   }
   assert.equal(await fingerprint(),before);
  });
 }finally {
  await sql(`delete from private.investigation_receipts where actor_id in(${users.map(u=>q(u.id)).join(',')||'null'});delete from private.investigation_attempts where assignment_id in(${q(aid)},${q(browserAid)},${q(unconfigured)});delete from private.investigation_reveals where run_id in(select id from private.investigation_runs where assignment_id in(${q(aid)},${q(browserAid)},${q(unconfigured)}));delete from private.investigation_runs where assignment_id in(${q(aid)},${q(browserAid)},${q(unconfigured)});delete from private.investigation_configs where assignment_id in(${q(aid)},${q(browserAid)},${q(unconfigured)});delete from public.submissions where assignment_id in(${q(aid)},${q(browserAid)});delete from public.submission_targets where assignment_id in(${q(aid)},${q(browserAid)});delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)}`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
 }
});
