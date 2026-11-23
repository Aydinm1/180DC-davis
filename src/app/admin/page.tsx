import type { Metadata } from "next";
import { Suspense } from 'react';
import { AdminOverview } from "@/components/admin/admin-overview";
import { readWorkspace } from '@/lib/supabase/data';
import { readGuidedProject } from '@/lib/guided/data';
import { assignmentsForWeek } from '@/lib/program/types';
import type { AdminWeek } from '@/lib/program/admin';
import { ProjectDirectionRequests } from '@/components/admin/project-direction-requests';

export const metadata: Metadata = { title: "Admin | GAP" };

async function ProjectInbox({weeks}:{weeks:readonly AdminWeek[]}) {
  const entries=await Promise.all(weeks.flatMap(w=>assignmentsForWeek(w).filter(a=>a.workflow==='guided').map(async a=>({assignmentId:a.id,weekId:w.id,cohortId:w.cohortId,title:a.title,project:await readGuidedProject(a.id)}))));
  return <ProjectDirectionRequests entries={entries}/>;
}

export default async function AdminPage({searchParams}:{searchParams:Promise<{cohort?:string}>}) {
  const [{state},params]=await Promise.all([readWorkspace(true),searchParams]);
  const cohort=state.cohorts.find(c=>c.id===params.cohort)??state.cohorts.find(c=>c.state==='active')??state.cohorts[0];
  const weeks=state.weeks.filter(w=>w.cohortId===cohort?.id);
  return <AdminOverview projectInbox={<Suspense key={cohort?.id} fallback={<p role="status" className="mt-8 text-sm text-ink-soft">Loading project requests…</p>}><ProjectInbox weeks={weeks}/></Suspense>}/>;
}
