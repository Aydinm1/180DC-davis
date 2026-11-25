import type { Metadata } from "next";
import { Suspense } from 'react';
import { AdminOverview } from "@/components/admin/admin-overview";
import { readAdminQueue } from '@/lib/supabase/admin-queue';
import { AdminQueueWorkspace } from '@/components/admin/admin-queue-workspace';
import { readGuidedProject } from '@/lib/guided/data';
import { assignmentsForWeek } from '@/lib/program/types';
import type { QueueWeek } from '@/lib/program/admin';
import { ProjectDirectionRequests } from '@/components/admin/project-direction-requests';

export const metadata: Metadata = { title: "Admin | GAP" };

async function ProjectInbox({weeks}:{weeks:readonly QueueWeek[]}) {
  const entries=await Promise.all(weeks.flatMap(w=>assignmentsForWeek(w).filter(a=>a.workflow==='guided').map(async a=>({assignmentId:a.id,weekId:w.id,cohortId:w.cohortId,title:a.title,project:await readGuidedProject(a.id)}))));
  return <ProjectDirectionRequests entries={entries}/>;
}

export default async function AdminPage({searchParams}:{searchParams:Promise<{cohort?:string}>}) {
  const params=await searchParams;
  const {user,state,cohortId,hasMyProgram}=await readAdminQueue(params.cohort);
  return <AdminQueueWorkspace user={user} state={state} cohortId={cohortId} hasMyProgram={hasMyProgram}><AdminOverview projectInbox={<Suspense key={cohortId} fallback={<p role="status" className="mt-8 text-sm text-ink-soft">Loading project requests…</p>}><ProjectInbox weeks={state.weeks}/></Suspense>}/></AdminQueueWorkspace>;
}
