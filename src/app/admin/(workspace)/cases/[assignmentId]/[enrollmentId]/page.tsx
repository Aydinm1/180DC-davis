import { readAdminCaseResponse } from '@/lib/cases/admin-data';
import { caseStatus } from '@/lib/cases/progress';
import { AdminCaseResponse } from '@/components/admin/admin-case-response';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Case responses | GAP' };

export default async function CaseResponsePage({ params, searchParams }: {
  params: Promise<{ assignmentId: string; enrollmentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ assignmentId, enrollmentId }, query] = await Promise.all([params, searchParams]);
  const single = (key: string) => { const value = query[key]; if (Array.isArray(value)) notFound(); return value; };
  const data = await readAdminCaseResponse(assignmentId, enrollmentId, single('cohort'));
  const back = new URLSearchParams({ cohort: data.week.cohort_id, week: data.week.id, assignment: assignmentId, caseStatus: caseStatus(single('caseStatus'), single('status')) });
  const search = single('q'); if (search) back.set('q', search);
  if (data.enrollment.is_test) back.set('audience', 'test');
  return <AdminCaseResponse name={data.person.full_name} email={data.person.email} title={data.assignment.title} weekNumber={data.week.week_number} isTest={data.enrollment.is_test} exercise={data.exercise} backHref={'/admin?' + back + '#submissions'} />;
}
