import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const c=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(new URL(c.API_URL).hostname!=='127.0.0.1')throw Error('Cleanup is local-only.');
const db=createClient(c.API_URL,c.SERVICE_ROLE_KEY,{auth:{persistSession:false}}),r=await db.rpc('cleanup_slide_swap');if(r.error)throw r.error;
const done=[];for(const f of r.data){const removed=await db.storage.from('slide-swap').remove([f.path]);if(!removed.error)done.push(f.id);}
if(done.length){const result=await db.rpc('cleanup_slide_swap',{p_done:done});if(result.error)throw result.error;}
console.log(`Slide Swap cleanup: ${done.length} abandoned files removed; ${r.data.length-done.length} retained for retry. Ready files untouched.`);
if(done.length<r.data.length)process.exitCode=1;
