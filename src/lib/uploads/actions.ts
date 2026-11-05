'use server';
import { revalidatePath } from 'next/cache';
import { requireParticipant } from '@/lib/supabase/auth';
import { storageServer, storageObjectUrl, readBounded } from './server';
import { fileError, fileMime, type UploadResult } from './format';
import { inspectFile } from './inspect';
import { createClient } from '@/lib/supabase/server';

const failure = 'Private uploads are unavailable. Check that local Supabase Storage is running, then retry. Your file selection is kept; link submission is still available.';
const messages: Record<string, string> = {
  stale: 'Your submission changed. Refresh before submitting again.',
  closed: 'Completed work cannot be replaced.',
  abandoned: 'This upload expired or was canceled. Select the file and start a new upload.',
  invalid: 'File validation failed. Use a supported document or a still PNG, JPEG, or WebP image up to 50 megapixels, then upload again.',
  too_many: 'Too many unfinished uploads. Cancel one or wait for its one-hour expiry.',
};
function resultMessage(result: UploadResult): UploadResult {
  return 'error' in result ? { error: messages[result.error] ?? failure } : result;
}
export async function prepareUpload(assignmentId: string, file: { name: string; size: number; type: string }, expectedId?: string, expectedUpdatedAt?: string): Promise<UploadResult> {
  const user = await requireParticipant();
  const invalid = fileError(file); if (invalid) return { error: invalid };
  try {
    const { data: assignment, error: assignmentError } = await (await createClient()).from('assignments').select('workflow').eq('id', assignmentId).maybeSingle();
    if (assignmentError || !assignment) return { error: 'Assignment unavailable. Refresh before uploading.' };
    const workflowError = fileError(file, assignment.workflow !== 'standard');
    if (workflowError) return { error: workflowError };
    const db = storageServer();
    const bucket = await db.storage.getBucket('submissions');
    if (bucket.error || bucket.data.public) return { error: failure };
    const { data, error } = await db.rpc('file_upload', { p_actor: user.id, p_action: 'prepare', p_data: {
      assignmentId, name: file.name, size: file.size, mime: fileMime(file.name), expectedId, expectedUpdatedAt,
    } });
    return error ? { error: 'Could not prepare this upload. Refresh and check that the assignment is still open.' } : resultMessage(data as UploadResult);
  } catch { return { error: failure }; }
}
export async function cancelUpload(intentId: string) {
  const user = await requireParticipant();
  try {
    const { error } = await storageServer().rpc('file_upload', { p_actor: user.id, p_action: 'cancel', p_intent: intentId });
    return error ? { error: 'Could not cancel. The upload will expire automatically after one hour.' } : { success: true };
  } catch { return { error: failure }; }
}
export async function finalizeUpload(intentId: string): Promise<UploadResult> {
  const user = await requireParticipant();
  try {
    const db = storageServer();
    const args = { p_actor: user.id, p_intent: intentId };
    const { data, error } = await db.rpc('file_upload', { ...args, p_action: 'get' });
    if (error) return { error: 'Upload unavailable. Refresh and sign in again if needed.' };
    const intent = data as UploadResult;
    if ('error' in intent) return resultMessage(intent);
    if (intent.state === 'committed') {
      // A lost response may be retried after the original commit succeeded.
      revalidatePath('/', 'layout'); revalidatePath('/admin', 'layout');
      return intent;
    }
    // Database finalization also rechecks workflow eligibility atomically.
    const response = await fetch(storageObjectUrl(intent.path), { headers: { Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, apikey: process.env.SUPABASE_SECRET_KEY! }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) return { error: 'Upload is not available yet. Retry saving, or cancel and upload again.' };
    let bytes: Buffer;
    try { bytes = await readBounded(response); }
    catch (cause) {
      if (!(cause instanceof RangeError)) throw cause;
      await db.rpc('file_upload', { ...args, p_action: 'cancel' });
      return { error: messages.invalid };
    }
    try { await inspectFile(bytes, intent.name, response.headers.get('content-type')?.split(';')[0] ?? '', intent.size); }
    catch { await db.rpc('file_upload', { ...args, p_action: 'cancel' }); return { error: messages.invalid }; }
    const saved = await db.rpc('file_upload', { ...args, p_action: 'finalize', p_data: { size: bytes.length, mime: intent.mime } });
    if (saved.error) return { error: 'Could not save the submission. Retry saving; your upload is retained.' };
    const result = resultMessage(saved.data as UploadResult);
    if (!('error' in result) && result.state === 'committed') { revalidatePath('/', 'layout'); revalidatePath('/admin', 'layout'); }
    return result;
  } catch { return { error: failure }; }
}
