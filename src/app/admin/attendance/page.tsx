import { AdminAttendance } from '@/components/attendance/admin-attendance';
import { readAttendanceAdmin } from '@/lib/attendance/data';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { readPages } from '@/lib/supabase/pagination';
export const metadata = { title: 'Attendance | GAP Admin' };
export default async function AttendanceAdminPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { cohort } = await searchParams;
  await requireUser(true);
  const db = await createClient();
  // Do not wait for the shared layout's submissions/content/progress projection.
  const { data: cohorts } = await readPages((from, to) => db.from('program_cohorts').select('id,state').order('id').range(from, to));
  const selected = cohorts.find(c => c.id === cohort) ?? cohorts.find(c => c.state === 'active') ?? cohorts[0];
  if (!selected) return <main className="px-6 py-12"><h1 className="text-3xl font-bold">Attendance</h1><p className="mt-4">Choose a cohort once your program is ready.</p></main>;
  const data = await readAttendanceAdmin(selected.id);
  return <AdminAttendance key={selected.id} cohortId={selected.id} data={data} />;
}
