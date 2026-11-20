import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { pdf } from '../test/upload-fixtures.mjs';

const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),anon=createClient(config.API_URL,config.ANON_KEY,options);
const ok=result=>{assert.ifError(result.error);return result.data;},q=value=>`'${String(value).replaceAll("'","''")}'`;
const sql=async value=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',value])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),assignment=randomUUID(),second=randomUUID(),teamAssignment=randomUUID(),bulkAssignment=randomUUID(),draft=randomUUID(),users=[],paths=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));

async function fixture(role='member',settings={}) {
  const email=`gap-credit-${randomUUID()}@${settings.domain??'ucdavis.edu'}`,person=randomUUID(),enrollment=randomUUID();
  const id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;users.push({id,person});
  await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},${q(settings.name??'Completion Fixture')});insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},${q(settings.name??'Completion Fixture')},${q(role)},${settings.active!==false});${role==='viewer'?'':`insert into public.cohort_enrollments(id,person_id,cohort_id,is_test) values(${q(enrollment)},${q(person)},${q(cohort)},${!!settings.isTest})`}`);
  const client=createClient(config.API_URL,config.ANON_KEY,options),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
  return {id,person,enrollment,email,client};
}
const completion=(user,action='grant',aid=assignment,enrollment,credit)=>user.client.rpc('set_assignment_completion',{p_action:action,p_assignment:aid,p_enrollment:enrollment,p_credit:credit});
const submit=(user,aid=assignment)=>user.client.rpc('submit_response',{p_assignment:aid,p_type:'link',p_value:'https://example.com/own-work',p_request:randomUUID()});
async function cookies(user) {
  const jar=new Map(),ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(value=>jar.set(value.name,value.value))}});
  ok(await ssr.auth.setSession(ok(await user.client.auth.getSession()).session));return [...jar].map(([name,value])=>({name,value,url:app}));
}

test('manual completion grants credit without creating or sharing submissions',async t=>{
  try {
    await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2951,'2951-09-01','2951-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Legacy workshop','Local fixture workshop',true),(${q(draft)},${q(cohort)},2,'Draft','Private fixture',false);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(assignment)},${q(week)},'Legacy assignment','Complete the task',now()-interval '1 day',1,'individual'),(${q(second)},${q(week)},'Another assignment','Separate task',now()-interval '1 day',2,'individual'),(${q(teamAssignment)},${q(draft)},'Team task','Team task',now(),1,'team')`);
    const lead=await fixture('admin',{name:'Completion Lead'}),member=await fixture('member',{name:'Completion Member'}),other=await fixture(),viewer=await fixture('viewer'),inactive=await fixture('member',{active:false}),wrong=await fixture('admin',{domain:'example.com'}),tester=await fixture('member',{isTest:true});
    let credit;
    await t.test('live admins only; duplicate/concurrent grants retain one receipt and DB timestamp',async()=>{
      assert.ok((await anon.rpc('set_assignment_completion',{p_action:'grant',p_assignment:assignment,p_enrollment:member.enrollment})).error);
      for(const user of [member,viewer,inactive,wrong])assert.ok((await completion(user,'grant',assignment,member.enrollment)).error);
      const results=await Promise.all([completion(lead,'grant',assignment,member.enrollment),completion(lead,'grant',assignment,member.enrollment)]);credit=ok(results[0]);assert.equal(ok(results[1]),credit);
      const row=ok(await root.from('assignment_completions').select('*').eq('id',credit).single());assert.equal(row.granted_by,lead.person);assert.equal(row.revoked_at,null);assert.ok(Date.parse(row.granted_at)<=Date.now()+1000);
      assert.equal(ok(await completion(lead,'grant',assignment,member.enrollment)),credit);
      assert.equal(ok(await root.from('assignment_completions').select('granted_at').eq('id',credit).single()).granted_at,row.granted_at);
      assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(assignment)}`),'0');
    });
    await t.test('own-credit reads only; direct writes, cross-user reads and live revocation denied',async()=>{
      assert.equal(ok(await member.client.from('assignment_completions').select('id')).length,1);
      for(const user of [other,viewer,inactive,wrong])assert.equal(ok(await user.client.from('assignment_completions').select('id')).length,0);
      assert.ok((await member.client.from('assignment_completions').update({revoked_at:new Date().toISOString()}).eq('id',credit)).error);
      await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);assert.equal(ok(await member.client.from('assignment_completions').select('id')).length,0);await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
      await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await completion(lead,'revoke',assignment,member.enrollment,credit)).error);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
    });
    await t.test('credit blocks submissions; undo is audited and stale undo cannot revoke newer credit',async()=>{
      assert.ok((await submit(member)).error);
      assert.equal(ok(await completion(lead,'revoke',assignment,member.enrollment,credit)),credit);assert.equal(ok(await completion(lead,'revoke',assignment,member.enrollment,credit)),credit);
      const revoked=ok(await root.from('assignment_completions').select('*').eq('id',credit).single());assert.equal(revoked.revoked_by,lead.person);assert.ok(revoked.revoked_at);
      const newer=ok(await completion(lead,'grant',assignment,member.enrollment));assert.notEqual(newer,credit);ok(await completion(lead,'revoke',assignment,member.enrollment,credit));
      assert.equal(ok(await member.client.from('assignment_completions').select('id')).length,1);ok(await completion(lead,'revoke',assignment,member.enrollment,newer));
    });
    await t.test('existing work remains unchanged; invalid scope and team/draft credit denied',async()=>{
      const id=ok(await submit(other));const before=ok(await root.from('submissions').select('*').eq('id',id).single());
      assert.ok((await completion(lead,'grant',assignment,other.enrollment)).error);assert.deepEqual(ok(await root.from('submissions').select('*').eq('id',id).single()),before);
      assert.ok((await completion(lead,'grant',teamAssignment,member.enrollment)).error);assert.ok((await completion(lead,'unknown',assignment,member.enrollment)).error);
      assert.ok((await completion(lead,'grant',randomUUID(),member.enrollment)).error);assert.ok((await completion(lead,'grant',assignment,viewer.enrollment)).error);
      assert.ok((await completion(lead,'grant',assignment,inactive.enrollment)).error);
      await sql(`update public.assignments set submission_mode='individual' where id=${q(teamAssignment)}`);
      assert.ok((await completion(lead,'grant',teamAssignment,member.enrollment)).error);
      await sql(`update public.program_weeks set published=true where id=${q(draft)};update public.assignments set submission_mode='team' where id=${q(teamAssignment)}`);
      assert.ok((await completion(lead,'grant',teamAssignment,member.enrollment)).error);
      await sql(`update public.program_weeks set published=false where id=${q(draft)};update public.program_cohorts set state='archived' where id=${q(cohort)}`);
      assert.ok((await completion(lead,'grant',assignment,member.enrollment)).error);
      await sql(`update public.program_cohorts set state='active' where id=${q(cohort)}`);
      ok(await completion(lead,'grant',second,tester.enrollment));
    });
    await t.test('submission/grant race accepts one outcome and pending file finalization cannot bypass credit',async()=>{
      const results=await Promise.all([submit(member,second),completion(lead,'grant',second,member.enrollment)]);assert.equal(results.filter(result=>!result.error).length,1);
      const prepared=ok(await root.rpc('file_upload',{p_actor:member.id,p_action:'prepare',p_data:{assignmentId:assignment,name:'legacy.pdf',size:pdf.length,mime:'application/pdf'}}));paths.push(prepared.path);
      ok(await member.client.storage.from('submissions').upload(prepared.path,pdf,{contentType:'application/pdf'}));credit=ok(await completion(lead,'grant',assignment,member.enrollment));
      assert.ok((await root.rpc('file_upload',{p_actor:member.id,p_action:'finalize',p_intent:prepared.id,p_data:{size:pdf.length,mime:'application/pdf'}})).error);
      assert.equal(await sql(`select count(*) from public.submissions where assignment_id=${q(assignment)} and enrollment_id=${q(member.enrollment)}`),'0');
      ok(await completion(lead,'revoke',assignment,member.enrollment,credit));
    });
    await t.test('desktop/phone grant, reload, member completion and undo; direct HTTP action guards',{skip:!app},async()=>{
      const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-completion-'));
      const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),actionId=Object.entries(manifest.node).find(([,value])=>value.exportedName==='setAssignmentCompletion')?.[0];assert.ok(actionId);
      try {for(const width of [1280,390]) {
        const admin=await browser.newContext({viewport:{width,height:900}});await admin.addCookies(await cookies(lead));const page=await admin.newPage();await page.addInitScript(()=>{window.confirm=()=>false;});
        await page.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${assignment}&status=missing&q=${encodeURIComponent(member.email)}`);
        const button=page.getByRole('button',{name:'Mark complete',exact:true}).filter({visible:true});await button.waitFor();
        await button.click();const confirmation=page.getByRole('alertdialog');await confirmation.waitFor();assert.ok((await confirmation.innerText()).includes('No submission will be created.'));assert.equal(await confirmation.getByRole('button',{name:'Cancel',exact:true}).evaluate(element=>element===document.activeElement),true);await page.keyboard.press('Shift+Tab');assert.equal(await confirmation.getByRole('button',{name:'Mark complete',exact:true}).evaluate(element=>element===document.activeElement),true);await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await button.evaluate(element=>element===document.activeElement),true);await button.click();await confirmation.press('Escape');assert.equal(await confirmation.isVisible(),false);assert.equal(await sql(`select count(*) from public.assignment_completions where assignment_id=${q(assignment)} and enrollment_id=${q(member.enrollment)} and revoked_at is null`),'0');
        await button.click();await confirmation.screenshot({path:join(screens,`confirmation-${width}.png`)});await confirmation.getByRole('button',{name:'Mark complete',exact:true}).click();await page.getByRole('heading',{name:'No matching submissions',exact:true}).waitFor();
        const memberContext=await browser.newContext({viewport:{width,height:900}});await memberContext.addCookies(await cookies(member));const mp=await memberContext.newPage();
        await mp.goto(`${app}/week/1/assignments/${assignment}`);await mp.getByText('Your GAP lead marked this assignment complete. No submission is required.',{exact:true}).waitFor();assert.equal(await mp.getByRole('button',{name:'Submit assignment',exact:true}).count(),0);await mp.reload();await mp.getByText('Complete',{exact:true}).waitFor();assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:join(screens,`member-${width}.png`),fullPage:true});
        await page.getByRole('button',{name:/^Complete /}).click();await page.getByRole('button',{name:'Undo completion',exact:true}).filter({visible:true}).waitFor();await page.reload();await page.waitForLoadState('networkidle');await page.screenshot({path:join(screens,`admin-${width}.png`),fullPage:true});
        await page.getByRole('button',{name:'Undo completion',exact:true}).filter({visible:true}).click();await confirmation.getByRole('heading',{name:'Undo manual completion?',exact:true}).waitFor();await confirmation.getByRole('button',{name:'Undo completion',exact:true}).click();await page.getByRole('heading',{name:'No matching submissions',exact:true}).waitFor();
        await mp.reload();await mp.getByRole('button',{name:'Submit assignment',exact:true}).waitFor();await memberContext.close();await admin.close();
      }
      const context=await browser.newContext();for(const user of [null,member,viewer,inactive,wrong]) {
        const jar=user?await cookies(user):[];const response=await context.request.post(app+'/admin',{headers:{origin:app,'next-action':actionId,'content-type':'text/plain;charset=UTF-8',cookie:jar.map(value=>value.name+'='+value.value).join('; ')},data:JSON.stringify(['grant',assignment,member.enrollment])});assert.match(response.headers()['x-action-redirect']??await response.text(),/login|access-denied/);
      }await context.close();console.log('Completion screenshots: '+screens);
      }finally{await browser.close();}
    });
    await t.test('bulk visible selection, scope reset, partial failures and safe retry on desktop/phone',{skip:!app},async()=>{
      await sql(`insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,submission_mode) values(${q(bulkAssignment)},${q(week)},'Accidentally individual group work','One group response',now(),4,'individual')`);
      const one=await fixture('member',{name:'Bulk One'}),two=await fixture('member',{name:'Bulk Two'}),existing=await fixture('member',{name:'Bulk Submitted'});await fixture('member',{name:'Bulk Inactive',active:false});await fixture('member',{name:'Bulk Test',isTest:true});
      const existingId=ok(await submit(existing,bulkAssignment)),before=ok(await root.from('submissions').select('*').eq('id',existingId).single());
      const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-bulk-completion-'));
      const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),actionId=Object.entries(manifest.node).find(([,value])=>value.exportedName==='grantAssignmentCompletions')?.[0];assert.ok(actionId);
      try{for(const width of [1280,390]){
        const context=await browser.newContext({viewport:{width,height:1000}});await context.addCookies(await cookies(lead));const page=await context.newPage();await page.addInitScript(()=>{window.confirm=()=>false;});
        await page.goto(`${app}/admin?cohort=${cohort}&week=${week}&assignment=${bulkAssignment}&status=missing&q=Bulk`);
        const boxes=page.getByRole('checkbox').filter({visible:true}),bulkButton=page.getByRole('button',{name:'Mark selected complete',exact:true});await page.getByRole('button',{name:'Select all',exact:true}).waitFor();assert.equal(await boxes.count(),2);assert.equal(await bulkButton.isEnabled(),false);
        await page.getByRole('button',{name:'Select all',exact:true}).click();assert.equal(await page.getByRole('checkbox',{checked:true}).filter({visible:true}).count(),2);
        await page.getByRole('searchbox',{name:'Search members',exact:true}).fill('Bulk One');await page.getByText('0 of 1 selected',{exact:true}).waitFor();assert.equal(await bulkButton.isEnabled(),false);await boxes.first().check();await bulkButton.click();const dialog=page.getByRole('alertdialog');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await sql(`select count(*) from public.assignment_completions where assignment_id=${q(bulkAssignment)} and revoked_at is null`),'0');
        await page.getByRole('searchbox',{name:'Search members',exact:true}).fill('Bulk');await page.getByRole('button',{name:'Select all',exact:true}).click();await boxes.first().uncheck();assert.equal(await page.getByRole('checkbox',{checked:true}).filter({visible:true}).count(),1);await page.getByRole('button',{name:'Select all',exact:true}).click();await bulkButton.click();await dialog.getByRole('heading',{name:'Mark 2 assignments complete?',exact:true}).waitFor();assert.match(await dialog.innerText(),/Bulk One/);assert.match(await dialog.innerText(),/Bulk Two/);assert.ok(!(await dialog.innerText()).includes('Bulk Submitted'));await dialog.screenshot({path:join(screens,`bulk-confirm-${width}.png`)});
        await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await page.screenshot({path:join(screens,`bulk-selection-${width}.png`),fullPage:true});await bulkButton.click();
        if(width===1280){
          const racing=ok(await submit(two,bulkAssignment));await dialog.getByRole('button',{name:'Mark selected complete',exact:true}).click();await dialog.getByText('1 completed · 1 need attention',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Retry failed',exact:true}).click();await dialog.getByText('1 completed · 1 need attention',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await sql(`select count(*) from public.assignment_completions where assignment_id=${q(bulkAssignment)} and revoked_at is null`),'1');assert.equal(ok(await root.from('submissions').select('id').eq('id',racing)).length,1);
          await sql(`delete from private.submission_requests where target_id in(select id from public.submission_targets where assignment_id=${q(bulkAssignment)} and enrollment_id=${q(two.enrollment)});delete from public.submissions where id=${q(racing)};delete from public.submission_targets where assignment_id=${q(bulkAssignment)} and enrollment_id=${q(two.enrollment)}`);
        }else{
          let interrupted=false;await page.route('**/admin**',route=>{if(!interrupted&&route.request().headers()['next-action']===actionId){interrupted=true;return route.abort();}return route.continue();});await dialog.getByRole('button',{name:'Mark selected complete',exact:true}).click();await dialog.getByRole('button',{name:'Retry failed',exact:true}).waitFor();assert.equal(await sql(`select count(*) from public.assignment_completions where assignment_id=${q(bulkAssignment)} and revoked_at is null`),'0');await dialog.getByRole('button',{name:'Retry failed',exact:true}).click();await page.getByRole('status').filter({hasText:'2 assignment credits granted.'}).waitFor();assert.equal(await dialog.isVisible(),false);assert.equal(await sql(`select count(*) from public.assignment_completions where assignment_id=${q(bulkAssignment)} and revoked_at is null`),'2');
        }
        assert.deepEqual(ok(await root.from('submissions').select('*').eq('id',existingId).single()),before);assert.equal(await sql(`select count(*) from public.assignment_completions c join public.cohort_enrollments e on e.id=c.enrollment_id where c.assignment_id=${q(bulkAssignment)} and e.is_test`),'0');
        for(const row of ok(await root.from('assignment_completions').select('*').eq('assignment_id',bulkAssignment).is('revoked_at',null)))ok(await completion(lead,'revoke',bulkAssignment,row.enrollment_id,row.id));await context.close();
      }
      const http=await browser.newContext();for(const user of [null,member,viewer,inactive,wrong]){const jar=user?await cookies(user):[];const response=await http.request.post(app+'/admin',{headers:{origin:app,'next-action':actionId,'content-type':'text/plain;charset=UTF-8',cookie:jar.map(value=>value.name+'='+value.value).join('; ')},data:JSON.stringify([[{assignmentId:bulkAssignment,enrollmentId:one.enrollment}]])});assert.match(response.headers()['x-action-redirect']??await response.text(),/login|access-denied/);}
      const jar=await cookies(lead),invalid=await http.request.post(app+'/admin',{headers:{origin:app,'next-action':actionId,'content-type':'text/plain;charset=UTF-8',cookie:jar.map(value=>value.name+'='+value.value).join('; ')},data:JSON.stringify([[{assignmentId:bulkAssignment,enrollmentId:one.enrollment},{assignmentId:'bad',enrollmentId:two.enrollment}]])});assert.match(await invalid.text(),/Invalid completion selection/);assert.equal(await sql(`select count(*) from public.assignment_completions where assignment_id=${q(bulkAssignment)} and revoked_at is null`),'0');await http.close();console.log('Bulk completion screenshots: '+screens);
      }finally{await browser.close();}
    });
  }finally{
    if(paths.length)ok(await root.storage.from('submissions').remove(paths));
    await sql(`delete from public.assignment_completions where enrollment_id in(select id from public.cohort_enrollments where cohort_id=${q(cohort)});delete from private.submission_requests where target_id in(select id from public.submission_targets where assignment_id in(${q(assignment)},${q(second)},${q(teamAssignment)},${q(bulkAssignment)}));delete from private.upload_intents where assignment_id in(${q(assignment)},${q(second)},${q(teamAssignment)},${q(bulkAssignment)});delete from public.submissions where assignment_id in(${q(assignment)},${q(second)},${q(teamAssignment)},${q(bulkAssignment)});delete from public.submission_targets where assignment_id in(${q(assignment)},${q(second)},${q(teamAssignment)},${q(bulkAssignment)});delete from public.assignments where week_id in(${q(week)},${q(draft)});delete from public.program_weeks where cohort_id=${q(cohort)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)}`);
    for(const user of users){await sql(`delete from public.profiles where id=${q(user.id)};delete from public.approved_members where person_id=${q(user.person)};delete from public.people where id=${q(user.person)}`);ok(await root.auth.admin.deleteUser(user.id));}
    assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
  }
});
