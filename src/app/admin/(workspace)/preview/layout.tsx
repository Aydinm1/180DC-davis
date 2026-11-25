import type { ReactNode } from 'react';
import { requireUser } from '@/lib/supabase/auth';
import { PageContainer } from '@/components/ui/container';

export default async function PreviewLayout({ children }: { children: ReactNode }) {
  await requireUser(true);
  return <><PageContainer className="pt-6"><aside className="rounded-lg border border-border bg-surface p-4" aria-label="Preview mode"><p className="font-bold text-brand-deep">Admin preview · Read only</p></aside></PageContainer>{children}</>;
}
