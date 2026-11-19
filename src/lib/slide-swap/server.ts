import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {readBounded} from '@/lib/uploads/server';
import {imagePreview} from '@/lib/uploads/image';
import {isUuid} from '@/lib/grading/types';
export async function serveSwapFile(id:string,download=false,image=false){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'self'; sandbox"};
 const fail=(text:string,status:number)=>new Response(text,{status,headers});
 if(!isUuid(id))return fail('Not found',404);
 try{const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return fail('Sign in to view this file.',401);const profile=await db.rpc('sync_profile');if(profile.error)return fail('Access denied.',403);
 const r=await db.rpc('slide_swap_asset',{p_id:id});if(r.error||!r.data)return fail('File unavailable.',404);const f=r.data as {path:string;name:string;mime:string;size:number};const {data:{session}}=await db.auth.getSession();if(!session)return fail('Sign in again.',401);
 const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/slide-swap/${f.path.split('/').map(encodeURIComponent).join('/')}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:AbortSignal.timeout(30000)});const bytes=await readBounded(response);if(bytes.length!==f.size)throw Error('Invalid file');
 const body=image&&!download?await imagePreview(bytes,f.mime):bytes;
 if(!download&&!image&&f.mime!=='application/pdf')return fail('Use image preview or download.',400);
 return new Response(new Uint8Array(body),{headers:{...headers,'Content-Type':image&&!download?'image/png':f.mime,'Content-Disposition':`${download?'attachment':'inline'}; filename="${download?f.name.replace(/[^a-zA-Z0-9._ -]/g,'_'):image?'meeting-preview.png':'slides.pdf'}"`}});
 }catch{return fail('Preview unavailable. Retry or download.',503);}
}
