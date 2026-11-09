import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {readBounded,storageObjectUrl} from '@/lib/uploads/server';
import {MAX_FILE_BYTES} from '@/lib/uploads/format';
import {isUuid} from '@/lib/grading/types';
import {isPdfFile,pdfSignature,type PdfResource} from './types';

const headers={ 'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'self'; sandbox" };
export async function serveAdminPdf(kind:PdfResource['kind'],id:string,signal?:AbortSignal) {
 const fail=(message:string,status:number)=>new Response(message,{status,headers});
 try {
  const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)return fail('Sign in to view this PDF.',401);
  if(!user.email_confirmed_at||!user.email?.toLowerCase().endsWith('@ucdavis.edu')||!user.identities?.some(i=>i.provider==='google'))return fail('Active admin access required.',403);
  const profile=await db.rpc('sync_profile');
  if(profile.error)return fail(profile.error.code==='42501'?'Active admin access required.':'Could not verify access. Retry.',profile.error.code==='42501'?403:503);
  if(profile.data?.[0]?.role!=='admin')return fail('Active admin access required.',403);
  if(!isUuid(id))return fail('PDF not found.',404);
  let path:string,name:string,size:number|null;
  if(kind==='submission') {
   const r=await db.from('submissions').select('file_path,original_filename,submission_type,mime_type,file_size').eq('id',id).maybeSingle();const d=r.data;
   if(r.error||!d||d.submission_type!=='file'||!d.file_path||!isPdfFile(d.mime_type,d.original_filename??''))return fail('PDF not found or access denied.',404);
   path=d.file_path;name=d.original_filename??'submission.pdf';size=d.file_size;
  }else {
   const r=await db.from('grading_example_documents').select('path,original_filename,state,file_size').eq('id',id).maybeSingle();const d=r.data;
   if(r.error||!d||d.state!=='ready')return fail('PDF not found or access denied.',404);
   path=d.path;name=d.original_filename;size=d.file_size;
  }
  if(size!==null&&(size<1||size>MAX_FILE_BYTES))return fail('PDF exceeds the 20 MB limit.',422);
  const {data:{session}}=await db.auth.getSession();if(!session)return fail('Sign in to view this PDF.',401);
  const url=kind==='submission'?storageObjectUrl(path):`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/grading-examples/${path.split('/').map(encodeURIComponent).join('/')}`;
  const timeout=AbortSignal.timeout(60000);
  const upstream=await fetch(url,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout});
  if(!upstream.ok)return fail('PDF unavailable. Retry or download the original file.',upstream.status===401||upstream.status===403?403:503);
  const bytes=await readBounded(upstream);
  if(size!==null&&size!==bytes.length)return fail('PDF unavailable. Retry or download the original file.',503);
  if(!pdfSignature(bytes))return fail('This file cannot be previewed as a PDF. Download the original file.',422);
  const encoded=encodeURIComponent(name.replace(/[\x00-\x1f\x7f]/g,'_')).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16)}`);
  return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(bytes.length),'Content-Disposition':`inline; filename="preview.pdf"; filename*=UTF-8''${encoded}`}});
 }catch{return fail('PDF unavailable. Retry or download the original file.',503);}
}
