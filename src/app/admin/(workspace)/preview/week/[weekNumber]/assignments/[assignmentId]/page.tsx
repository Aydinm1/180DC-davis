import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readAdminPreview } from '@/lib/supabase/admin-preview';
import { buildWeekDetail } from '@/lib/program/week-detail';
import { AssignmentContent } from '@/components/program/assignment-content';
export const metadata: Metadata = {title:'Assignment preview | GAP Admin'};
export default async function PreviewAssignment({params,searchParams}: {
  params: Promise<{weekNumber:string;assignmentId:string}>; searchParams: Promise<{cohort?:string}>;
}) {
  const [{weekNumber,assignmentId},{cohort}] = await Promise.all([params,searchParams]);
  const data = await readAdminPreview(cohort); if (!data) notFound();
  const detail = buildWeekDetail({...data,weekNumber,cohortId:data.cohort.id,enrollmentId:data.enrollment.id,now:new Date()});
  const assignment = detail?.assignments.find(a => a.id === assignmentId); if (!detail || !assignment) notFound();
  return <AssignmentContent preview assignment={assignment} weekNumber={detail.week.weekNumber} enrollmentId="admin-preview" weekHref={`/admin/preview/week/${detail.week.weekNumber}?cohort=${encodeURIComponent(data.cohort.id)}`} />;
}
