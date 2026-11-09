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
import {makePdf} from '../test/pdf-fixtures.mjs';
const pdf=makePdf();


const exec = promisify(execFile);
const config = JSON.parse((await exec('./node_modules/.bin/supabase', ['status', '-o', 'json'])).stdout);
assert.equal(new URL(config.API_URL).hostname, '127.0.0.1');
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(config.API_URL, config.SERVICE_ROLE_KEY, opts);
const ok = r => { assert.ifError(r.error); return r.data; }, q = s => `'${String(s).replaceAll("'", "''")}'`;
const sql = async s => (await exec('docker', ['exec', 'supabase_db_gap', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', s])).stdout.trim();
const cohort = randomUUID(), week = randomUUID(), assignment = randomUUID(), sibling = randomUUID(), users = [];
const app = process.env.GAP_TEST_APP_URL;
if (app) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(app).hostname));
async function fixture(role) {
  const email = `gap-reader-${randomUUID()}@ucdavis.edu`, person = randomUUID();
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
const paths=[],examples=[];
async function submission(member,bytes=pdf,name='Evidence.pdf',expected){
 const intent=ok(await root.rpc('file_upload',{p_actor:member.id,p_action:'prepare',p_intent:null,p_data:{assignmentId:assignment,name,size:bytes.length,mime:'application/pdf',expectedId:expected?.id,expectedUpdatedAt:expected?.updated_at}}));paths.push(intent.path);
 ok(await member.client.storage.from('submissions').upload(intent.path,bytes,{contentType:'application/pdf'}));
 const receipt=ok(await root.rpc('file_upload',{p_actor:member.id,p_action:'finalize',p_intent:intent.id,p_data:{size:bytes.length,mime:'application/pdf'}}));
 return ok(await root.from('submissions').select('*').eq('id',receipt.submissionId??receipt.submission_id??receipt.id).single());
}
async function example(lead,bytes=pdf){
 const d=ok(await root.rpc('grading_example',{p_actor:lead.id,p_action:'prepare',p_id:null,p_data:{assignmentId:assignment,name:'Example.pdf',size:bytes.length,version:0}}));examples.push(d.path);
 ok(await lead.client.storage.from('grading-examples').upload(d.path,bytes,{contentType:'application/pdf'}));
 return ok(await root.rpc('grading_example',{p_actor:lead.id,p_action:'finalize',p_id:d.id,p_data:{size:bytes.length}}));
}
test('private PDF endpoints and reader on disposable local records',{timeout:240000},async t=>{
 assert.ok(app,'Set GAP_TEST_APP_URL to a local production server');
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'winter',2985,'2985-01-01','2985-03-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'PDF fixture','Disposable',true);insert into public.assignments(id,week_id,title,instructions,due_at,sort_order) values(${q(assignment)},${q(week)},'PDF grading','Public instructions',now()+interval '1 day',1),(${q(sibling)},${q(week)},'Next assignment','Next instructions',now()+interval '1 day',2);`);
  const lead=await fixture('admin'),member=await fixture('member'),viewer=await fixture('viewer'),other=await fixture('admin');
  await sql(`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(member.person)},${q(cohort)})`);
  // Both a historical and current PDF: opening history must not prefetch its bytes.
  const old=await submission(member,makePdf({padding:18*1024*1024}));const current=await submission(member,pdf,'Current résumé.pdf',old);
  ok(await member.client.rpc('submit_text',{p_assignment_id:sibling,p_text:'Next work'}));
  ok(await lead.client.rpc('save_grading_reference',{p_assignment:assignment,p_rubric:'## Evidence rubric\nExplain your evidence.',p_example:'## Example response\nCompare these records.',p_version:0}));
  const model=await example(lead);
  async function request(path,user){const cookies=user?await cookieJar(user):[];return fetch(app+path,{headers:{cookie:cookies.map(c=>`${c.name}=${c.value}`).join(';')}});}
  const resources=[`/api/submissions/${current.id}/pdf`,`/api/grading-examples/${model.id}/pdf`];
  await t.test('live admin, bytes, privacy, malformed IDs, non-PDF and revocation',async()=>{
   for(const path of resources){
    for(const u of [undefined,member,viewer])assert.equal((await request(path,u)).status,u?403:401);
    const r=await request(path,lead);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('cross-origin-resource-policy'),'same-origin');assert.match(r.headers.get('content-disposition'),/^inline;/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),pdf);
   }
   for(const change of ["active=false","active=true,role='viewer'"]){await sql(`update public.approved_members set ${change} where person_id=${q(other.person)}`);for(const path of resources)assert.equal((await request(path,other)).status,403);}
   await sql(`update public.approved_members set active=true,role='admin' where person_id=${q(other.person)};update auth.users set email='pdf-wrong@example.org' where id=${q(other.id)}`);
   for(const path of resources)assert.equal((await request(path,other)).status,403);
   await sql(`update auth.users set email=${q(other.email)} where id=${q(other.id)}`);
   assert.equal((await request('/api/submissions/not-a-document/pdf',lead)).status,404);
   const text=ok(await root.from('submissions').select('id').eq('assignment_id',sibling).single());assert.equal((await request(`/api/submissions/${text.id}/pdf`,lead)).status,404);
   assert.equal((await request(`/api/submissions/${old.id}/pdf`,lead)).status,200);
   assert.equal((await request(`/api/submissions/${current.id}/download`,member)).status,200,'existing owner download unchanged');
  });
  await t.test('desktop/phone controls, expansion, search, lazy reads, retry and feedback',{timeout:150000},async()=>{
   const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const shots=await mkdtemp(join(tmpdir(),'gap-pdf-'));
   const before=await sql(`select json_agg(s order by id) from public.submissions s where assignment_id in (${q(assignment)},${q(sibling)})`);
   try{for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:1000}});await ctx.addCookies(await cookieJar(lead));const page=await ctx.newPage();page.setDefaultTimeout(20000);const requests=[];const errors=[];
    let failPreview=true;await page.route(`**/api/submissions/${current.id}/pdf`,route=>{if(failPreview){failPreview=false;return route.fulfill({status:503,body:'Temporary failure'});}return route.continue();});
    page.on('request',r=>{if(/\/pdf$/.test(new URL(r.url()).pathname))requests.push(r.url());assert.ok(!/google.*viewer|cdnjs|unpkg/.test(r.url()));});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${app}/admin/submissions/${current.id}?cohort=${cohort}&week=${week}&status=all`);
    const reader=page.getByRole('dialog',{name:'PDF: Current résumé.pdf',exact:true});
    await reader.getByText('Could not load this PDF. Retry or download the original.',{exact:true}).waitFor();await page.getByLabel('Feedback (optional)',{exact:true}).fill('Retained on retry');await reader.getByRole('button',{name:'Retry preview',exact:true}).click();
    await reader.locator('canvas').first().waitFor();assert.equal(await page.getByLabel('Feedback (optional)',{exact:true}).inputValue(),'Retained on retry');await reader.getByRole('button',{name:'Next page',exact:true}).waitFor({state:'visible'});
    assert.deepEqual(errors,[]);assert.equal(await reader.getByText(/corrupt or unsupported/).count(),0);
    assert.ok(await reader.locator('canvas').first().evaluate(c=>c.width*c.height<=8_000_000));await reader.getByRole('button',{name:'Next page',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[aria-label="Page number"]')?.value==='2');await reader.getByRole('button',{name:'Previous page',exact:true}).click();
    await reader.getByRole('spinbutton',{name:'Page number',exact:true}).fill('2');await reader.getByRole('spinbutton',{name:'Page number',exact:true}).press('Enter');await page.waitForFunction(()=>document.querySelector('input[aria-label="Page number"]')?.value==='2');
    await reader.getByRole('button',{name:'Zoom in',exact:true}).click();await reader.getByRole('button',{name:'Fit width',exact:true}).click();
    await reader.getByRole('searchbox',{name:'Find',exact:true}).fill('Evidence');await reader.getByText(/of 2/).waitFor();await reader.getByRole('button',{name:'Zoom in',exact:true}).click();const savedPage=await reader.getByRole('spinbutton',{name:'Page number',exact:true}).inputValue();const savedZoom=await reader.getByText(/^\d+%$/).innerText();
    await page.getByLabel('Feedback (optional)',{exact:true}).fill('Keep this feedback.');await page.getByLabel('Request revision',{exact:true}).check();
    await reader.getByRole('button',{name:'Expand',exact:true}).click();const modal=page.getByRole('dialog',{name:'PDF: Current résumé.pdf',exact:true});await modal.waitFor();assert.equal(await modal.getByRole('spinbutton',{name:'Page number',exact:true}).inputValue(),savedPage);assert.equal(await modal.getByText(/^\d+%$/).innerText(),savedZoom);
    await page.screenshot({path:join(shots,`expanded-${width}.png`)});assert.equal(await modal.getByRole('searchbox',{name:'Find',exact:true}).inputValue(),'Evidence');await modal.getByRole('button',{name:'Close reader',exact:true}).focus();await page.keyboard.press('Escape');await reader.waitFor();await page.waitForFunction(()=>document.activeElement?.textContent==='Expand');assert.ok(await reader.getByRole('button',{name:'Expand',exact:true}).evaluate(e=>e===document.activeElement));
    assert.equal(requests.length,2,'expansion never refetches');
    await page.getByRole('tab',{name:'Example',exact:true}).click();const modelReader=page.getByRole('dialog',{name:'PDF: Example.pdf',exact:true});await modelReader.locator('canvas').first().waitFor();await page.getByRole('tab',{name:'Rubric',exact:true}).click();await page.getByRole('tab',{name:'Example',exact:true}).click();await modelReader.waitFor();assert.equal(requests.length,3,'tabs preserve parsed example');
    let dialogs=0;page.on('dialog',async d=>{dialogs++;await d.dismiss();});const download=page.waitForEvent('download');await reader.getByRole('link',{name:'Download',exact:true}).click();await download;assert.equal(dialogs,0,'downloading never discards feedback');
    const selected=await reader.locator('.textLayer span').first().evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);getSelection().removeAllRanges();getSelection().addRange(range);return getSelection().toString();});assert.match(selected,/Evidence/);
    await page.getByText('Previous submissions (1)',{exact:true}).click();assert.equal(requests.length,3);await page.getByRole('button',{name:'View PDF',exact:true}).click();await page.getByRole('dialog',{name:'PDF: Evidence.pdf',exact:true}).locator('canvas').first().waitFor();assert.equal(requests.length,4);
    assert.equal(await page.getByLabel('Feedback (required)',{exact:true}).inputValue(),'Keep this feedback.');assert.ok(await page.getByLabel('Request revision',{exact:true}).isChecked());
    await page.getByRole('link',{name:'← Review queue',exact:true}).click();assert.equal(dialogs,1,'actual navigation still warns');assert.ok(page.url().includes(current.id));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(shots,`reader-${width}.png`),fullPage:true});assert.deepEqual(errors,[]);
    await ctx.close();
   }console.log('PDF screenshots:',shots);}finally{await browser.close();}
   assert.equal(await sql(`select json_agg(s order by id) from public.submissions s where assignment_id in (${q(assignment)},${q(sibling)})`),before,'reader does not change submissions or reviews');
  });
  await t.test('scan, embedded font, password and corrupt previews',{timeout:90000},async()=>{
   const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
   const font=await readFile('node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf');
   const fixtures=[{name:'scanned',bytes:makePdf({scanned:true})},{name:'embedded-font',bytes:makePdf({font})},{name:'password',bytes:await readFile('test/fixtures/password-protected.pdf'),error:/Password-protected PDFs cannot be previewed/},{name:'corrupt',bytes:Buffer.from('%PDF-1.7\nNot a PDF\n%%EOF'),error:/corrupt or unsupported/},{name:'expired',status:401,bytes:Buffer.from('Sign in'),error:/session expired/},{name:'revoked',status:403,bytes:Buffer.from('Forbidden'),error:/Active admin access is required/}];
   try{for(const f of fixtures){
    const ctx=await browser.newContext();await ctx.addCookies(await cookieJar(lead));const page=await ctx.newPage();page.setDefaultTimeout(20000);
    await page.route(`**/api/submissions/${current.id}/pdf`,route=>route.fulfill({status:f.status??200,contentType:'application/pdf',body:f.bytes}));
    await page.goto(`${app}/admin/submissions/${current.id}?cohort=${cohort}&week=${week}&status=all`);
    const reader=page.getByRole('dialog',{name:'PDF: Current résumé.pdf',exact:true});
    if(f.error){await reader.getByText(f.error).waitFor();await reader.getByRole('button',{name:'Retry preview',exact:true}).waitFor();}
    else{await reader.locator('canvas').first().waitFor();assert.equal(await reader.getByText(/corrupt or unsupported/).count(),0);await reader.getByRole('searchbox',{name:'Find',exact:true}).fill('Evidence');await reader.getByText(f.name==='scanned'?'No matches':/of 2/).waitFor();}
    await reader.getByRole('link',{name:'Download',exact:true}).waitFor();await ctx.close();
   }}finally{await browser.close();}
  });
  await t.test('Save and review next replaces the PDF and assignment references',async()=>{
   const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
   try{
    const ctx=await browser.newContext();await ctx.addCookies(await cookieJar(lead));const page=await ctx.newPage();
    await page.goto(`${app}/admin/submissions/${current.id}?cohort=${cohort}&week=${week}&status=all`);
    await page.getByRole('dialog',{name:'PDF: Current résumé.pdf',exact:true}).locator('canvas').first().waitFor();
    await page.getByLabel('Feedback (optional)',{exact:true}).fill('Fixture review preserved.');await page.getByLabel('Request revision',{exact:true}).check();await page.getByRole('button',{name:'Save & review next',exact:true}).click();
    await page.waitForURL(url=>url.pathname.includes('/admin/submissions/')&&!url.pathname.includes(current.id));await page.getByText('Next work',{exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog',{name:'PDF: Current résumé.pdf',exact:true}).count(),0);assert.equal(await page.getByText('Evidence rubric',{exact:true}).count(),0);assert.equal(await page.getByLabel('Feedback (optional)',{exact:true}).inputValue(),'');
    const saved=ok(await root.from('submissions').select('status,feedback').eq('id',current.id).single());assert.equal(saved.status,'revision_requested');assert.equal(saved.feedback,'Fixture review preserved.');await ctx.close();
   }finally{await browser.close();}
  });
  await t.test('navigating away cancels an obsolete PDF request without rendering stale work',async()=>{
   const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
   try{
    const ctx=await browser.newContext();await ctx.addCookies(await cookieJar(lead));const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let held,seen;const requested=new Promise(resolve=>{seen=resolve;});
    await page.route(`**/api/submissions/${current.id}/pdf`,async route=>{held=route;seen();});
    await page.goto(`${app}/admin/submissions/${current.id}?cohort=${cohort}&week=${week}&status=all`);await requested;
    const failed=page.waitForEvent('requestfailed',{predicate:r=>r.url().endsWith(`/submissions/${current.id}/pdf`)});
    await page.getByRole('link',{name:'← Review queue',exact:true}).click();await page.waitForURL(url=>url.pathname==='/admin');await failed;
    await held.abort().catch(()=>{});assert.equal(await page.getByRole('dialog',{name:'PDF: Current résumé.pdf',exact:true}).count(),0);assert.deepEqual(errors,[]);await ctx.close();
   }finally{await browser.close();}
  });
 }finally{
  if(paths.length)ok(await root.storage.from('submissions').remove(paths));if(examples.length)ok(await root.storage.from('grading-examples').remove(examples));
  await sql(`delete from public.grading_example_documents where assignment_id=${q(assignment)};delete from public.assignment_grading_references where assignment_id=${q(assignment)};delete from private.upload_intents where assignment_id=${q(assignment)};update public.submissions set supersedes_submission_id=null where assignment_id in (${q(assignment)},${q(sibling)});delete from public.submissions where assignment_id in (${q(assignment)},${q(sibling)});delete from public.assignments where week_id=${q(week)};delete from public.program_weeks where id=${q(week)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
 }
});
