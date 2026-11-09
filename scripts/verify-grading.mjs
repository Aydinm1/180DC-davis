import { openAssignmentEditor } from './lib/week-editor.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { pdf } from '../test/upload-fixtures.mjs';
import { cleanupGradingExamples } from './lib/cleanup-grading-examples.mjs';

const exec = promisify(execFile);
const config = JSON.parse((await exec('./node_modules/.bin/supabase', ['status', '-o', 'json'])).stdout);
assert.equal(new URL(config.API_URL).hostname, '127.0.0.1');
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(config.API_URL, config.SERVICE_ROLE_KEY, opts), anon = createClient(config.API_URL, config.ANON_KEY, opts);
const ok = r => { assert.ifError(r.error); return r.data; }, q = s => `'${String(s).replaceAll("'", "''")}'`;
const sql = async s => (await exec('docker', ['exec', 'supabase_db_gap', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', s])).stdout.trim();
const cohort = randomUUID(), week = randomUUID(), assignment = randomUUID(), sibling = randomUUID(), users = [];
const app = process.env.GAP_TEST_APP_URL;
if (app) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(app).hostname));
async function fixture(role) {
  const email = `gap-grading-${randomUUID()}@ucdavis.edu`, person = randomUUID();
  const id = ok(await root.auth.admin.createUser({ email, email_confirm: true })).user.id;
  users.push({ id, person, email });
  await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());
    insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Grading Fixture');
    insert into public.approved_members(person_id,email,full_name,role) values(${q(person)},${q(email)},'Grading Fixture',${q(role)});`);
  const client = createClient(config.API_URL, config.ANON_KEY, opts), link = ok(await root.auth.admin.generateLink({ type: 'magiclink', email }));
  ok(await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })); ok(await client.rpc('sync_profile'));
  return { id, person, email, client };
}
async function cookieJar(user) {
  const jar = new Map();
  const ssr = createServerClient(config.API_URL, config.ANON_KEY, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: values => values.forEach(c => jar.set(c.name,c.value)) } });
  ok(await ssr.auth.setSession(ok(await user.client.auth.getSession()).session));
  return [...jar].map(([name,value]) => ({ name,value,url:app }));
}
const rpc = async (u, action, id, data = {}) => ok(await root.rpc('grading_example', { p_actor: u.id, p_action: action, p_id: id, p_data: data }));
const prepare = (u, version, aid = assignment) => rpc(u, 'prepare', null, { assignmentId: aid, name: 'Model résumé.pdf', size: pdf.length, version });
const upload = (u, d) => u.client.storage.from('grading-examples').upload(d.path, pdf, { contentType: 'application/pdf' });
const save = (u, version, rubric, example = '', aid = assignment) => u.client.rpc('save_grading_reference', { p_assignment: aid,p_rubric:rubric,p_example:example,p_version:version });

test('private grading references use disposable local records', async t => {
  try {
    await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'winter',2986,'2986-01-01','2986-03-01','active');
      insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Grading fixture','Disposable learning',true);
      insert into public.assignments(id,week_id,title,instructions,due_at,sort_order) values(${q(assignment)},${q(week)},'Research fixture','Public instructions',now()+interval '1 day',1),(${q(sibling)},${q(week)},'Second fixture','Public second instructions',now()+interval '1 day',2);`);
    const lead = await fixture('admin'), member = await fixture('member'), viewer = await fixture('viewer'), other = await fixture('admin');
    await sql(`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(member.person)},${q(cohort)})`);
    ok(await member.client.rpc('submit_text', { p_assignment_id: assignment, p_text: 'Fixture member response' }));
    ok(await member.client.rpc('submit_text', { p_assignment_id: sibling, p_text: 'Second fixture response' }));
    // Keep the existing assignment PDF independently addressable throughout every test.
    const brief = ok(await root.rpc('assignment_brief', { p_actor: lead.id,p_action:'prepare',p_data:{assignmentId:assignment,name:'Public assignment.pdf',size:pdf.length} }));
    ok(await lead.client.storage.from('assignment-briefs').upload(brief.path,pdf,{contentType:'application/pdf'}));
    ok(await root.rpc('assignment_brief',{p_actor:lead.id,p_action:'finalize',p_id:brief.id,p_data:{size:pdf.length}}));
    let current;
    await t.test('text is optional, private, versioned, duplicate-safe and assignment-specific', async () => {
      assert.ok((await save({client:anon},0,'forged')).error);
      for (const u of [member,viewer]) { assert.ok((await save(u,0,'forged')).error); assert.equal(ok(await u.client.from('assignment_grading_references').select('*')).length,0); }
      const r = ok(await save(lead,0,'## Private criteria\n- **Evidence** required','## Model answer\nA private example.'));
      assert.equal(r.text_version,1);
      assert.equal(ok(await save(lead,0,r.rubric,r.example)).text_version,1,'lost save response retry');
      assert.ok((await save(other,0,'stale')).error);
      assert.ok((await save(lead,1,'x'.repeat(50001))).error);
      assert.ok((await save(lead,1,null)).error);
      const results=await Promise.all([save(lead,1,'First concurrent'),save(other,1,'Second concurrent')]);
      assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.filter(r=>r.error?.code==='40001').length,1);
      ok(await save(lead,2,'## Private criteria\n- **Evidence** required','## Model answer\nA private example.'));
      ok(await save(lead,0,'Sibling only','',sibling));
      assert.equal(ok(await lead.client.from('assignment_grading_references').select('*').eq('assignment_id',sibling).single()).rubric,'Sibling only');
      for(const u of [member,viewer]) assert.equal(ok(await u.client.from('assignment_grading_references').select('*').eq('assignment_id',assignment)).length,0);
      assert.ok((await member.client.from('assignment_grading_references').update({rubric:'forged'}).eq('assignment_id',assignment)).error);
    });
    await t.test('example upload paths and committed downloads require live admins', async () => {
      assert.ok((await lead.client.rpc('grading_example',{p_actor:lead.id,p_action:'prepare'})).error);
      assert.ok((await root.rpc('grading_example',{p_actor:member.id,p_action:'prepare'})).error);
      assert.ok((await anon.rpc('cleanup_grading_examples',{})).error);
      const d=await prepare(lead,0);
      for(const u of [member,viewer,other]) assert.ok((await upload(u,d)).error);
      assert.ok((await lead.client.storage.from('grading-examples').upload('forged.pdf',pdf,{contentType:'application/pdf'})).error);
      ok(await upload(lead,d));
      assert.ok((await lead.client.storage.from('grading-examples').download(d.path)).error,'pending PDF unreadable');
      current=await rpc(lead,'finalize',d.id,{size:pdf.length});
      assert.deepEqual(await rpc(lead,'finalize',d.id,{size:pdf.length}),current);
      for(const u of [member,viewer]) {
        assert.equal(ok(await u.client.from('grading_example_documents').select('*')).length,0);
        assert.ok((await u.client.storage.from('grading-examples').download(d.path)).error);
        assert.equal(ok(await u.client.storage.from('grading-examples').list(lead.id)).length,0);
      }
      assert.equal(ok(await other.client.storage.from('grading-examples').download(d.path)).size,pdf.length);
      assert.ok((await lead.client.storage.from('grading-examples').upload(d.path,pdf,{contentType:'application/pdf',upsert:true})).error);
      await lead.client.storage.from('grading-examples').remove([d.path]);
      assert.equal(ok(await lead.client.storage.from('grading-examples').download(d.path)).size,pdf.length,'direct client delete denied');
      await sql(`update public.approved_members set active=false where person_id=${q(other.person)}`);
      assert.ok((await other.client.storage.from('grading-examples').download(d.path)).error);
      assert.ok((await save(other,3,'inactive')).error);
      await sql(`update public.approved_members set active=true,role='member' where person_id=${q(other.person)}`);
      assert.ok((await other.client.storage.from('grading-examples').download(d.path)).error);
      assert.ok((await save(other,3,'revoked')).error);
      await sql(`update public.approved_members set role='admin' where person_id=${q(other.person)}`);
      assert.equal(ok(await member.client.storage.from('assignment-briefs').download(brief.path)).size,pdf.length,'public assignment PDF unchanged');
    });
    await t.test('concurrent replacements, removal tombstones, historical bytes and rollback', async () => {
      const a=await prepare(lead,1),b=await prepare(lead,1);ok(await upload(lead,a));ok(await upload(lead,b));
      const results=await Promise.all([rpc(lead,'finalize',a.id,{size:pdf.length}),rpc(lead,'finalize',b.id,{size:pdf.length})]);
      assert.equal(results.filter(r=>r.state==='ready').length,1);assert.equal(results.filter(r=>r.error==='stale').length,1);
      assert.equal(ok(await lead.client.storage.from('grading-examples').download(current.path)).size,pdf.length,'retained original');
      const pending=await prepare(lead,2);
      ok(await upload(lead,pending));
      assert.equal((await rpc(other,'remove',null,{assignmentId:assignment,version:2})).version,3);
      assert.equal((await rpc(lead,'finalize',pending.id,{size:pdf.length})).error,'stale');
      assert.equal(await sql(`select count(*) from public.grading_example_documents where assignment_id=${q(assignment)} and is_current`),'0');
      const replacement=await prepare(lead,3);ok(await upload(lead,replacement));
      assert.ok((await root.rpc('grading_example',{p_actor:lead.id,p_action:'finalize',p_id:replacement.id,p_data:{size:1}})).error);
      assert.equal(await sql(`select file_version from public.assignment_grading_references where assignment_id=${q(assignment)}`),'3');
      current=await rpc(lead,'finalize',replacement.id,{size:pdf.length});
      const canceled=await prepare(lead,4);assert.equal((await rpc(lead,'cancel',canceled.id)).state,'abandoned');assert.ok((await upload(lead,canceled)).error);
    });
    await t.test('fixture-scoped cleanup is retryable and cannot delete committed PDFs',async()=>{
      const expired=await prepare(lead,4);ok(await upload(lead,expired));
      await sql(`update public.grading_example_documents set expires_at=now()-interval '1 second' where id=${q(expired.id)}`);
      await Promise.all([rpc(lead,'finalize',expired.id,{size:pdf.length}),cleanupGradingExamples(root,lead.id)]);
      assert.equal(await sql(`select state from public.grading_example_documents where id=${q(expired.id)}`),'abandoned');
      await exec(process.execPath,['scripts/cleanup-grading-examples.mjs','--owner',lead.id]);
      assert.ok((await root.storage.from('grading-examples').download(expired.path)).error);
      ok(await root.storage.from('grading-examples').upload(expired.path,pdf,{contentType:'application/pdf'})); // Simulate late transfer completion.
      await sql(`update public.grading_example_documents set cleanup_after=null where id=${q(expired.id)}`);
      const failing={rpc:(...a)=>root.rpc(...a),storage:{from:()=>({remove:async()=>({error:new Error('fixture failure')})})}};
      assert.equal((await cleanupGradingExamples(failing,lead.id)).failed,1);
      assert.equal(await sql(`select cleanup_failed from public.grading_example_documents where id=${q(expired.id)}`),'t');
      await sql(`update public.grading_example_documents set cleanup_after=null where id=${q(expired.id)}`);
      await exec(process.execPath,['scripts/cleanup-grading-examples.mjs','--owner',lead.id]);
      assert.ok((await root.storage.from('grading-examples').download(expired.path)).error);
      assert.equal(ok(await lead.client.storage.from('grading-examples').download(current.path)).size,pdf.length);
    });
    await t.test('direct HTTP actions/downloads reject unauthorized and malformed requests',{skip:!app},async()=>{
      const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
      const actionId=name=>Object.entries(manifest.node).find(([,entry])=>entry.exportedName===name)?.[0];
      async function call(name,args,u){const cookies=u?await cookieJar(u):[];const r=await fetch(app+`/admin/weeks/${week}?cohort=${cohort}`,{method:'POST',redirect:'manual',headers:{'next-action':actionId(name),'content-type':'text/plain;charset=UTF-8',origin:app,cookie:cookies.map(c=>`${c.name}=${c.value}`).join(';')},body:JSON.stringify(args)});return{r,text:await r.text()};}
      const before=await sql(`select row_to_json(r) from public.assignment_grading_references r where assignment_id=${q(assignment)}`);
      for(const u of [undefined,member,viewer]){
        for(const [name,args] of [['saveGradingReference',[{assignmentId:assignment,rubric:'forged',example:'',textVersion:3}]],['prepareExample',[assignment,{name:'forged.pdf',size:pdf.length,type:'application/pdf'},4]],['finalizeExample',[current.id]],['cancelExample',[current.id]],['removeExample',[assignment,4]]]){
          const {r,text}=await call(name,args,u);assert.ok(r.status>=300||/NEXT_REDIRECT|access-denied|login/.test(text));
        }
        const c=u?await cookieJar(u):[];const r=await fetch(app+`/api/grading-examples/${current.id}/download`,{headers:{cookie:c.map(x=>`${x.name}=${x.value}`).join(';')}});assert.equal(r.status,u?404:401);
      }
      for(const bad of [null,{assignmentId:assignment,rubric:[],example:'',textVersion:3},{assignmentId:randomUUID(),rubric:'forged',example:'',textVersion:0}])assert.match((await call('saveGradingReference',[bad],lead)).text,/error/);
      const stale=await call('saveGradingReference',[{assignmentId:assignment,rubric:'stale',example:'',textVersion:0}],lead);assert.match(stale.text,/changed/);
      const headers={cookie:(await cookieJar(lead)).map(c=>`${c.name}=${c.value}`).join(';')};
      const downloaded=await fetch(app+`/api/grading-examples/${current.id}/download`,{headers});assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),pdf);
      await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);
      assert.match((await call('saveGradingReference',[{assignmentId:assignment,rubric:'revoked',example:'',textVersion:3}],lead)).text,/NEXT_REDIRECT|access-denied/);
      await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
      await sql(`update public.approved_members set active=false where person_id=${q(lead.person)}`);
      assert.match((await call('prepareExample',[assignment,{name:'denied.pdf',size:pdf.length,type:'application/pdf'},4],lead)).text,/NEXT_REDIRECT|access-denied/);
      assert.equal((await fetch(app+`/api/grading-examples/${current.id}/download`,{headers})).status,404);
      await sql(`update public.approved_members set active=true where person_id=${q(lead.person)}; update auth.users set email='fixture-wrong-domain@example.org' where id=${q(lead.id)}`);
      assert.match((await call('saveGradingReference',[{assignmentId:assignment,rubric:'wrong domain',example:'',textVersion:3}],lead)).text,/NEXT_REDIRECT|access-denied/);
      await sql(`update auth.users set email=${q(lead.email)} where id=${q(lead.id)}`);
      assert.equal(await sql(`select row_to_json(r) from public.assignment_grading_references r where assignment_id=${q(assignment)}`),before);
    });
    await t.test('desktop/phone editor, private comparison, recovery and review navigation',{skip:!app,timeout:180000},async()=>{
      const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
      const screenshots=await mkdtemp(join(tmpdir(),'gap-grading-'));
      const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
      const actionId=name=>Object.entries(manifest.node).find(([,entry])=>entry.exportedName===name)?.[0];
      try{for(const width of [1280,390]){
        const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});await ctx.addCookies(await cookieJar(lead));const page=await ctx.newPage();page.setDefaultTimeout(20000);
        await page.goto(app+`/admin/weeks/${week}?cohort=${cohort}`);
        const editor=page.locator(`#grading-${assignment}`);await openAssignmentEditor(page,assignment,'Grading reference');
        await editor.getByLabel('Rubric',{exact:true}).fill(`## Private criteria ${width}\n- **Evidence** required`);
        await editor.getByLabel('Example response',{exact:true}).fill('## Model answer\nUse a credible source.');
        await page.getByRole('navigation',{name:'Week sections',exact:true}).getByRole('button',{name:'Overview',exact:true}).click();await page.getByLabel('Title',{exact:true}).first().fill('Unsaved public title');await openAssignmentEditor(page,assignment,'Grading reference');
        if(width===1280){
          let fail=true;
          await page.route('**/*',route=>{if(fail&&route.request().headers()['next-action']===actionId('saveGradingReference')){fail=false;return route.abort('failed');}return route.continue();});
          await editor.getByRole('button',{name:'Save grading reference',exact:true}).click();await editor.getByText(/Could not save grading reference/).waitFor();
          assert.match(await editor.getByLabel('Rubric',{exact:true}).inputValue(),/Private criteria/);await page.unroute('**/*');
        }
        await editor.getByRole('button',{name:'Save grading reference',exact:true}).click();await editor.getByText('Grading reference saved.',{exact:true}).waitFor();
        assert.equal(await sql(`select title from public.program_weeks where id=${q(week)}`),'Grading fixture','reference save does not save week draft');
        await editor.getByLabel('Choose example PDF',{exact:true}).setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('fake')});
        await editor.getByRole('button',{name:/^(Replace|Upload) example PDF$/}).click();await editor.getByText(/not a valid matching PDF/).waitFor();
        await editor.getByRole('button',{name:'Cancel upload',exact:true}).click();await editor.getByText('Upload canceled.',{exact:true}).waitFor();
        if(width===1280){
          await editor.getByLabel('Choose example PDF',{exact:true}).setInputFiles({name:'Cancel transfer.pdf',mimeType:'application/pdf',buffer:pdf});
          let signal;const reached=new Promise(resolve=>{signal=resolve;});
          await page.route('**/storage/v1/upload/resumable**',route=>{signal();return route.abort('failed');});
          await editor.getByRole('button',{name:/^(Replace|Upload) example PDF$/}).click();await reached;
          await editor.getByRole('button',{name:'Cancel upload',exact:true}).click();
          try { await editor.getByText('Upload canceled.',{exact:true}).waitFor(); }
          catch(error) { console.log('Cancellation state: '+await editor.locator('[role="status"]').allTextContents());throw error; }
          await page.unroute('**/storage/v1/upload/resumable**');
        }
        await editor.getByLabel('Choose example PDF',{exact:true}).setInputFiles({name:`Model ${width}.pdf`,mimeType:'application/pdf',buffer:pdf});
        if(width===1280){
          let lose=true;
          await page.route('**/*',async route=>{if(lose&&route.request().headers()['next-action']===actionId('finalizeExample')){lose=false;await route.fetch();return route.abort('failed');}return route.continue();});
          await editor.getByRole('button',{name:/^(Replace|Upload) example PDF$/}).click();await editor.getByRole('button',{name:'Retry upload / save',exact:true}).waitFor();
          await editor.getByText(`Selected: Model ${width}.pdf`,{exact:true}).waitFor();await page.unroute('**/*');
          await editor.getByRole('button',{name:'Retry upload / save',exact:true}).click();
        }else await editor.getByRole('button',{name:/^(Replace|Upload) example PDF$/}).click();
        await editor.getByText('Example PDF attached.',{exact:true}).waitFor();
        page.once('dialog',d=>d.accept());await page.reload();await openAssignmentEditor(page,assignment,'Grading reference');
        assert.match(await editor.getByLabel('Rubric',{exact:true}).inputValue(),new RegExp(`Private criteria ${width}`));
        await editor.getByRole('link',{name:`Download Model ${width}.pdf`,exact:true}).waitFor();
        const latest=ok(await member.client.from('submissions').select('*').eq('assignment_id',assignment).eq('is_current',true).single());
        await page.goto(app+`/admin/submissions/${latest.id}?cohort=${cohort}&week=${week}&status=all`);
        await page.getByRole('heading',{name:'Submitted work',exact:true}).waitFor();await page.getByLabel('Feedback (optional)',{exact:true}).fill('Keep this feedback while comparing.');
        await page.getByRole('tab',{name:'Example',exact:true}).click();await page.getByRole('heading',{name:'Model answer',exact:true}).waitFor();
        assert.equal(await page.getByLabel('Feedback (optional)',{exact:true}).inputValue(),'Keep this feedback while comparing.');
        const href=await page.getByRole('link',{name:'Download',exact:true}).getAttribute('href');assert.equal((await ctx.request.get(app+href)).status(),200);
        await page.getByRole('tab',{name:'Rubric',exact:true}).click();await page.getByRole('heading',{name:`Private criteria ${width}`,exact:true}).waitFor();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screenshots,`review-${width}.png`),fullPage:true});
        page.once('dialog',d=>d.dismiss());await page.getByRole('link',{name:'Edit reference →',exact:true}).click();assert.ok(page.url().includes('/admin/submissions/'));
        await page.getByRole('button',{name:'Save review',exact:true}).click();await page.getByText('Review saved.',{exact:true}).waitFor();
        await page.reload();await page.getByRole('heading',{name:`Private criteria ${width}`,exact:true}).waitFor();
        await page.getByRole('button',{name:'Save & review next',exact:true}).click();
        await page.waitForURL(url=>url.pathname.includes('/admin/submissions/')&&!url.pathname.includes(latest.id));
        await page.getByText('Sibling only',{exact:true}).waitFor();
        assert.equal(await page.getByRole('heading',{name:`Private criteria ${width}`,exact:true}).count(),0);
        assert.ok(page.url().includes('week='+week));assert.ok(!page.url().includes('assignment='));
        await page.goto(app+`/admin/weeks/${week}?cohort=${cohort}#grading-${assignment}`);
        await editor.getByRole('link',{name:`Download Model ${width}.pdf`,exact:true}).waitFor();
        page.once('dialog',d=>d.dismiss());await editor.getByRole('button',{name:'Remove example PDF',exact:true}).click();
        await editor.getByRole('link',{name:`Download Model ${width}.pdf`,exact:true}).waitFor();
        page.once('dialog',d=>d.accept());await editor.getByRole('button',{name:'Remove example PDF',exact:true}).click();await editor.getByText('Example PDF removed.',{exact:true}).waitFor();
        assert.equal(await editor.getByRole('link',{name:`Download Model ${width}.pdf`,exact:true}).count(),0);
        await editor.getByLabel('Rubric',{exact:true}).fill('Unsaved protected reference');
        page.once('dialog',d=>d.dismiss());await page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Members',exact:true}).click();
        assert.ok(page.url().includes('/admin/weeks/'));assert.equal(await editor.getByLabel('Rubric',{exact:true}).inputValue(),'Unsaved protected reference');
        await editor.getByRole('button',{name:'Save grading reference',exact:true}).click();await editor.getByText('Grading reference saved.',{exact:true}).waitFor();
        await ctx.close();
        for(const u of [member,viewer]){
          const c=await browser.newContext({viewport:{width,height:900}});await c.addCookies(await cookieJar(u));const p=await c.newPage();await p.goto(app+(u===viewer?`/explore/week/1/assignments/${assignment}?cohort=${cohort}`:`/week/1/assignments/${assignment}`));await p.getByText('Public instructions',{exact:true}).waitFor();assert.equal(await p.getByText(`Private criteria ${width}`,{exact:true}).count(),0);const body=await (await c.request.get(p.url())).text();assert.ok(!body.includes(`Private criteria ${width}`));assert.ok(!body.includes('Unsaved protected reference'));await c.close();
        }
      }console.log('Grading screenshots: '+screenshots);}finally{await browser.close();}
    });
  } finally {
    for(const bucketTable of [['grading-examples','grading_example_documents'],['assignment-briefs','assignment_documents']]){
      const paths=await sql(`select path from public.${bucketTable[1]} where assignment_id in (${q(assignment)},${q(sibling)})`);
      if(paths)ok(await root.storage.from(bucketTable[0]).remove(paths.split('\n')));
    }
    await sql(`delete from public.grading_example_documents where assignment_id in (${q(assignment)},${q(sibling)});delete from public.assignment_grading_references where assignment_id in (${q(assignment)},${q(sibling)});
      update public.assignment_documents set expected_id=null where assignment_id=${q(assignment)};delete from public.assignment_documents where assignment_id=${q(assignment)};
      update public.submissions set supersedes_submission_id=null where assignment_id in (${q(assignment)},${q(sibling)});delete from public.submissions where assignment_id in (${q(assignment)},${q(sibling)});
      delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
    for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
    assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
  }
});
