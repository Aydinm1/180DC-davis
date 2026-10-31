import { readCaseExercise } from '@/lib/cases/data';
import { caseTemplate } from '@/lib/cases/content';
import type { Metadata } from "next";
import { AdminWeekEditor } from "@/components/admin/admin-week-editor";
import { readWorkspace } from '@/lib/supabase/data';
import { readGradingReferences } from '@/lib/grading/data';
import { assignmentsForWeek } from '@/lib/program/types';
import { readGuidedProject } from '@/lib/guided/data';
export const metadata: Metadata = { title: "Edit week | GAP Admin" };
export default async function AdminWeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state } = await readWorkspace(true);
  const week = state.weeks.find(w => w.id === id);
  const assignments = week ? assignmentsForWeek(week) : [];
  const [references, guidedEntries, caseEntries] = await Promise.all([
    readGradingReferences(assignments.map(a => a.id)),
    Promise.all(assignments.map(async a => [a.id, await readGuidedProject(a.id)])),
    Promise.all(assignments.map(async a => [a.id, await readCaseExercise(a.id, true)])),
  ]);
  const guided = Object.fromEntries(guidedEntries), cases = Object.fromEntries(caseEntries);
  return <AdminWeekEditor key={id} weekId={id} references={references} guided={guided} cases={cases} caseTemplate={caseTemplate} />;
}
