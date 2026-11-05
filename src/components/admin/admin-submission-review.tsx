"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AssignmentStatusBadge } from "@/components/program/assignment-status-badge";
import { SubmittedWorkRecord } from "@/components/program/submitted-work-record";
import { WrittenResponse } from '@/components/program/written-response';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { filterSubmissionRows, getNextAwaitingSubmission, type AdminQueueFilter } from "@/lib/program/admin";
import { buildWeekQueue } from '@/lib/program/week-queue';

import { formatSubmissionTime } from "@/lib/program/state";
import { submissionDisplayName, validateReviewFeedback } from "@/lib/program/submission";
import { assignmentsForWeek, type SubmissionStatus } from "@/lib/program/types";
import { useAdminWorkspace } from "./admin-workspace";
import { GradingReferencePanel } from './grading-reference';
import type { GradingReference } from '@/lib/grading/types';
import type { GuidedProject } from '@/lib/guided/types';
import { isImageMime } from '@/lib/uploads/format';
import { SubmissionImage } from './submission-image';

function ViewAttempt({ attempt, announce }: { attempt: ReturnType<typeof useAdminWorkspace>["submissions"][number]; announce: (message: string) => void }) {
  if (attempt.payload.type === 'text') return <WrittenResponse text={attempt.payload.submittedText} />;
  const className = "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border-strong px-4 text-sm font-bold text-ink hover:bg-surface-subtle";
  return attempt.payload.type === "link" ? <a className={className} href={attempt.payload.submittedUrl} target="_blank" rel="noreferrer">Open submitted link ↗</a> : /^[0-9a-f-]{36}$/i.test(attempt.id) ? <>
    {isImageMime(attempt.payload.mimeType) ? <SubmissionImage key={attempt.id} id={attempt.id} name={attempt.payload.originalFilename} /> : null}
    <a className={className} href={`/api/submissions/${attempt.id}/download`}>Download original file</a>
  </> : <button className={className} type="button" onClick={() => announce("This fictional preview file is not available to download.")}>Download original file</button>;
}

export function AdminSubmissionReview({ submissionId, reference, project }: { submissionId: string; reference?: GradingReference; project?: GuidedProject }) {
  const workspace = useAdminWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const submission = workspace.submissions.find((item) => item.id === submissionId && item.isCurrent);
  const [status, setStatus] = useState<SubmissionStatus>(submission?.status ?? "submitted");
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(submission?.updatedAt);
  const [message, setMessage] = useState("");
  const [saving, startSaving] = useTransition();
  const dirty = Boolean(submission && (status !== submission.status || feedback !== (submission.feedback ?? "")));
  const setUnsavedChanges = workspace.setUnsavedChanges;
  useEffect(() => { setUnsavedChanges(dirty); return () => setUnsavedChanges(false); }, [dirty, setUnsavedChanges]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { const guard = (event: MouseEvent) => { const anchor = (event.target as Element).closest("a"); if (dirty && anchor && !window.confirm("Discard your unsaved review?")) { event.preventDefault(); event.stopPropagation(); } }; document.addEventListener("click", guard, true); return () => document.removeEventListener("click", guard, true); }, [dirty]);

  if (!submission) return <PageContainer className="py-16"><StateMessage title="Submission not found">Return to the review queue and choose a current submission in this cohort.</StateMessage></PageContainer>;
  const team=workspace.teams?.find(t=>t.id===submission.teamId&&t.cohortId===workspace.selectedCohortId);
  const enrollment = workspace.enrollments.find((item) => (team?team.enrollmentIds.includes(item.id):item.id === submission.enrollmentId) && item.cohortId === workspace.selectedCohortId);
  const person = workspace.people.find((item) => item.id === enrollment?.personId);
  const week = workspace.weeks.find((item) => item.cohortId === workspace.selectedCohortId && assignmentsForWeek(item).some((assignment) => assignment.id === submission.assignmentId));
  if (!enrollment || !week) return <PageContainer className="py-16"><StateMessage title="Submission not found">This submission does not belong to the selected cohort.</StateMessage></PageContainer>;
  const currentSubmission = submission;
  const history = workspace.submissions.filter((item) => (team?item.teamId===team.id:item.enrollmentId === submission.enrollmentId) && item.assignmentId === submission.assignmentId && !item.isCurrent).toSorted((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const assignment = assignmentsForWeek(week).find((item) => item.id === submission.assignmentId);
  const weekWide = params.get('week') === week.id && !params.has('assignment');
  const allRows = buildWeekQueue(workspace,workspace.selectedCohortId,week.id,new Date(),enrollment.isTest?'test':'official').rows;
  const requestedFilter = params.get('status');
  const queueFilter: AdminQueueFilter = ['awaiting_review','revision_requested','missing','complete','all'].includes(requestedFilter??'') ? requestedFilter as AdminQueueFilter : 'awaiting_review';
  const queueRows = filterSubmissionRows(weekWide ? allRows : allRows.filter(r=>r.assignment.id===submission.assignmentId),queueFilter,params.get('q')??'');
  const nextSubmission = getNextAwaitingSubmission(queueRows, submission.id);
  const backParams = new URLSearchParams(params.toString());
  backParams.set("cohort", workspace.selectedCohortId); backParams.set("week", week.id);
  if (weekWide) backParams.delete('assignment'); else backParams.set("assignment", submission.assignmentId);
  if (enrollment.isTest) backParams.set('audience','test'); else backParams.delete('audience');
  const backHref = `/admin?${backParams.toString()}#submissions`;

  function saveReview(reviewNext = false) {
    const error = status === "submitted" ? undefined : validateReviewFeedback(status, feedback);
    if (error) return setMessage(error);
    startSaving(async () => {
      const result = await workspace.updateSubmission(currentSubmission.id, status, feedback, expectedUpdatedAt);
      if (result.error) return setMessage(result.error);
      setExpectedUpdatedAt(result.updatedAt);
      if (status === "submitted") setFeedback("");
      workspace.setUnsavedChanges(false);
      if (reviewNext && nextSubmission) router.push(`/admin/submissions/${nextSubmission.id}?${backParams.toString()}`);
      else if (reviewNext) router.push(backHref);
      else setMessage("Review saved.");
    });
  }

  return <main className="pb-20 sm:pb-24"><PageContainer className="py-9 sm:py-11">
    <Link href={backHref} className="inline-flex min-h-11 items-center text-sm font-bold text-action">← Review queue</Link>
    {enrollment.isTest ? <p className="mt-4 text-sm font-bold text-ink-soft">Test submission</p> : null}
    <header className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {week.weekNumber.toString().padStart(2, "0")} · Submission review</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{team?.name??person?.fullName ?? "Member submission"}</h1><p className="mt-3 text-base text-ink-soft">{assignment?.title} · Submitted {formatSubmissionTime(submission.submittedAt)}</p>{team?<p className="mt-3 text-sm text-ink-soft">{team.enrollmentIds.map(id=>workspace.people.find(p=>p.id===workspace.enrollments.find(e=>e.id===id)?.personId)?.fullName).filter(Boolean).join(' · ')}</p>:null}</header>

    <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:gap-10">
      <section aria-labelledby="submitted-work-heading"><h2 id="submitted-work-heading" className="text-2xl font-bold">Submitted work</h2><div className="mt-5"><SubmittedWorkRecord attempt={submission}><ViewAttempt attempt={submission} announce={setMessage} /></SubmittedWorkRecord></div>
        {history.length ? <details className="mt-5 rounded-card border border-border bg-surface p-5"><summary className="cursor-pointer font-bold">Previous submissions ({history.length})</summary><ol className="mt-5 space-y-4">{history.map((attempt) => <li key={attempt.id} className="border-t border-border pt-4 first:border-0 first:pt-0"><p className="font-bold">{submissionDisplayName(attempt)}</p><p className="mt-1 text-sm text-ink-soft">{formatSubmissionTime(attempt.submittedAt)} · {attempt.status.replace("_", " ")}</p>{attempt.feedback ? <p className="mt-2 text-sm leading-6 text-ink-soft">{attempt.feedback}</p> : null}<div className="mt-3"><ViewAttempt attempt={attempt} announce={setMessage} /></div></li>)}</ol></details> : null}
      </section>
      <section aria-labelledby="review-decision-heading">{project?<details className="mb-5 rounded-card border border-border p-5"><summary className="min-h-11 cursor-pointer font-bold">Confirmed project direction</summary><p className="mt-3 text-sm font-semibold">{project.recommendation?.company} · {project.state?.direction==='recommended'?project.recommendation?.title:'Approved alternative'}</p>{project.state?.direction==='alternative'?project.requests?.filter(r=>r.status==='approved').map(r=><div key={r.id} className="mt-3 whitespace-pre-wrap text-sm"><p>{r.proposal.direction}</p><p className="mt-2">{r.proposal.question}</p><p className="mt-2">Admin note: {r.decision_note||'Approved without a note.'}</p></div>):null}</details>:null}<GradingReferencePanel reference={reference} editHref={`/admin/weeks/${week.id}?cohort=${workspace.selectedCohortId}#grading-${submission.assignmentId}`} /><Card className="p-6 sm:p-7"><div className="flex flex-wrap items-center gap-3"><h2 id="review-decision-heading" className="text-2xl font-bold">Feedback and decision</h2><AssignmentStatusBadge state={submission.status} /></div><p className="mt-3 text-sm leading-6 text-ink-soft">Choose the next state for this submission.</p>
        <fieldset className="mt-6 grid gap-3"><legend className="sr-only">Submission status</legend>{(["submitted", "revision_requested", "completed"] as const).map((value) => <label key={value} className={`cursor-pointer rounded-card border p-4 text-sm font-bold outline-none focus-within:ring-2 focus-within:ring-action focus-within:ring-offset-2 ${status === value ? "border-action bg-success-bg" : "border-border bg-surface"}`}><input type="radio" className="mr-3 size-4 accent-action" checked={status === value} onChange={() => { setStatus(value); setMessage(""); }} />{value === "submitted" ? "Return to awaiting review" : value === "revision_requested" ? "Request revision" : "Mark complete"}</label>)}</fieldset>
        <label className="mt-6 block text-sm font-bold" htmlFor="admin-feedback">Feedback {status === "revision_requested" ? "(required)" : "(optional)"}</label><textarea id="admin-feedback" rows={8} value={feedback} onChange={(event) => { setFeedback(event.target.value); setMessage(""); }} className="mt-2 w-full rounded-card border border-border-strong bg-surface p-4 text-base leading-7" placeholder="Give the member clear, actionable feedback." />
        {message ? <p className={`mt-4 text-sm font-bold ${message === "Review saved." ? "text-success-text" : "text-danger-text"}`} role="status">{message}</p> : null}<div className="mt-6 flex flex-wrap gap-3"><Button disabled={!dirty || saving} onClick={() => saveReview(false)}>{saving ? "Saving…" : "Save review"}</Button><Button variant="secondary" disabled={saving} onClick={() => saveReview(true)}>Save &amp; review next</Button></div>
      </Card></section>
    </div>
  </PageContainer></main>;
}
