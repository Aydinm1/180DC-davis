import assert from 'node:assert/strict';
import test from 'node:test';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=r=>{assert.ifError(r.error);return r.data;},q=s=>`'${String(s).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const app='http://localhost:3014',cohort=randomUUID(),week=randomUUID(),week2=randomUUID(),session=randomUUID(),users=[];
async function user(role){
 const email=`gap-monday-${randomUUID()}@ucdavis.edu`,person=randomUUID();
 const id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)}),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Monday ${role}');insert into public.approved_members(person_id,email,full_name,role) values(${q(person)},${q(email)},'Monday ${role}',${q(role)});`);
 const client=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));ok(await client.rpc('sync_profile'));
 const jar=new Map(),ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});ok(await ssr.auth.setSession(ok(await client.auth.getSession()).session));
 return {id,person,email,client,cookies:[...jar].map(([name,value])=>({name,value,url:app}))};
}
test('attendance Monday button and forged actions use local fixtures only',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gap-monday-attendance-')),fixture=join(dir,'monday.json');let server,browser;let logs='';
 try{
  const lead=await user('admin'),member=await user('member'),viewer=await user('viewer');const enrollment=randomUUID(),tester=randomUUID();
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2988,'2988-09-01','2988-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Monday sync fixture','Fixture',true),(${q(week2)},${q(cohort)},2,'Next week fixture','Fixture',true);insert into public.cohort_enrollments(id,person_id,cohort_id,is_test) values(${q(enrollment)},${q(member.person)},${q(cohort)},false),(${q(tester)},${q(lead.person)},${q(cohort)},true);insert into public.attendance_sessions(id,week_id,workshop_date,opened_at,closes_at) values(${q(session)},${q(week)},current_date,now(),now()+interval '2 hours');insert into private.attendance_codes(session_id,code) values(${q(session)},'ABCD23');insert into public.attendance_records(session_id,enrollment_id,present,recorded_at) values(${q(session)},${q(enrollment)},true,now()),(${q(session)},${q(tester)},true,now());insert into private.monday_application_links(account_id,board_id,item_id,enrollment_id) values('fixture-account','99001','800001',${q(enrollment)}),('fixture-account','99001','800002',${q(tester)});`);
  await writeFile(fixture,JSON.stringify({items:{800001:{email:member.email},800002:{email:lead.email}},writes:[]}));
  server=spawn(process.execPath,['--import',new URL('./lib/mock-monday-attendance.mjs',import.meta.url).pathname,'node_modules/next/dist/bin/next','start','--port','3014'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:config.ANON_KEY,SUPABASE_SECRET_KEY:config.SERVICE_ROLE_KEY,NEXT_PUBLIC_SITE_URL:app,MONDAY_API_TOKEN:'fixture-monday-token',MONDAY_ACCOUNT_ID:'fixture-account',MONDAY_MEMBERS_BOARD_ID:'99001',MONDAY_APPLICANTS_BOARD_ID:'99001',MONDAY_EMAIL_COLUMN_ID:'email',MONDAY_ENROLL_IN_GAP_COLUMN_ID:'enroll',MONDAY_COHORT_COLUMN_ID:'cohort',MONDAY_MEMBER_STATUS_COLUMN_ID:'status',GAP_MONDAY_FIXTURE:fixture},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
  for(let n=0;n<60;n++){if(logs.includes('Ready in'))break;if(server.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,250));}assert.ok(logs.includes('Ready in'),logs);
  const {chromium}=await import('playwright-core');browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  for(const width of [1280,390]){
   const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(lead.cookies);const page=await ctx.newPage();await page.goto(`${app}/admin/attendance?cohort=${cohort}`);
   await page.getByRole('button',{name:'Sync to Monday',exact:true}).click();await page.getByRole('status').filter({hasText:width===1280?'1 checked · 0 already checked':'0 checked · 1 already checked'}).waitFor();
   const state=JSON.parse(await readFile(fixture,'utf8'));assert.deepEqual(state.writes,[{item:'800001',values:{week1:{checked:'true'}}}]);assert.ok(!state.items[800002].week1);
   await page.getByLabel('Participation view',{exact:true}).selectOption('test');assert.equal(await page.getByRole('button',{name:'Sync to Monday',exact:true}).count(),0);
   await page.getByLabel('Participation view',{exact:true}).selectOption('official');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(dir,`attendance-${width}.png`),fullPage:true});await ctx.close();
  }
  const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),action=Object.entries(manifest.node).find(([,e])=>e.exportedName==='syncAttendanceToMonday')?.[0];assert.ok(action);
  const call=async(cookies,args=[cohort,week])=>{const response=await fetch(`${app}/admin/attendance?cohort=${cohort}`,{method:'POST',redirect:'manual',headers:{'next-action':action,'content-type':'text/plain;charset=UTF-8',origin:app,cookie:cookies.map(c=>`${c.name}=${c.value}`).join(';')},body:JSON.stringify(args)});return await response.text();};
  for(const cookies of [[],member.cookies,viewer.cookies])assert.match(await call(cookies),/NEXT_REDIRECT|login|access-denied/);
  assert.match(await call(lead.cookies,[cohort,randomUUID()]),/Attendance access changed/);
  await sql(`update public.approved_members set active=false where person_id=${q(lead.person)}`);assert.match(await call(lead.cookies),/NEXT_REDIRECT|access-denied/);
  const state=JSON.parse(await readFile(fixture,'utf8'));assert.equal(state.writes.length,1);console.log('Monday attendance screenshots:',dir);
 }finally{
  if(browser)await browser.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
  await sql(`delete from private.monday_application_links where enrollment_id in(select id from public.cohort_enrollments where cohort_id=${q(cohort)});delete from public.attendance_records where session_id=${q(session)};delete from private.attendance_codes where session_id=${q(session)};delete from public.attendance_sessions where id=${q(session)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_weeks where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}
 }
});
