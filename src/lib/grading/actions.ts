'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { storageServer, readBounded } from '@/lib/uploads/server';
import { fileError } from '@/lib/uploads/format';
import { inspectFile } from '@/lib/uploads/inspect';
import { isUuid, referenceError, scheduleReferenceError, type GradingReference, type ExampleResult, type ExampleDocument } from './types';

const unavailable = 'Example PDF storage is unavailable. Retry; your reference text can still be saved separately.';
function outcome(data: unknown): ExampleResult {
  if (data && typeof data === 'object' && 'id' in data) {
    const d = data as ExampleDocument;
    return { document: { id: d.id, assignment_id: d.assignment_id, original_filename: d.original_filename,
      path: d.path, file_size: d.file_size, state: d.state, is_current: d.is_current } };
  }
  return { error: 'This example PDF changed, was canceled or expired. Cancel the pending upload, reload and reselect the PDF.' };
}
export async function saveGradingReference(input: unknown): Promise<{ version: number } | { error: string }> {
  await requireUser(true);
  const invalid = referenceError(input); if (invalid) return { error: invalid };
  const value = input as GradingReference;
  try {
    const db = await createClient();
    const { data, error } = await db.rpc('save_grading_reference', {
      p_assignment: value.assignmentId, p_rubric: value.rubric, p_example: value.example, p_version: value.textVersion,
    });
    if (error) return { error: error.code === '40001' ? 'Another admin changed this reference. Your text is retained; copy it before reloading.' : 'Could not save grading reference. Your text is retained; please retry.' };
    revalidatePath('/admin', 'layout');
    return { version: data.text_version };
  } catch { return { error: 'Could not save grading reference. Your text is retained; please retry.' }; }
}
export async function prepareExample(assignmentId: string, file: { name: string; size: number; type: string }, version: number): Promise<ExampleResult> {
  const user = await requireUser(true);
  const invalid = fileError(file); if (invalid) return { error: invalid };
  if (!isUuid(assignmentId) || !Number.isSafeInteger(version) || version < 0) return { error: 'Save the assignment first and reload before attaching its example.' };
  if (!file.name.toLowerCase().endsWith('.pdf')) return { error: 'Choose a PDF example.' };
  try {
    const db = storageServer();
    const bucket = await db.storage.getBucket('grading-examples');
    if (bucket.error || bucket.data.public) return { error: unavailable };
    const r = await db.rpc('grading_example', { p_actor: user.id, p_action: 'prepare', p_data: { assignmentId, name: file.name, size: file.size, version } });
    return r.error ? { error: unavailable } : outcome(r.data);
  } catch { return { error: unavailable }; }
}
export async function cancelExample(id: string): Promise<{ error?: string; attached?: { id: string; name: string; isCurrent: boolean } }> {
  const user = await requireUser(true);
  if (!isUuid(id)) return { error: 'Invalid upload.' };
  try {
    const db = storageServer();
    const r = await db.rpc('grading_example', { p_actor: user.id, p_action: 'cancel', p_id: id });
    const receipt = outcome(r.data);
    if (r.error || 'error' in receipt) return { error: 'Cancellation could not be confirmed. Retry; unfinished uploads expire after one hour.' };
    if (receipt.document.state === 'ready') return { attached: { id: receipt.document.id, name: receipt.document.original_filename, isCurrent: receipt.document.is_current } };
    if (receipt.document.state === 'abandoned') {
      const removed = await db.storage.from('grading-examples').remove([receipt.document.path]);
      if (removed.error) return { error: 'Upload canceled. Cleanup needs a retry; use Cancel again.' };
    }
    return {};
  } catch { return { error: 'Could not cancel. Please retry.' }; }
}
export async function finalizeExample(id: string): Promise<ExampleResult> {
  const user = await requireUser(true);
  if (!isUuid(id)) return { error: 'Invalid upload.' };
  try {
    const db = storageServer();
    const r = await db.rpc('grading_example', { p_actor: user.id, p_action: 'get', p_id: id });
    const receipt = outcome(r.data);
    if (r.error || 'error' in receipt) return { error: 'Upload unavailable. Cancel and start a new upload.' };
    const d = receipt.document;
    if (d.state === 'ready') return receipt;
    if (d.state !== 'pending') return { error: 'Upload canceled or expired. Select the PDF again.' };
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/grading-examples/${d.path.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, apikey: process.env.SUPABASE_SECRET_KEY! }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    let bytes: Buffer;
    try { bytes = await readBounded(response); }
    catch (error) {
      if (error instanceof RangeError) { await cancelExample(id); return { error: 'PDF exceeds the 20 MB limit. Select a smaller PDF.' }; }
      return { error: 'Inspection was interrupted. Retry saving; your PDF is retained.' };
    }
    try { await inspectFile(bytes, d.original_filename, response.headers.get('content-type')?.split(';')[0] ?? '', d.file_size); }
    catch { await cancelExample(id); return { error: 'The uploaded file is not a valid matching PDF. Cancel and select a valid PDF.' }; }
    const saved = await db.rpc('grading_example', { p_actor: user.id, p_action: 'finalize', p_id: id, p_data: { size: bytes.length } });
    if (saved.error) return { error: 'Could not attach example. Retry saving; your upload is retained.' };
    const result = outcome(saved.data);
    if ('document' in result && result.document.state === 'ready') revalidatePath('/admin', 'layout');
    else return { error: 'Example changed or expired. Cancel this upload, reload and reselect the PDF.' };
    return result;
  } catch { return { error: unavailable }; }
}
export async function removeExample(assignmentId: string, version: number): Promise<{ version: number } | { error: string }> {
  const user = await requireUser(true);
  if (!isUuid(assignmentId) || !Number.isSafeInteger(version) || version < 0) return { error: 'Invalid example reference.' };
  try {
    const r = await storageServer().rpc('grading_example', { p_actor: user.id, p_action: 'remove', p_data: { assignmentId, version } });
    if (r.error || !r.data || typeof r.data !== 'object' || !('removed' in r.data)) return { error: 'Example changed. Reload before removing it.' };
    revalidatePath('/admin', 'layout');
    return { version: Number(r.data.version) };
  } catch { return { error: 'Could not remove example. Please retry.' }; }
}

export async function saveScheduleGradingExample(assignmentId:string,example:unknown,version:number):Promise<{version:number}|{error:string}>{
 await requireUser(true);
 if(!isUuid(assignmentId)||!Number.isSafeInteger(version)||version<0)return {error:'Reload before saving.'};
 const invalid=scheduleReferenceError(example);if(invalid)return {error:invalid};
 try{const db=await createClient();const r=await db.rpc('save_schedule_grading_example',{p_assignment:assignmentId,p_example:example as import('@/lib/supabase/database.types').Json,p_version:version});
 if(r.error)return {error:r.error.code==='40001'?'Another admin changed this schedule. Your edits are retained; copy them before reloading.':'Could not save the example schedule. Your edits are retained; retry.'};
 revalidatePath('/admin','layout');return {version:(r.data as {version:number}).version};
 }catch{return {error:'Could not confirm the save. Your edits are retained; retry.'};}
}
