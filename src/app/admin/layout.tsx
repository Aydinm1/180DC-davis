import { Suspense, type ReactNode } from 'react';
import { requireUser } from '@/lib/supabase/auth';
import { ActivityRecorder } from '@/components/shell/activity-recorder';

export default async function AdminLayout({children}:{children:ReactNode}) {
  await requireUser(true);
  return <><Suspense fallback={null}><ActivityRecorder/></Suspense>{children}</>;
}
