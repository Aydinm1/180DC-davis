import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MemberDashboard } from '@/components/program/member-dashboard';
import { readAdminPreview } from '@/lib/supabase/admin-preview';
import { PageContainer } from '@/components/ui/container';
import { StateMessage } from '@/components/ui/state-message';
export const metadata: Metadata = { title: 'Member preview | GAP Admin' };

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { cohort } = await searchParams;
  const data = await readAdminPreview(cohort);
  if (!data) {
    if (cohort) notFound();
    return <PageContainer className="py-12"><StateMessage title="No cohorts to preview">Create a cohort from Members → Manage cohort.</StateMessage></PageContainer>;
  }
  return <MemberDashboard input={{ ...data, now: new Date().toISOString() }} preview />;
}
