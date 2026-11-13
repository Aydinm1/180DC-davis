import {readScheduleReview} from '@/lib/schedules/data';
import type { Metadata } from "next";
import { AdminSubmissionReview } from "@/components/admin/admin-submission-review";
import { readWorkspace } from '@/lib/supabase/data';
import { readGradingReferences } from '@/lib/grading/data';
import { readGuidedProject } from '@/lib/guided/data';
import { assignmentsForWeek } from '@/lib/program/types';
import { readInvestigationReview } from '@/lib/investigations/data';

export const metadata: Metadata = { title: "Review submission | GAP" };

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state } = await readWorkspace(true);
  const submission = state.submissions.find(s => s.id === id && s.isCurrent);
  const [reference] = await readGradingReferences(submission ? [submission.assignmentId] : []);
  const assignment=state.weeks.flatMap(assignmentsForWeek).find(a=>a.id===submission?.assignmentId);
  const project=assignment?.workflow==='guided'&&submission?.teamId?await readGuidedProject(assignment.id,submission.teamId):undefined;
  const investigationEntries=assignment?.workflow==='investigation'?await Promise.all(state.submissions.filter(s=>s.assignmentId===assignment.id&&s.enrollmentId===submission?.enrollmentId).map(async s=>[s.id,await readInvestigationReview(s.id)] as const)):[];
  const scheduleEntries=assignment?.workflow==='schedule'?await Promise.all(state.submissions.filter(s=>s.assignmentId===assignment.id&&s.enrollmentId===submission?.enrollmentId).map(async s=>[s.id,await readScheduleReview(s.id)] as const)):[];
  return <AdminSubmissionReview key={id} submissionId={id} reference={reference} project={project?{...project,teams:undefined}:undefined} schedules={Object.fromEntries(scheduleEntries)} investigations={Object.fromEntries(investigationEntries)} />;
}
