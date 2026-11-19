import assert from 'node:assert/strict';
import sharp from 'sharp';
import {showReview} from './lib/review-workspace.mjs';

import test from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,opts),anon=createClient(config.API_URL,config.ANON_KEY,opts);
const ok=r=>{assert.ifError(r.error);return r.data;},q=s=>`'${String(s).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),assignment=randomUUID(),users=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role,{enrolled=false,active=true}={}){
 const email=`gap-activity-${randomUUID()}@ucdavis.edu`,person=randomUUID(),id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;
 users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Test Participant Fixture');insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Test Participant Fixture',${q(role)},${active});${enrolled?`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(person)},${q(cohort)});`:''}`);
 const client=createClient(config.API_URL,config.ANON_KEY,opts),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));if(active)ok(await client.rpc('sync_profile'));
 const enrollment=enrolled?await sql(`select id from public.cohort_enrollments where person_id=${q(person)} and cohort_id=${q(cohort)}`):null;
 return{id,person,email,client,enrollment};
}
async function cookies(user){const jar=new Map(),session=ok(await user.client.auth.getSession()).session,ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>jar.set(c.name,c.value))}});ok(await ssr.auth.setSession(session));return [...jar].map(([name,value])=>({name,value,url:app}));}

async function poll(check){for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out waiting for Slide Swap state');}
const storyIds=Array.from({length:3},()=>randomUUID()),groups=[randomUUID(),randomUUID()];
const image=await sharp({create:{width:300,height:200,channels:3,background:'#458537'}}).png().toBuffer();
function makeSlides(count=5){const bodies=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${Array.from({length:count},(_,i)=>`${3+i*2} 0 R`).join(' ')}] /Count ${count} >>`];for(let i=0;i<count;i++)bodies.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${4+i*2} 0 R >>`,'<< /Length 0 >>\nstream\n\nendstream');let text='%PDF-1.7\n',offsets=[0];for(const [i,b] of bodies.entries()){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${b}\nendobj\n`;}const start=Buffer.byteLength(text);text+=`xref\n0 ${bodies.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${bodies.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;return Buffer.from(text);}
const pdf=makeSlides(),browserAssignment=randomUUID();
async function asset(u,kind,expected=null,version=null){const p=ok(await u.client.rpc('prepare_slide_swap',{p_assignment:assignment,p_kind:kind,p_file:{name:kind==='deck'?'slides.pdf':'meeting.png',size:kind==='deck'?pdf.length:image.length,mime:kind==='deck'?'application/pdf':'image/png'},p_expected:expected,p_expected_version:version,p_request:randomUUID()}));const bytes=kind==='deck'?pdf:image;ok(await u.client.storage.from('slide-swap').upload(p.path,bytes,{contentType:p.mime}));return p;}
async function finish(u,f,pages=5){return root.rpc('finalize_slide_swap',{p_actor:u.id,p_id:f.id,p_pages:pages});}
test('Slide Swap privacy, pairs/trio exchange, shared grading and retries',async t=>{
 const paths=[];let students=[],lead,viewer;
 try{
 await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2987,'2987-09-01','2987-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},5,'Slide Swap workshop','Present visually',false);insert into public.assignments(id,week_id,title,instructions,due_at) values(${q(assignment)},${q(week)},'Slide Swap','Tell a story in five slides',now()+interval '1 day');`);
 lead=await fixture('admin');viewer=await fixture('viewer');students=await Promise.all(Array.from({length:5},()=>fixture('member',{enrolled:true})));
 const stories=storyIds.map((id,i)=>({id,title:'Story '+i,body:'PRIVATE story body '+i}));
 const setup={version:0,overview:'Create, swap, present.',stories,groups:groups.map((id,i)=>({id,name:i?'Trio':'Pair',isTest:false,members:students.slice(i?2:0,i?5:2).map((u,n)=>({enrollmentId:u.enrollment,storyId:storyIds[n]}))}))};
 await t.test('admin setup, draft privacy, publication readiness and participant boundaries',async()=>{
 assert.ok((await students[0].client.rpc('configure_slide_swap',{p_assignment:assignment,p_data:setup,p_request:randomUUID()})).error);
 ok(await lead.client.rpc('configure_slide_swap',{p_assignment:assignment,p_data:setup,p_request:randomUUID()}));
 assert.ok((await students[0].client.rpc('read_slide_swap',{p_assignment:assignment})).error);
 await sql(`update public.program_weeks set published=true where id=${q(week)}`);
 assert.ok((await anon.rpc('read_slide_swap',{p_assignment:assignment})).error);
 assert.ok((await viewer.client.rpc('read_slide_swap',{p_assignment:assignment,p_admin:true})).error);
 for(const u of students){const d=ok(await u.client.rpc('read_slide_swap',{p_assignment:assignment}));assert.ok(d.story.body.startsWith('PRIVATE'));assert.equal(d.assignedDeck,null);assert.equal(d.stories,undefined);}
 assert.ok((await students[0].client.schema('private').from('swap_configs').select('*')).error);
 const credit=ok(await lead.client.rpc('set_assignment_completion',{p_action:'grant',p_assignment:assignment,p_enrollment:students[0].enrollment}));assert.equal(ok(await students[0].client.rpc('read_slide_swap',{p_assignment:assignment})).assignedDeck,null);ok(await lead.client.rpc('set_assignment_completion',{p_action:'revoke',p_assignment:assignment,p_enrollment:students[0].enrollment,p_credit:credit}));
 assert.ok((await root.rpc('file_upload',{p_actor:students[0].id,p_action:'prepare',p_data:{assignmentId:assignment,name:'slides.pdf',size:pdf.length,mime:'application/pdf'}})).error);
 assert.ok((await students[0].client.rpc('submit_text',{p_assignment_id:assignment,p_text:'Bypass'})).error);
 assert.ok((await students[0].client.rpc('finalize_slide_swap',{p_actor:students[0].id,p_id:randomUUID(),p_pages:5})).error);
 });
 await t.test('private link readiness, safe URLs, replacement, receipts and mixed PDF/link trio',async()=>{
 const url='https://docs.google.com/presentation/d/slides_123/edit?usp=sharing',canva='https://www.canva.com/design/DAG123/token/view';
 const args={p_assignment:assignment,p_url:url,p_expected:null,p_request:randomUUID()};
 for(const user of [anon,viewer.client])assert.ok((await user.rpc('save_slide_swap_link',args)).error);
 for(const p_url of ['javascript:alert(1)','https://docs.google.com.evil.test/presentation/d/a','https://www.canva.com/','https://www.canva.com:444/design/a/view'])assert.ok((await students[2].client.rpc('save_slide_swap_link',{...args,p_url})).error);
 const first=ok(await students[2].client.rpc('save_slide_swap_link',args));assert.deepEqual(ok(await students[2].client.rpc('save_slide_swap_link',args)),first);
 assert.equal(ok(await students[2].client.rpc('read_slide_swap',{p_assignment:assignment})).ownDeck.url,url);
 assert.equal(ok(await students[3].client.rpc('read_slide_swap',{p_assignment:assignment})).assignedDeck,null);
 assert.ok((await students[2].client.rpc('slide_swap_asset',{p_id:first.id})).error===null);assert.equal(ok(await students[2].client.rpc('slide_swap_asset',{p_id:first.id})),null);
 assert.ok((await students[2].client.rpc('save_slide_swap_link',{...args,p_url:canva,p_request:randomUUID()})).error);
 const replacement=ok(await students[2].client.rpc('save_slide_swap_link',{...args,p_url:canva,p_expected:first.id,p_request:randomUUID()}));
 assert.equal(ok(await students[2].client.rpc('read_slide_swap',{p_assignment:assignment})).ownDeck.id,replacement.id);
 // Replace the external deck with an uploaded PDF; concurrent link/PDF readiness uses the same group gate.
 const f=ok(await students[2].client.rpc('prepare_slide_swap',{p_assignment:assignment,p_kind:'deck',p_file:{name:'mixed.pdf',size:pdf.length,mime:'application/pdf'},p_expected:replacement.id,p_expected_version:null,p_request:randomUUID()}));paths.push(f.path);ok(await students[2].client.storage.from('slide-swap').upload(f.path,pdf,{contentType:'application/pdf'}));ok(await finish(students[2],f));
 const links=await Promise.all([students[3].client.rpc('save_slide_swap_link',{...args,p_url:url,p_request:randomUUID()}),students[4].client.rpc('save_slide_swap_link',{...args,p_url:canva,p_request:randomUUID()})]);links.forEach(ok);
 const state=ok(await students[2].client.rpc('read_slide_swap',{p_assignment:assignment}));assert.ok(state.group.unlockedAt);assert.equal(state.assignedDeck.url,url);assert.equal(state.assignedDeck.story,undefined);
 assert.equal(ok(await students[0].client.rpc('read_slide_swap',{p_assignment:assignment})).assignedDeck,null);
 assert.ok((await students[3].client.rpc('save_slide_swap_link',{...args,p_expected:links[0].data.id,p_request:randomUUID()})).error);
 const proof=await asset(students[2],'proof');paths.push(proof.path);const submission=ok(await finish(students[2],proof)).submissionId;const review=ok(await lead.client.rpc('slide_swap_review',{p_submission:submission}));assert.equal(review.members.filter(m=>m.url).length,2);
 });
 const decks=[];
 await t.test('deck readiness, exact page assertion, secrecy, atomic unlock and trio cycle',async()=>{
 for(const u of students.slice(0,2)){const f=await asset(u,'deck');paths.push(f.path);decks.push(f);}for(const u of students.slice(2)){decks.push(ok(await u.client.rpc('read_slide_swap',{p_assignment:assignment})).ownDeck);}
 assert.ok((await finish(students[0],decks[0],4)).error);ok(await finish(students[0],decks[0]));ok(await finish(students[0],decks[0]));
 assert.equal(ok(await students[0].client.rpc('read_slide_swap',{p_assignment:assignment})).assignedDeck,null);
 assert.ok((await students[0].client.rpc('slide_swap_asset',{p_id:decks[1].id})).error);
 assert.equal(await sql(`select count(*) from public.submissions where assignment_id in(${q(assignment)},${q(browserAssignment)})`),'1');
 ok(await finish(students[1],decks[1]));
 for(let i=0;i<5;i++){const d=ok(await students[i].client.rpc('read_slide_swap',{p_assignment:assignment}));const next=i<2?(i+1)%2:2+(i-2+1)%3;assert.equal(d.assignedDeck.id,decks[next].id);assert.ok(d.group.unlockedAt);if(!d.assignedDeck.url)ok(await students[i].client.rpc('slide_swap_asset',{p_id:decks[next].id}));}
 assert.ok((await students[0].client.rpc('slide_swap_asset',{p_id:decks[2].id})).error);
 assert.ok((await students[0].client.rpc('prepare_slide_swap',{p_assignment:assignment,p_kind:'deck',p_file:{name:'slides.pdf',size:pdf.length,mime:'application/pdf'},p_expected:decks[0].id,p_request:randomUUID()})).error);
 });
 let submission;
 await t.test('one proof per group, duplicate finalization, review and replacement history',async()=>{
 const f=await asset(students[0],'proof');paths.push(f.path);const result=ok(await finish(students[0],f));submission=result.submissionId;
 assert.equal(ok(await finish(students[0],f)).submissionId,submission);
 const own=ok(await students[1].client.from('submissions').select('*').eq('id',submission).single());assert.equal(own.swap_group_id,groups[0]);assert.equal(own.enrollment_id,null);
 assert.equal(ok(await students[2].client.from('submissions').select('*').eq('id',submission)).length,0);
 ok(await lead.client.rpc('review_submission',{p_data:{id:submission,status:'revision_requested',feedback:'Retake a clear photo.',expectedUpdatedAt:own.updated_at}}));
 const refreshed=ok(await students[1].client.from('submissions').select('*').eq('id',submission).single());const replacement=await asset(students[1],'proof',submission,refreshed.updated_at);paths.push(replacement.path);const second=ok(await finish(students[1],replacement)).submissionId;
 const row=ok(await students[0].client.from('submissions').select('*').eq('id',second).single());ok(await lead.client.rpc('review_submission',{p_data:{id:second,status:'completed',expectedUpdatedAt:row.updated_at}}));
 const state=ok(await students[1].client.rpc('read_slide_swap',{p_assignment:assignment}));assert.equal(state.attempts.length,2);assert.equal(state.attempts.find(a=>a.current).status,'completed');assert.equal(await sql(`select count(*) from public.submissions where assignment_id in(${q(assignment)},${q(browserAssignment)}) and is_current`),'2');
 assert.equal(ok(await lead.client.rpc('slide_swap_review',{p_submission:second})).members.length,2);
 });
 await t.test('desktop/phone upload, PDF exchange, proof review and zero-write preview',{skip:!app},async()=>{
 await sql(`update public.program_weeks set published=false where id=${q(week)};insert into public.assignments(id,week_id,title,instructions,due_at) values(${q(browserAssignment)},${q(week)},'Browser Slide Swap','Create five slides',now()+interval '1 day');`);
 const content={...setup,groups:setup.groups.map(g=>({...g,id:randomUUID()}))};ok(await lead.client.rpc('configure_slide_swap',{p_assignment:browserAssignment,p_data:content,p_request:randomUUID()}));await sql(`update public.program_weeks set published=true where id=${q(week)}`);
 const pdfUrl=`${app}/api/slide-swap/assets/${decks[1].id}/pdf`;
 assert.equal((await fetch(pdfUrl)).status,401);
 for(const identity of [viewer,students[2]]){const denied=await fetch(pdfUrl,{headers:{cookie:(await cookies(identity)).map(c=>c.name+'='+c.value).join('; ')}});assert.ok([403,404].includes(denied.status));}
 const allowed=await fetch(pdfUrl,{headers:{cookie:(await cookies(students[0])).map(c=>c.name+'='+c.value).join('; ')}});assert.equal(allowed.status,200);assert.match(allowed.headers.get('cache-control'),/private.*no-store/);assert.equal(allowed.headers.get('x-content-type-options'),'nosniff');
 const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),shots=await mkdtemp(join(tmpdir(),'gap-slide-swap-'));
 try{for(const width of [1280,390]){
  const linkContext=await browser.newContext({viewport:{width,height:1000}});await linkContext.addCookies(await cookies(students[2]));const linked=await linkContext.newPage();await linked.goto(`${app}/week/5/assignments/${assignment}`);await linked.getByRole('button',{name:'2 · Swap',exact:true}).click();const open=linked.getByRole('link',{name:'Open Google Slides ↗',exact:true});await open.waitFor();assert.equal(await open.getAttribute('href'),'https://docs.google.com/presentation/d/slides_123/edit?usp=sharing');assert.equal(await open.getAttribute('target'),'_blank');const next=linked.getByRole('button',{name:'Next: Meet & present →',exact:true});const linkBox=await open.boundingBox(),nextBox=await next.boundingBox();assert.ok(nextBox.y>=linkBox.y+linkBox.height+16,'Next action must sit below the slide link with a visible gap');assert.equal(await linked.getByLabel('Page number',{exact:true}).count(),0);await linked.screenshot({path:join(shots,`link-swap-${width}.png`),fullPage:true});await next.click();await linked.getByRole('heading',{name:'Meet, present and compare',exact:true}).waitFor();await linkContext.close();
  const context=await browser.newContext({viewport:{width,height:1000}});await context.addCookies(await cookies(students[0]));const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(`${app}/week/5/assignments/${browserAssignment}`);await page.getByRole('heading',{name:'Browser Slide Swap',exact:true}).waitFor();
  if(width===1280){await page.getByLabel('Google Slides or Canva link',{exact:true}).fill('https://evil.test/slides');await page.getByRole('button',{name:'Mark slides ready',exact:true}).click();await page.getByRole('status').filter({hasText:'Paste a Google Slides'}).waitFor();assert.equal(await page.getByLabel('Google Slides or Canva link',{exact:true}).inputValue(),'https://evil.test/slides');await page.getByLabel('Google Slides or Canva link',{exact:true}).fill('https://www.canva.com/design/DAG_browser/token/view');await page.getByRole('button',{name:'Mark slides ready',exact:true}).click();await page.getByRole('link',{name:'Open your slides →',exact:true}).waitFor();assert.equal(ok(await students[0].client.rpc('read_slide_swap',{p_assignment:browserAssignment})).ownDeck.url,'https://www.canva.com/design/DAG_browser/token/view');await page.getByRole('button',{name:'Upload PDF',exact:true}).click();await page.getByLabel('Five-slide PDF',{exact:true}).setInputFiles({name:'two-slides.pdf',mimeType:'application/pdf',buffer:makeSlides(2)});await page.getByRole('button',{name:'Replace slides',exact:true}).click();await page.getByRole('status').filter({hasText:'exactly five pages'}).waitFor();assert.equal(ok(await students[0].client.rpc('read_slide_swap',{p_assignment:browserAssignment})).ownDeck.url,'https://www.canva.com/design/DAG_browser/token/view');await page.getByLabel('Five-slide PDF',{exact:true}).setInputFiles({name:'five-slides.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByRole('button',{name:'Replace slides',exact:true}).click();await poll(async()=>!!ok(await students[0].client.rpc('read_slide_swap',{p_assignment:browserAssignment})).ownDeck).catch(async error=>{console.log('Upload state:',await page.getByRole('status').allTextContents());await page.screenshot({path:join(shots,'upload-failure.png'),fullPage:true});console.log('Screenshots:',shots);throw error;});
   const p=ok(await students[1].client.rpc('prepare_slide_swap',{p_assignment:browserAssignment,p_kind:'deck',p_file:{name:'partner.pdf',size:pdf.length,mime:'application/pdf'},p_expected:null,p_expected_version:null,p_request:randomUUID()}));ok(await students[1].client.storage.from('slide-swap').upload(p.path,pdf,{contentType:'application/pdf'}));ok(await root.rpc('finalize_slide_swap',{p_actor:students[1].id,p_id:p.id,p_pages:5}));await page.reload();
  }
  await page.getByRole('button',{name:'2 · Swap',exact:true}).click();await page.getByRole('heading',{name:/You’re presenting/}).waitFor();await page.getByLabel('Page number',{exact:true}).waitFor();await poll(async()=>await page.getByLabel('Page number',{exact:true}).isEnabled());await page.getByRole('button',{name:'Next page',exact:true}).click();await poll(async()=>(await page.getByLabel('Page number',{exact:true}).inputValue())==='2');await page.getByRole('button',{name:'Previous page',exact:true}).click();assert.equal(await page.getByLabel('Page number',{exact:true}).inputValue(),'1');await page.screenshot({path:join(shots,`swap-${width}.png`),fullPage:true});await page.getByRole('button',{name:'3 · Meet & present',exact:true}).click();
  if(width===1280){await page.getByLabel('Meeting photo',{exact:true}).setInputFiles({name:'meeting.png',mimeType:'image/png',buffer:image});await page.getByRole('button',{name:'Submit meeting photo',exact:true}).click();await poll(async()=>ok(await students[0].client.rpc('read_slide_swap',{p_assignment:browserAssignment})).attempts.length===1);}
  const activity=ok(await students[0].client.rpc('read_slide_swap',{p_assignment:browserAssignment}));assert.equal(activity.attempts.length,1);const current=activity.attempts.find(a=>a.current);await context.close();
  const admin=await browser.newContext({viewport:{width,height:1000}});await admin.addCookies(await cookies(lead));const review=await admin.newPage();const linkProof=await sql(`select id from public.submissions where swap_group_id=${q(groups[1])} and is_current`);await review.goto(`${app}/admin/submissions/${linkProof}?cohort=${cohort}&week=all`);const references=review.getByRole('region',{name:'Slide Swap decks and stories',exact:true});await references.waitFor();await references.getByRole('combobox').selectOption('1');const referenceLink=references.getByRole('link',{name:'Open slides ↗',exact:true});await referenceLink.waitFor();assert.equal(await referenceLink.getAttribute('href'),'https://docs.google.com/presentation/d/slides_123/edit?usp=sharing');await review.goto(`${app}/admin/submissions/${current.id}?cohort=${cohort}&week=all`);await review.getByRole('heading',{name:'Submitted work',exact:true}).waitFor();await review.getByRole('region',{name:'Slide Swap decks and stories',exact:true}).waitFor();await showReview(review);await review.getByLabel('Feedback (optional)',{exact:true}).fill('Great visual storytelling at '+width+'px.');await review.screenshot({path:join(shots,`review-${width}.png`),fullPage:true});await review.getByLabel('Mark complete',{exact:true}).check();await review.getByRole('button',{name:'Save review',exact:true}).click();await poll(async()=>ok(await students[1].client.rpc('read_slide_swap',{p_assignment:browserAssignment})).attempts.find(a=>a.current).status==='completed');
  const countBefore=await sql(`select count(*) from private.swap_assets where assignment_id=${q(browserAssignment)}`);await review.goto(`${app}/admin/preview/week/5/assignments/${browserAssignment}?cohort=${cohort}`);await review.getByRole('button',{name:'Simulate everyone ready',exact:true}).click();await review.getByRole('button',{name:'3 · Meet & present',exact:true}).click();await review.getByLabel('Meeting photo',{exact:true}).setInputFiles({name:'practice.png',mimeType:'image/png',buffer:image});await review.getByRole('button',{name:'Simulate submission',exact:true}).click();await review.getByRole('status').filter({hasText:'Nothing was saved'}).waitFor();assert.equal(await sql(`select count(*) from private.swap_assets where assignment_id=${q(browserAssignment)}`),countBefore);await review.goto(`${app}/admin/weeks/${week}?cohort=${cohort}`);await review.getByRole('button',{name:/^Assignments \(/}).click();if(width===1280)await review.getByRole('button',{name:/^Browser Slide Swap/}).click();else await review.getByRole('combobox',{name:'Select assignment',exact:true}).selectOption(browserAssignment);await review.getByRole('button',{name:'Activity setup',exact:true}).click();await review.getByRole('region',{name:'Slide Swap settings',exact:true}).waitFor();await review.getByRole('button',{name:'Stories',exact:true}).click();assert.equal(await review.getByLabel('Story title',{exact:true}).filter({visible:true}).count(),1);await review.getByRole('button',{name:'Partners',exact:true}).click();await review.getByRole('combobox',{name:'Presentation group',exact:true}).selectOption(content.groups[1].id);await review.getByRole('combobox',{name:'Presenter 3',exact:true}).waitFor();await review.screenshot({path:join(shots,`setup-${width}.png`),fullPage:true});await admin.close();
 }
 console.log('Slide Swap screenshots: '+shots);
 }finally{await browser.close();}
 });
 await t.test('withdrawal and revocation deny both activity and private files without deleting history',async()=>{
 await sql(`update public.cohort_enrollments set participation_status='withdrew' where id=${q(students[0].enrollment)}`);
 assert.ok((await students[0].client.rpc('read_slide_swap',{p_assignment:assignment})).error);assert.ok((await students[0].client.rpc('slide_swap_asset',{p_id:decks[1].id})).error);
 assert.equal(ok(await students[0].client.from('submissions').select('*').eq('id',submission)).length,0);
 await sql(`update public.approved_members set active=false where person_id=${q(students[1].person)}`);assert.ok((await students[1].client.rpc('read_slide_swap',{p_assignment:assignment})).error);
 assert.equal(await sql(`select count(*) from private.swap_decks where group_id=${q(groups[0])}`),'2');
 });
 }finally{
 const allPaths=await sql(`select path from private.swap_assets where assignment_id in(${q(assignment)},${q(browserAssignment)})`);if(allPaths)await root.storage.from('slide-swap').remove(allPaths.split('\n'));
 await sql(`delete from private.swap_receipts where actor_id in(${users.map(u=>q(u.id)).join(',')||'null'});update public.submissions set supersedes_submission_id=null where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from private.swap_attempts where group_id in(select id from public.slide_swap_groups where assignment_id in(${q(assignment)},${q(browserAssignment)}));delete from public.submissions where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from public.submission_targets where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from private.swap_decks where group_id in(select id from public.slide_swap_groups where assignment_id in(${q(assignment)},${q(browserAssignment)}));delete from private.swap_assets where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from public.slide_swap_members where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from public.slide_swap_groups where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from private.swap_configs where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from public.assignment_completions where assignment_id in(${q(assignment)},${q(browserAssignment)});delete from public.assignments where id in(${q(assignment)},${q(browserAssignment)});delete from public.program_weeks where id=${q(week)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
 for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
 }
});
