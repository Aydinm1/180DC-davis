import {showReview} from './lib/review-workspace.mjs';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHmac } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { Upload } from 'tus-js-client';
import { pdf, office } from '../test/upload-fixtures.mjs';
import { fileMime } from '../src/lib/uploads/format.ts';
import { inspectFile } from '../src/lib/uploads/inspect.ts';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyImageSubmissions } from './lib/image-submissions.mjs';

const exec = promisify(execFile);
const config = JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options = { auth:{persistSession:false,autoRefreshToken:false} };
const admin = createClient(config.API_URL,config.SERVICE_ROLE_KEY,options);
const anonymous = createClient(config.API_URL,config.ANON_KEY,options);
const q = value => `'${String(value).replaceAll("'","''")}'`;
async function sql(query) { return (await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',query])).stdout.trim(); }
const ok = result => { assert.ifError(result.error); return result.data; };
const cohort = randomUUID(), week = randomUUID(), assignment = randomUUID();
const users = [], paths = [];
async function fixture(role='member') {
  const email=`gap-file-test-${randomUUID()}@ucdavis.edu`;
  const user=ok(await admin.auth.admin.createUser({email,email_confirm:true})).user;
  const person=randomUUID(); users.push({id:user.id,person});
  await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at) values (${q(user.id)},${q(user.id)},jsonb_build_object('sub',${q(user.id)},'email',${q(email)},'email_verified',true),'google',now(),now(),now());
  insert into public.people(id,email,full_name) values (${q(person)},${q(email)},'File Test');
  insert into public.approved_members(person_id,email,full_name,role) values (${q(person)},${q(email)},'File Test',${q(role)});
  ${role === 'viewer' ? '' : `insert into public.cohort_enrollments(person_id,cohort_id) values (${q(person)},${q(cohort)});`}`);
  const link=ok(await admin.auth.admin.generateLink({type:'magiclink',email}));
  const client=createClient(config.API_URL,config.ANON_KEY,options);
  ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
  ok(await client.rpc('sync_profile'));
  return {id:user.id,person,client};
}
async function rpc(user,action,intent,data={}) { return ok(await admin.rpc('file_upload',{p_actor:user.id,p_action:action,p_intent:intent,p_data:data})); }
async function prepare(user,ext='pdf',expected,bytes=pdf) {
  const i=await rpc(user,'prepare',null,{assignmentId:assignment,name:`Résumé final.${ext}`,size:bytes.length,mime:fileMime(`a.${ext}`),expectedId:expected?.id,expectedUpdatedAt:expected?.updated_at});
  assert.ok(i.path,JSON.stringify(i)); paths.push(i.path); return i;
}
async function upload(user,i,bytes=pdf) { ok(await user.client.storage.from('submissions').upload(i.path,bytes,{contentType:i.mime,upsert:false})); }
async function finalize(user,i) {
  const blob=ok(await admin.storage.from('submissions').download(i.path));
  const bytes=Buffer.from(await blob.arrayBuffer()); await inspectFile(bytes,i.name,blob.type,i.size);
  return rpc(user,'finalize',i.id,{size:bytes.length,mime:i.mime});
}
async function current(user) { return ok(await user.client.from('submissions').select('*').eq('assignment_id',assignment).eq('is_current',true).maybeSingle()); }
async function cookieJar(user) {
  const jar=new Map();
  if(user) {
    const session=ok(await user.client.auth.getSession()).session;
    const ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(v=>jar.set(v.name,v.value))}});
    ok(await ssr.auth.setSession(session));
  }
  return jar;
}
async function downloadRoute(user,id) {
  const jar=await cookieJar(user);
  return fetch(`${process.env.GAP_TEST_APP_URL}/api/submissions/${id}/download`,{headers:{cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; ')},redirect:'manual'});
}
test('private Storage lifecycle using isolated local accounts',async t=>{
  try {
    await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values (${q(cohort)},'spring',2998,'2998-04-01','2998-06-01','active');
    insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values (${q(week)},${q(cohort)},1,'File test','Disposable',true);
    insert into public.assignments(id,week_id,title,instructions,due_at) values (${q(assignment)},${q(week)},'File test','Disposable',now());`);
    const member=await fixture(),other=await fixture(),lead=await fixture('admin');
    let first;
    await t.test('private intent grants and exact-path uploads',async()=>{
      assert.ok((await member.client.rpc('file_upload',{p_actor:member.id,p_action:'prepare'})).error);
      assert.ok((await anonymous.rpc('cleanup_uploads')).error);
      const i=await prepare(member);
      assert.ok((await other.client.storage.from('submissions').upload(i.path,pdf,{contentType:i.mime})).error);
      assert.ok((await anonymous.storage.from('submissions').upload(i.path,pdf,{contentType:i.mime})).error);
      assert.ok((await member.client.storage.from('submissions').upload(`${member.id}/${assignment}/${randomUUID()}-forged.pdf`,pdf,{contentType:i.mime})).error);
      await upload(member,i);
      assert.ok((await member.client.storage.from('submissions').download(i.path)).error);
      assert.ok((await lead.client.storage.from('submissions').download(i.path)).error);
      assert.equal((await current(member)),null);
      first=await finalize(member,i); assert.equal(first.state,'committed');
      assert.deepEqual(await finalize(member,i),first);
      assert.ok((await member.client.storage.from('submissions').upload(i.path,pdf,{contentType:i.mime,upsert:true})).error);
      await member.client.storage.from('submissions').remove([i.path]);
      assert.equal(ok(await member.client.storage.from('submissions').download(i.path)).size,pdf.length);
      assert.equal(ok(await lead.client.storage.from('submissions').download(i.path)).size,pdf.length);
      assert.ok((await other.client.storage.from('submissions').download(i.path)).error);
      assert.deepEqual(ok(await other.client.storage.from('submissions').list(member.id)),[]);
      assert.ok((await anonymous.storage.from('submissions').download(i.path)).error);
      assert.ok((await admin.rpc('file_upload',{p_actor:other.id,p_action:'get',p_intent:i.id})).error);
    });
    await t.test('Office replacements preserve historical attachments and stale tokens',async()=>{
      for (const ext of ['docx','pptx','xlsx']) {
        const previous=await current(member), bytes=office(ext), i=await prepare(member,ext,previous,bytes);
        await upload(member,i,bytes); assert.equal((await finalize(member,i)).state,'committed');
        assert.equal(ok(await member.client.storage.from('submissions').download(previous.file_path)).size,previous.file_size);
        assert.ok((await lead.client.rpc('review_submission',{p_data:{id:previous.id,status:'completed',expectedUpdatedAt:previous.updated_at}})).error);
      }
      assert.equal(ok(await member.client.from('submissions').select('id').eq('assignment_id',assignment)).length,4);
    });
    await t.test('file/link races, concurrent finalization, and completed restrictions',async()=>{
      const previous=await current(member),i=await prepare(member,'pdf',previous); await upload(member,i);
      ok(await member.client.rpc('submit_link',{p_assignment_id:assignment,p_url:'https://example.com/work',p_expected_id:previous.id,p_expected_updated_at:previous.updated_at}));
      assert.equal((await finalize(member,i)).error,'stale');
      const link=await current(member),next=await prepare(member,'pdf',link); await upload(member,next);
      const results=await Promise.all([finalize(member,next),finalize(member,next)]); assert.deepEqual(results[0],results[1]);
      const a=await prepare(other),b=await prepare(other); await upload(other,a); await upload(other,b);
      const concurrent=await Promise.all([finalize(other,a),finalize(other,b)]);
      assert.equal(concurrent.filter(r=>r.state==='committed').length,1); assert.equal(concurrent.filter(r=>r.error==='stale').length,1);
      const currentAttempt=await current(member);
      ok(await lead.client.rpc('review_submission',{p_data:{id:currentAttempt.id,status:'completed',feedback:'Reviewed',expectedUpdatedAt:currentAttempt.updated_at}}));
      assert.equal((await rpc(member,'prepare',null,{assignmentId:assignment,name:'x.pdf',size:pdf.length,mime:'application/pdf',expectedId:currentAttempt.id,expectedUpdatedAt:(await current(member)).updated_at})).error,'closed');
    });
    await t.test('inactive access, expiry, abandonment, cleanup and rollback',async()=>{
      const old=await current(other),i=await prepare(other,'pdf',old); await upload(other,i);
      await sql(`update public.approved_members set active=false where person_id=${q(other.person)}`);
      assert.ok((await admin.rpc('file_upload',{p_actor:other.id,p_action:'get',p_intent:i.id})).error);
      assert.ok((await other.client.storage.from('submissions').download(old.file_path)).error);
      await sql(`update public.approved_members set active=true where person_id=${q(other.person)}`);
      await sql(`begin; select public.file_upload(${q(other.id)},'finalize',${q(i.id)},'{"size":${pdf.length},"mime":"application/pdf"}'); rollback;`);
      assert.equal((await current(other)).id,old.id);
      assert.equal((await rpc(other,'get',i.id)).state,'pending');
      await sql(`update private.upload_intents set expires_at=now()-interval '1 second' where id=${q(i.id)}`);
      assert.equal((await finalize(other,i)).error,'abandoned');
      const claims=ok(await admin.rpc('cleanup_uploads',{p_owner:other.id})); assert.ok(claims.some(c=>c.id===i.id));
      assert.equal((await finalize(other,i)).error,'abandoned');
      // Restrict test deletions to this test's paths, even if other abandoned intents exist.
      for(const claim of claims.filter(c=>paths.includes(c.path))) { ok(await admin.storage.from('submissions').remove([claim.path])); ok(await admin.rpc('cleanup_uploads',{p_id:claim.id,p_failed:false})); }
      assert.equal(ok(await other.client.storage.from('submissions').download(old.file_path)).size,pdf.length);
    });
    await t.test('authenticated resumable transfer works with exact intent policy',async()=>{
      const i=await prepare(other,'pdf',await current(other));
      const session=ok(await other.client.auth.getSession()).session;
      await new Promise((resolve,reject)=>new Upload(pdf,{endpoint:`${config.API_URL}/storage/v1/upload/resumable`,headers:{Authorization:`Bearer ${session.access_token}`},metadata:{bucketName:'submissions',objectName:i.path,contentType:i.mime},chunkSize:6*1024*1024,uploadDataDuringCreation:true,storeFingerprintForResuming:false,retryDelays:[0,1000],onSuccess:resolve,onError:reject}).start());
      assert.equal((await finalize(other,i)).state,'committed');
    });
    await t.test('20 MB boundary, interrupted TUS retry, cancellation and cleanup races',async()=>{
      const boundary=Buffer.alloc(20*1024*1024,32); pdf.copy(boundary); boundary.write('%%EOF',boundary.length-5);
      const base=await current(other),i=await prepare(other,'pdf',base,boundary);
      const session=ok(await other.client.auth.getSession()).session;
      let interrupted=false,retried=false;
      await new Promise((resolve,reject)=>new Upload(boundary,{
        endpoint:`${config.API_URL}/storage/v1/upload/resumable`,headers:{Authorization:`Bearer ${session.access_token}`},
        metadata:{bucketName:'submissions',objectName:i.path,contentType:i.mime},chunkSize:6*1024*1024,
        uploadDataDuringCreation:true,storeFingerprintForResuming:false,retryDelays:[0,100,500],
        onBeforeRequest:request=>{ if(request.getMethod()==='PATCH'&&!interrupted){interrupted=true;throw new Error('Isolated transfer interruption');} },
        onShouldRetry:()=>{retried=true;return true;},onSuccess:resolve,onError:reject,
      }).start());
      assert.ok(interrupted&&retried); assert.equal((await finalize(other,i)).state,'committed');
      const next=await prepare(other,'pdf',await current(other));
      assert.ok((await other.client.storage.from('submissions').upload(next.path,Buffer.alloc(20*1024*1024+1),{contentType:next.mime})).error);
      assert.equal((await rpc(other,'cancel',next.id)).error,'abandoned');
      assert.ok((await other.client.storage.from('submissions').upload(next.path,pdf,{contentType:next.mime})).error);
      const racing=await prepare(other,'pdf',await current(other)); await upload(other,racing);
      const [receipt,claims]=await Promise.all([finalize(other,racing),admin.rpc('cleanup_uploads',{p_owner:other.id}).then(ok)]);
      assert.equal(receipt.state,'committed'); assert.ok(!claims.some(c=>c.id===racing.id));
      const abandoned=await prepare(other,'pdf',await current(other)); await upload(other,abandoned);
      await rpc(other,'cancel',abandoned.id);
      const [denied,cleanup]=await Promise.all([finalize(other,abandoned),admin.rpc('cleanup_uploads',{p_owner:other.id}).then(ok)]);
      assert.equal(denied.error,'abandoned'); assert.ok(cleanup.some(c=>c.id===abandoned.id));
      ok(await admin.rpc('cleanup_uploads',{p_id:abandoned.id,p_failed:true,p_owner:other.id}));
      await sql(`update private.upload_intents set cleanup_at=now()-interval '6 minutes' where id=${q(abandoned.id)}`);
      assert.ok(ok(await admin.rpc('cleanup_uploads',{p_owner:other.id})).some(c=>c.id===abandoned.id));
    });
    await t.test('expired credentials, draft isolation and membership revocation deny writes',async()=>{
      const i=await prepare(other,'pdf',await current(other));
      const session=ok(await other.client.auth.getSession()).session;
      assert.ok(config.JWT_SECRET,'Local test signing key required');
      const [header,body]=session.access_token.split('.');
      const expired=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(body,'base64url').toString()),exp:1})).toString('base64url');
      const message=`${header}.${expired}`;
      const signature=createHmac('sha256',config.JWT_SECRET).update(message).digest('base64url');
      const response=await fetch(`${config.API_URL}/storage/v1/object/submissions/${i.path}`,{method:'POST',headers:{apikey:config.ANON_KEY,Authorization:`Bearer ${message}.${signature}`,'Content-Type':i.mime},body:pdf});
      assert.ok(!response.ok);
      await sql(`update public.program_weeks set published=false where id=${q(week)}`);
      assert.ok((await other.client.storage.from('submissions').upload(i.path,pdf,{contentType:i.mime})).error);
      await sql(`update public.program_weeks set published=true where id=${q(week)}; update public.approved_members set active=false where person_id=${q(other.person)}`);
      assert.ok((await other.client.storage.from('submissions').upload(i.path,pdf,{contentType:i.mime})).error);
      await sql(`update public.approved_members set active=true where person_id=${q(other.person)}`);
      await rpc(other,'cancel',i.id);
    });
    await t.test('concurrent review versus replacement preserves exactly one winner',async()=>{
      const base=await current(other),i=await prepare(other,'pdf',base); await upload(other,i);
      const [review,save]=await Promise.all([
        lead.client.rpc('review_submission',{p_data:{id:base.id,status:'completed',expectedUpdatedAt:base.updated_at}}),
        rpc(other,'finalize',i.id,{size:pdf.length,mime:i.mime}),
      ]);
      assert.equal(Number(!review.error)+Number(save.state==='committed'),1);
      if(review.error) assert.equal(review.error.code,'40001'); else assert.equal(save.error,'stale');
    });
    await t.test('scoped cleanup command removes late objects and is safe to repeat',async()=>{
      const cleaner=await fixture(),i=await prepare(cleaner); await upload(cleaner,i); await rpc(cleaner,'cancel',i.id);
      const run=()=>exec(process.execPath,['scripts/cleanup-uploads.mjs','--owner',cleaner.id]);
      await run(); assert.ok((await admin.storage.from('submissions').download(i.path)).error);
      await run(); // No eligible claims; does not touch any other owner.
      ok(await admin.storage.from('submissions').upload(i.path,pdf,{contentType:i.mime})); // Simulated late transfer.
      await sql(`update private.upload_intents set cleanup_at=now()-interval '6 minutes' where id=${q(i.id)}`);
      await run(); assert.ok((await admin.storage.from('submissions').download(i.path)).error);
      assert.equal((await rpc(cleaner,'get',i.id)).error,'abandoned');
    });
    await t.test('download route checks anonymous, owner, cross-user and admin sessions',{skip:!process.env.GAP_TEST_APP_URL},async()=>{
      assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GAP_TEST_APP_URL).hostname));
      assert.equal((await downloadRoute(null,first.submissionId)).status,401);
      assert.equal((await downloadRoute(other,first.submissionId)).status,404);
      await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);
      assert.equal((await downloadRoute(member,first.submissionId)).status,404);
      await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
      for(const user of [member,lead]) { const response=await downloadRoute(user,first.submissionId); assert.equal(response.status,200); assert.match(response.headers.get('cache-control'),/private, no-store/); assert.match(response.headers.get('content-disposition'),/^attachment/); assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf); }
    });
    await t.test('image uploads, private previews, live authorization and desktop/phone review recovery', { skip: !process.env.GAP_TEST_BROWSER, timeout: 120000 }, async () => {
      await verifyImageSubmissions({ app: process.env.GAP_TEST_APP_URL, fixture, prepare, upload, finalize, current, sql, cookieJar, cohort, assignment, paths });
    });
    await t.test('desktop and phone upload → reload → review → feedback → replacement/history',{skip:!process.env.GAP_TEST_BROWSER,timeout:120000},async()=>{
      assert.ok(process.env.GAP_TEST_APP_URL);
      const {chromium}=await import('playwright-core');
      const browser=await chromium.launch({executablePath:process.env.GAP_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
      const screenshots=await mkdtemp(join(tmpdir(),'gap-upload-browser-'));
      try {
        for(const width of [1280,390]) {
          const learner=await fixture(),jar=await cookieJar(learner);
          const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
          await context.addCookies([...jar].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));
          const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
          await page.goto(`${process.env.GAP_TEST_APP_URL}/week/1`);
          await page.getByRole('link',{name:/^View assignment:/}).click();
          await page.getByRole('button',{name:'Submit assignment',exact:true}).click();
          await page.getByRole('button',{name:/^Upload file/}).click();
          if(width===1280) {
            await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'malformed.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
            await page.getByRole('button',{name:'Submit assignment',exact:true}).click();
            await page.getByRole('alert').filter({hasText:'File validation failed'}).waitFor();
            assert.equal(await current(learner),null);
            await page.getByRole('button',{name:'Cancel upload',exact:true}).click();
          }
          await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'browser.pdf',mimeType:'application/pdf',buffer:pdf});
          await page.screenshot({path:join(screenshots,`selected-${width}.png`),fullPage:true});
          await page.getByRole('button',{name:'Submit assignment',exact:true}).click();
          await page.getByRole('link',{name:'View submission',exact:true}).waitFor();
          await page.reload(); await page.getByRole('link',{name:'View submission',exact:true}).click();
          await page.getByRole('link',{name:'Download file',exact:true}).waitFor();
          const attempt=await current(learner); paths.push(attempt.file_path);
          const adminContext=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
          const adminJar=await cookieJar(lead); await adminContext.addCookies([...adminJar].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));
          const review=await adminContext.newPage();
          await review.goto(`${process.env.GAP_TEST_APP_URL}/admin/submissions/${attempt.id}?cohort=${cohort}`);
          const downloaded=review.waitForEvent('download'); await review.getByRole('link',{name:'Download',exact:true}).click();
          assert.equal((await downloaded).suggestedFilename(),'browser.pdf');
          await showReview(review);await review.getByLabel('Request revision',{exact:true}).check();
          await review.getByLabel(/Feedback \(/).fill('Please improve the evidence.');
          await review.getByRole('button',{name:'Save review',exact:true}).click();
          await review.getByText('Review saved.',{exact:true}).waitFor();
          await page.reload(); await page.getByText('Please improve the evidence.',{exact:true}).waitFor();
          await page.getByRole('button',{name:'Revise submission',exact:true}).click();
          await page.getByRole('button',{name:/^Upload file/}).click();
          await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'replacement.pptx',mimeType:fileMime('x.pptx'),buffer:office('pptx')});
          await page.getByRole('button',{name:'Revise submission',exact:true}).click();
          await page.getByRole('heading',{name:'Previous submissions'}).waitFor();
          await page.reload(); await page.getByRole('heading',{name:'Previous submissions'}).waitFor();
          paths.push((await current(learner)).file_path);
          await page.getByRole('button',{name:'Replace submission',exact:true}).click();
          await page.getByRole('button',{name:/^Submit link/}).click();
          await page.getByLabel('Submission link',{exact:true}).fill('https://example.com/revised-work');
          await page.getByRole('button',{name:'Replace submission',exact:true}).click();
          await page.getByRole('link',{name:/Open submitted link/}).waitFor();
          assert.equal((await current(learner)).submission_type,'link');
          await page.getByRole('button',{name:'Replace submission',exact:true}).click();
          await page.getByRole('button',{name:/^Upload file/}).click();
          await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'retried.pdf',mimeType:'application/pdf',buffer:pdf});
          let failedSave=false,lostResponse=false,actionCalls=0,finalizeRequest;
          const intercept=async route=>{
            const request=route.request();
            if(request.headers()['next-action'] && ++actionCalls > 1) {
              finalizeRequest={action:request.headers()['next-action'],type:request.headers()['content-type'],body:request.postData()};
              if(!failedSave){failedSave=true;return route.abort('failed');}
              if(!lostResponse){lostResponse=true;await route.fetch();return route.abort('failed');}
            }
            return route.continue();
          };
          await page.route('**/week/1/submission*',intercept);
          await page.getByRole('button',{name:'Replace submission',exact:true}).click();
          await page.locator('p[role="alert"]').waitFor(); assert.ok(failedSave,await page.locator('p[role="alert"]').innerText());
          assert.equal((await current(learner)).submission_type,'link');
          await page.getByRole('button',{name:'Replace submission',exact:true}).click();
          await page.locator('p[role="alert"]').waitFor(); assert.ok(lostResponse);
          const receipt=await current(learner); assert.equal(receipt.submission_type,'file');
          await page.getByRole('button',{name:'Replace submission',exact:true}).click();
          await page.getByRole('link',{name:'Download file',exact:true}).waitFor();
          assert.equal((await current(learner)).id,receipt.id); paths.push(receipt.file_path);
          await page.unroute('**/week/1/submission*',intercept);
          if(width===1280) {
            async function replay(jar) {
              const response=await fetch(`${process.env.GAP_TEST_APP_URL}/week/1/submission`,{method:'POST',headers:{
                'next-action':finalizeRequest.action,'content-type':finalizeRequest.type,origin:process.env.GAP_TEST_APP_URL,
                cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; '),
              },body:finalizeRequest.body,redirect:'manual'});
              return {redirect:response.headers.get('x-action-redirect')??'',body:await response.text()};
            }
            assert.match((await replay(new Map())).redirect,/\/login/);
            assert.match((await replay(await cookieJar(other))).body,/Upload unavailable/);
            await sql(`update public.approved_members set active=false where person_id=${q(learner.person)}`);
            assert.match((await replay(await cookieJar(learner))).redirect,/\/access-denied/);
            await sql(`update public.approved_members set active=true where person_id=${q(learner.person)}`);
            const session=ok(await learner.client.auth.getSession()).session;
            const [header,body]=session.access_token.split('.');
            const expiredBody=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(body,'base64url').toString()),exp:1})).toString('base64url');
            const unsigned=`${header}.${expiredBody}`;
            const expiredToken=`${unsigned}.${createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url')}`;
            const cookieName=[...(await cookieJar(learner)).keys()][0].replace(/\.\d+$/,'');
            const expiredJar=new Map([[cookieName,'base64-'+Buffer.from(JSON.stringify({...session,access_token:expiredToken,refresh_token:'invalid-test-refresh',expires_at:1,expires_in:0})).toString('base64url')]]);
            assert.match((await replay(expiredJar)).redirect,/\/login/);
            assert.equal((await current(learner)).id,receipt.id);
          }
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
          await page.screenshot({path:join(screenshots,`history-${width}.png`),fullPage:true});
          assert.deepEqual(errors,[]);
          await context.close(); await adminContext.close();
        }
        const interrupted=await fixture(),interruptedJar=await cookieJar(interrupted);
        const recovery=await browser.newContext({viewport:{width:390,height:850}});
        await recovery.addCookies([...interruptedJar].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));
        const page=await recovery.newPage();
        await page.goto(`${process.env.GAP_TEST_APP_URL}/week/1`);
        await page.getByRole('link',{name:/^View assignment:/}).click();
        await page.getByRole('button',{name:'Submit assignment',exact:true}).click();
        await page.getByRole('button',{name:/^Upload file/}).click();
        await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'interrupted.pdf',mimeType:'application/pdf',buffer:pdf});
        let stopTransfer;
        const stalled=new Promise(resolve=>{stopTransfer=resolve;});
        await page.route('**/storage/v1/upload/resumable',async route=>{await stalled;await route.abort('failed').catch(()=>{});});
        const transferStarted=page.waitForRequest(request=>request.url().includes('/storage/v1/upload/resumable'));
        await page.getByRole('button',{name:'Submit assignment',exact:true}).click(); await transferStarted;
        await page.route('**/week/1/assignments/*',route=>route.request().headers()['next-action']?route.abort('failed'):route.continue());
        await page.getByRole('button',{name:'Cancel upload',exact:true}).click(); stopTransfer();
        await page.locator('p[role="alert"]').filter({hasText:'Cancellation could not be confirmed'}).waitFor();
        assert.equal(await current(interrupted),null);
        assert.equal(await page.getByLabel('Choose file',{exact:true}).evaluate(input=>input.files[0].name),'interrupted.pdf');
        await page.unroute('**/week/1/assignments/*');
        await page.getByRole('button',{name:/^Submit link/}).click();
        await page.getByLabel('Submission link',{exact:true}).fill('https://example.com/storage-fallback');
        await page.getByRole('button',{name:'Submit assignment',exact:true}).click();
        await page.getByRole('link',{name:'View submission',exact:true}).waitFor();
        assert.equal((await current(interrupted)).submission_type,'link');
        await recovery.close();
        console.log(`Browser screenshots: ${screenshots}`);
      } finally {await browser.close();}
    });
  } finally {
    // Include files created through real browser actions even if a UI assertion failed.
    const fixturePaths=await sql(`select file_path from public.submissions where assignment_id=${q(assignment)} and file_path is not null union select path from private.upload_intents where assignment_id=${q(assignment)}`);
    paths.push(...fixturePaths.split('\n').filter(Boolean));
    if(paths.length) await admin.storage.from('submissions').remove(paths);
    await sql(`delete from private.upload_intents where assignment_id=${q(assignment)}; delete from public.submissions where assignment_id=${q(assignment)}; delete from public.assignments where id=${q(assignment)}; delete from public.program_weeks where id=${q(week)}; delete from public.cohort_enrollments where cohort_id=${q(cohort)}; delete from public.program_cohorts where id=${q(cohort)};`);
    for(const user of users) { await sql(`delete from public.profiles where id=${q(user.id)}; delete from public.approved_members where person_id=${q(user.person)}; delete from public.people where id=${q(user.person)}`); await admin.auth.admin.deleteUser(user.id); }
  }
});
