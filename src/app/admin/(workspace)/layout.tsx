import { Suspense, type ReactNode } from "react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { readWorkspace } from '@/lib/supabase/data';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user,state } = await readWorkspace(true);
  return <Suspense fallback={null}><AdminWorkspace user={user} initialState={state}>{children}</AdminWorkspace></Suspense>;
}
