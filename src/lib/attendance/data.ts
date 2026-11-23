import 'server-only';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { readPages } from '@/lib/supabase/pagination';
import { isCheckInOpen, type AttendanceAdminData, type AttendancePrompt } from './types';

export async function readAttendanceAdmin(cohortId: string): Promise<AttendanceAdminData> {
  await requireUser(true);
  const db = await createClient();
  const { data, error } = await db.rpc('attendance', { p_action: 'admin_read', p_data: { cohortId } });
  if (error) throw new Error('Could not load attendance. Refresh to retry.');
  const result = data as unknown as AttendanceAdminData;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  // Only an explicit application origin is used. No external QR service receives the code.
  if (site && /^https?:\/\//.test(site)) {
    await Promise.all(result.sessions.map(async session => {
      if (!isCheckInOpen(session, result.now)) return;
      const url = new URL(`/attendance/${session.id}`, site);
      url.hash = `code=${session.code}`;
      session.qr = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'M', margin: 4, width: 384 });
    }));
  }
  return result;
}

export async function readAttendancePrompts(cohortId: string): Promise<AttendancePrompt[]> {
  await requireUser();
  const db = await createClient();
  const { data, error } = await db.from('attendance_sessions').select('id,week_id,program_weeks!inner(week_number,title,cohort_id)')
    .eq('program_weeks.cohort_id', cohortId).is('closed_at', null).gt('closes_at', new Date().toISOString()).order('closes_at');
  if (error) throw new Error('Could not load workshop check-in. Refresh to retry.');
  return data.map(row => ({ id: row.id, weekNumber: row.program_weeks.week_number, title: row.program_weeks.title }));
}

export async function readAttendanceMember(sessionId: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { signedIn: false as const };
  const member = await requireUser();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) return { signedIn: true as const };
  const { data: session, error } = await db.from('attendance_sessions').select('*,program_weeks!inner(week_number,title,cohort_id,published)').eq('id', sessionId).maybeSingle();
  if (error) throw new Error('Could not load workshop check-in. Refresh to retry.');
  if (!session) return { signedIn: true as const };
  const { data: enrollment, error: enrollmentError } = await db.from('cohort_enrollments').select('id').eq('person_id', member.personId).eq('cohort_id', session.program_weeks.cohort_id).eq('participation_status', 'enrolled').maybeSingle();
  const { data: cohort, error: cohortError } = await db.from('program_cohorts').select('state').eq('id', session.program_weeks.cohort_id).maybeSingle();
  if (enrollmentError || cohortError) throw new Error('Could not verify workshop enrollment. Refresh to retry.');
  if (!enrollment || cohort?.state !== 'active' || !session.program_weeks.published) return { signedIn: true as const };
  const records = await readPages((from,to) => db.from('attendance_records').select('*').eq('session_id', sessionId).eq('enrollment_id', enrollment.id).order('id').range(from,to));
  return { signedIn: true as const, session, weekNumber: session.program_weeks.week_number, title: session.program_weeks.title, receipt: records.data.find(record => record.present) };
}
