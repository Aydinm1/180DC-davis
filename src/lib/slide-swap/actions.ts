'use server';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {requireUser,requireParticipant} from '@/lib/supabase/auth';
import {storageServer,readBounded} from '@/lib/uploads/server';
import {fileError,fileMime} from '@/lib/uploads/format';
import {inspectFile} from '@/lib/uploads/inspect';
import {isUuid} from '@/lib/grading/types';
import type {Json} from '@/lib/supabase/database.types';
import {swapSettingsError,swapDeckUrl} from './types';
function failure(error:{code?:string;message:string}|null){return error&&['22023','40001'].includes(error.code??'')?error.message:'Could not save. Check your access and retry; your input is retained.';}
export async function configureSwap(id:string,data:unknown,request:string){await requireUser(true);const invalid=swapSettingsError(data);if(invalid||!isUuid(id)||!isUuid(request))return {error:invalid??'Invalid request.'};const r=await(await createClient()).rpc('configure_slide_swap',{p_assignment:id,p_data:data as Json,p_request:request});if(r.error)return {error:r.error.code==='23505'?'A group already has that name. Rename it and retry.':failure(r.error)};revalidatePath('/admin','layout');return {saved:true};}
export async function prepareSwap(id:string,kind:'deck'|'proof',file:{name:string;size:number;type:string},expectedId:string|null,expectedVersion:string|null,request:string){
 await requireParticipant();const error=fileError(file);const mime=fileMime(file.name);
 if(error||!isUuid(id)||!isUuid(request)||kind==='deck'&&mime!=='application/pdf'||kind==='proof'&&!['image/png','image/jpeg','image/webp'].includes(mime??''))return {error:error??'Upload a five-page PDF deck or a PNG, JPEG or WebP meeting photo.'};
 const r=await(await createClient()).rpc('prepare_slide_swap',{p_assignment:id,p_kind:kind,p_file:{name:file.name,size:file.size,mime},p_expected:expectedId as string,p_expected_version:expectedVersion as string,p_request:request});if(r.error)return {error:failure(r.error)};return {intent:r.data as unknown as {id:string;path:string;mime:string}};
}
export async function cancelSwap(id:string){await requireParticipant();const r=await(await createClient()).rpc('cancel_slide_swap',{p_id:id});return r.error?{error:'Could not confirm cancellation. The upload expires after one hour.'}:{saved:true};}
export async function finalizeSwap(id:string){
 const user=await requireParticipant();if(!isUuid(id))return {error:'Invalid upload.'};
 try{const db=storageServer(),r=await db.rpc('slide_swap_upload',{p_actor:user.id,p_id:id});if(r.error)return {error:failure(r.error)};const f=r.data as {path:string;name:string;mime:string;size:number;kind:string;state:string};
 let pages:number|undefined;
 if(f.state!=='ready'){
  const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/slide-swap/${f.path.split('/').map(encodeURIComponent).join('/')}`,{headers:{Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}`,apikey:process.env.SUPABASE_SECRET_KEY!},cache:'no-store',signal:AbortSignal.timeout(30000)});
  const bytes=await readBounded(response);await inspectFile(bytes,f.name,f.mime,f.size);
  if(f.kind==='deck'){
   const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist/legacy/build/pdf.mjs');
   GlobalWorkerOptions.workerSrc=pathToFileURL(join(process.cwd(),'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
   const task=getDocument({data:new Uint8Array(bytes),enableXfa:false,useSystemFonts:false,stopAtErrors:true});
   let timer:ReturnType<typeof setTimeout>|undefined;try{const document=await Promise.race([task.promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('PDF inspection timed out')),10000);})]);pages=document.numPages;if(pages!==5) return {error:'Your PDF must contain exactly five pages. Export only your five slides.'};}finally{clearTimeout(timer);await task.destroy();}
  }
 }
 const finalized=await db.rpc('finalize_slide_swap',{p_actor:user.id,p_id:id,p_pages:pages});if(finalized.error)return {error:failure(finalized.error)};revalidatePath('/','layout');revalidatePath('/admin','layout');return {saved:true};
 }catch{return {error:'File validation or saving failed. Use a valid five-page PDF or a still PNG, JPEG or WebP image and retry.'};}
}

export async function saveSwapLink(id:string,url:string,expected:string|null,request:string){
 await requireParticipant();const normalized=typeof url==='string'?swapDeckUrl(url.trim()):null;
 if(!isUuid(id)||!isUuid(request)||expected!==null&&!isUuid(expected)||!normalized)return {error:'Paste a Google Slides presentation or Canva design link beginning with https://'};
 const r=await(await createClient()).rpc('save_slide_swap_link',{p_assignment:id,p_url:normalized,p_expected:expected as string,p_request:request});
 if(r.error)return {error:failure(r.error)};revalidatePath('/','layout');revalidatePath('/admin','layout');return {saved:true};
}
