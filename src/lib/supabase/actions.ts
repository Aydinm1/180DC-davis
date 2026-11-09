'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from './server';
import { requireUser, requireParticipant } from './auth';
import { normalizeSubmissionText, normalizeSubmissionUrl } from '@/lib/program/submission';
import { validateCohortDates } from '@/lib/program/admin';

export async function saveAdmin(action: string, data: Record<string, unknown>) {
  await requireUser(true);
  if (!['review','week','enrollment','enroll','roster','cohort_create','cohort_state','cohort_dates','enrollment_test'].includes(action)) return { error:'Unknown operation.' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error:'Invalid form data. Check the entered values and try again.' };
  if (action === 'enrollment_test') {
    if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id) || typeof data.isTest !== 'boolean') return { error:'Invalid test participation.' };
    const db = await createClient();
    const result = await db.rpc('set_test_participation',{p_id:data.id,p_is_test:data.isTest});
    if (result.error) return {error:result.error.code==='22023'&&result.error.message.startsWith('Remove this participant from their unlocked team')?result.error.message:'Could not update test participation. Refresh and retry.'};
    revalidatePath('/admin','layout'); revalidatePath('/','layout');
    return {id:result.data};
  }
  if (action === 'cohort_dates') {
    if (typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.id) || typeof data.startsOn !== 'string' || typeof data.endsOn !== 'string') return { error: 'Invalid cohort dates.' };
    const invalid = validateCohortDates({ startsOn: data.startsOn, endsOn: data.endsOn });
    if (invalid) return { error: invalid };
    const db = await createClient();
    const result = await db.rpc('update_cohort_dates', { p_id: data.id, p_starts_on: data.startsOn, p_ends_on: data.endsOn });
    if (result.error) return { error: 'Could not save cohort dates. Your changes have been kept.' };
    revalidatePath('/admin', 'layout'); revalidatePath('/', 'layout');
    return { id: result.data };
  }
  const db = await createClient();
  let payload;
  try { payload = JSON.parse(JSON.stringify(data)); }
  catch { return { error:'Invalid form data. Check the entered values and try again.' }; }
  const result = action === 'review'
    ? await db.rpc('review_submission', { p_data: payload }).single()
    : await db.rpc('admin_mutate', { p_action: action, p_data: payload });
  const { error } = result;
  if (error?.code === '22023' && /^((Change Viewer access)|(Resolve current cohort participation)|(Submission mode is locked))/.test(error.message)) return { error: error.message };
  if (error?.code === '22023' && error.message === 'Configure a recommended direction for every populated official team before publishing') return { error:error.message };
  if (error?.code === '22023' && error.message === 'Configure every spreadsheet investigation before publishing') return {error:error.message};
  if (error?.code === '22023' && error.message === 'Clear the saved team briefs before changing submission type or workflow') return {error:error.message};
  if (error) return { error:error.code==='40001' ? 'This record changed. Refresh before saving again.' : 'Could not save. Check the entered values and try again. Existing submissions and inactive access are protected.' };
  const receipt = typeof result.data === 'object' && result.data !== null ? result.data : null;
  revalidatePath('/admin','layout');
  revalidatePath('/','layout');
  return { id:receipt?.id ?? result.data as string, updatedAt:receipt?.updated_at };
}

export async function saveLink(assignmentId: string, url: string, expectedId?: string, expectedUpdatedAt?: string, requestId?: string) {
  await requireParticipant();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof assignmentId !== 'string' || !uuid.test(assignmentId) || typeof url !== 'string' ||
    (expectedId !== undefined && (typeof expectedId !== 'string' || !uuid.test(expectedId))) ||
    (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(expectedUpdatedAt)))) ||
    ((expectedId === undefined) !== (expectedUpdatedAt === undefined))) {
    return { error:'Invalid submission details. Refresh and try again. Your draft has been kept.' };
  }
  if (requestId !== undefined && (typeof requestId !== 'string' || !uuid.test(requestId))) return {error:'Invalid submission request.'};
  const normalized = normalizeSubmissionUrl(url);
  if ('error' in normalized) return { error:normalized.error };
  const db = await createClient();
  const { error } = await db.rpc('submit_response',{ p_assignment:assignmentId,p_type:'link',p_value:normalized.value,p_request:requestId??crypto.randomUUID(),p_expected:expectedId,p_version:expectedUpdatedAt });
  if (error) return { error:error.code==='40001' ? 'Your submission changed. Refresh before submitting again.' : 'Could not submit. The assignment may be closed or unavailable. Your draft has been kept.' };
  revalidatePath('/','layout');
  revalidatePath('/admin','layout');
  return { success:true };
}

export async function saveText(assignmentId: string, text: string, expectedId?: string, expectedUpdatedAt?: string, requestId?: string) {
  await requireParticipant();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof assignmentId !== 'string' || !uuid.test(assignmentId) ||
    (expectedId !== undefined && (typeof expectedId !== 'string' || !uuid.test(expectedId))) ||
    (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(expectedUpdatedAt)))) ||
    ((expectedId === undefined) !== (expectedUpdatedAt === undefined))) {
    return { error:'Invalid submission details. Refresh and try again. Your draft has been kept.' };
  }
  if (requestId !== undefined && (typeof requestId !== 'string' || !uuid.test(requestId))) return {error:'Invalid submission request.'};
  const normalized = normalizeSubmissionText(text);
  if ('error' in normalized) return { error:normalized.error };
  const db = await createClient();
  const { error } = await db.rpc('submit_response', { p_assignment:assignmentId,p_type:'text',p_value:normalized.value,p_request:requestId??crypto.randomUUID(),p_expected:expectedId,p_version:expectedUpdatedAt });
  if (error) return { error:error.code==='40001' ? 'Your submission changed. Refresh before submitting again.' : 'Could not submit. The assignment may be closed or unavailable. Your draft has been kept.' };
  revalidatePath('/','layout');
  revalidatePath('/admin','layout');
  return { success:true };
}
