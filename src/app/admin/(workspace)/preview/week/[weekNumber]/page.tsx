import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readAdminPreview } from '@/lib/supabase/admin-preview';
import { buildWeekDetail } from '@/lib/program/week-detail';
import { WeekContent } from '@/components/program/week-content';
export const metadata: Metadata = { title: 'Week preview | GAP Admin' };

export default async function PreviewWeek({ params, searchParams }: {
  params: Promise<{ weekNumber: string }>; searchParams: Promise<{ cohort?: string }>;
}) {
  const [{ weekNumber }, { cohort }] = await Promise.all([params, searchParams]);
  const data = await readAdminPreview(cohort);
  if (!data) notFound();
  const detail = buildWeekDetail({ ...data, cohortId: data.cohort.id, enrollmentId: data.enrollment.id, weekNumber, now: new Date() });
  if (!detail) notFound();
  return <WeekContent detail={detail} preview programHref={`/admin/preview?cohort=${data.cohort.id}`} />;
}
