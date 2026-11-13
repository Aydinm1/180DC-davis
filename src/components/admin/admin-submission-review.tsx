"use client";
import {ScheduleComparison} from '@/components/program/schedule-comparison';
import type {ScheduleSnapshot} from '@/lib/schedules/types';

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AssignmentStatusBadge } from "@/components/program/assignment-status-badge";

import { WrittenResponse } from '@/components/program/written-response';
import { Button } from "@/components/ui/button";

import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { filterSubmissionRows, getNextAwaitingSubmission, type AdminQueueFilter } from "@/lib/program/admin";
import { buildWeekQueue } from '@/lib/program/week-queue';

import { formatSubmissionTime } from "@/lib/program/state";
import { submissionDisplayName, validateReviewFeedback } from "@/lib/program/submission";
import { assignmentsForWeek, type SubmissionStatus } from "@/lib/program/types";
import { useAdminWorkspace } from "./admin-workspace";
import { GradingReferenceContent } from './grading-reference';
import type { GradingReference } from '@/lib/grading/types';
import type { GuidedProject } from '@/lib/guided/types';
import { isImageMime } from '@/lib/uploads/format';
import type { InvestigationReview } from '@/lib/investigations/types';
import { InvestigationHintSnapshot } from './investigation-insights';
import {PdfPreview} from './pdf-preview';
import {isPdfFile} from '@/lib/pdf/types';
import {ReviewWorkspace} from './review-workspace';
import { SubmissionImage } from './submission-image';

function ViewAttempt({ attempt, announce, historical=false, fill=false }: { historical?:boolean; fill?:boolean; attempt: ReturnType<typeof useAdminWorkspace>["submissions"][number]; announce: (message: string) => void }) {
  if (attempt.payload.type === 'text') return <WrittenResponse text={attempt.payload.submittedText} />;
  const className = "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border-strong px-4 text-sm font-bold text-ink hover:bg-surface-subtle";
  return attempt.payload.type === "link" ? <a className={className} href={attempt.payload.submittedUrl} target="_blank" rel="noreferrer">Open submitted link ↗</a> : /^[0-9a-f-]{36}$/i.test(attempt.id) ? <>
    {isPdfFile(attempt.payload.mimeType,attempt.payload.originalFilename)?<PdfPreview resource={{kind:'submission',id:attempt.id,name:attempt.payload.originalFilename}} lazy={historical} fill={fill}/>:isImageMime(attempt.payload.mimeType) ? <SubmissionImage key={attempt.id} id={attempt.id} name={attempt.payload.originalFilename} /> : null}
    {!isPdfFile(attempt.payload.mimeType,attempt.payload.originalFilename)?<a download className={className} href={`/api/submissions/${attempt.id}/download`}>Download original file</a>:null}
  </> : <button className={className} type="button" onClick={() => announce("This fictional preview file is not available to download.")}>Download original file</button>;
}

export function AdminSubmissionReview({ submissionId, reference, project, investigations={},schedules={} }: { submissionId: string; reference?: GradingReference; project?: GuidedProject; schedules?:Record<string,ScheduleSnapshot|undefined>;investigations?:Record<string,InvestigationReview|undefined> }) {
  const workspace = useAdminWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const submission = workspace.submissions.find((item) => item.id === submissionId && item.isCurrent);
  const toolsId=useId();
  const [tool,setTool]=useState<'feedback'|'rubric'|'example'>('feedback');
  const [exampleOpened,setExampleOpened]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  function selectTool(next:'feedback'|'rubric'|'example'){setTool(next);if(next==='example')setExampleOpened(true);}
  const [status, setStatus] = useState<SubmissionStatus>(submission?.status ?? "submitted");
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(submission?.updatedAt);
  const [message, setMessage] = useState("");
  const [saving, startSaving] = useTransition();
  const dirty = Boolean(submission && (status !== submission.status || feedback !== (submission.feedback ?? "")));
  const setUnsavedChanges = workspace.setUnsavedChanges;
  useEffect(() => { setUnsavedChanges(dirty); return () => setUnsavedChanges(false); }, [dirty, setUnsavedChanges]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { const guard = (event: MouseEvent) => { const anchor = (event.target as Element).closest("a"); if (dirty && anchor && anchor.target !== '_blank' && !anchor.hasAttribute('download') && !(new URL(anchor.href,location.href).origin === location.origin && /^\/api\/(submissions|grading-examples)\/[^/]+\/download$/.test(new URL(anchor.href,location.href).pathname)) && !window.confirm("Discard your unsaved review?")) { event.preventDefault(); event.stopPropagation(); } }; document.addEventListener("click", guard, true); return () => document.removeEventListener("click", guard, true); }, [dirty]);

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
    if (error) {selectTool('feedback');setMessage(error);return;}
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

  const isPdf=submission.payload.type==='file'&&isPdfFile(submission.payload.mimeType,submission.payload.originalFilename);
  const editHref=`/admin/weeks/${week.id}?cohort=${workspace.selectedCohortId}#grading-${submission.assignmentId}`;
  const tabs=['feedback','rubric','example'] as const;
  const work=<section aria-label="Submitted work" className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface">
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2"><h2 className="text-sm font-semibold">Submitted work</h2>{history.length?<button type="button" aria-pressed={showHistory} className="min-h-11 text-sm font-semibold text-action" onClick={()=>setShowHistory(v=>!v)}>{showHistory?'← Current submission':`History (${history.length})`}</button>:null}</div>
    <div hidden={showHistory} className={`min-h-0 flex-1 ${isPdf?'':'overflow-y-auto p-5'}`}>
      {submission.payload.type==='file'&&!isPdf?<p className="mb-4 break-all text-sm font-semibold">{submission.payload.originalFilename}</p>:null}
      {schedules[submission.id]?<ScheduleComparison snapshot={schedules[submission.id]!}/>:<ViewAttempt attempt={submission} announce={setMessage} fill={isPdf}/>}
    </div>
    <div hidden={!showHistory} className="min-h-0 flex-1 overflow-y-auto p-5"><h3 className="mb-4 text-base font-semibold">Previous submissions</h3><ol className="space-y-5">{history.map(attempt=><li key={attempt.id} className="border-b border-border pb-5 last:border-0"><p className="font-semibold">{submissionDisplayName(attempt)}</p><p className="mt-1 text-xs text-ink-soft">{formatSubmissionTime(attempt.submittedAt)} · {attempt.status.replace('_',' ')}</p>{attempt.feedback?<p className="mt-2 text-sm leading-6 text-ink-soft">{attempt.feedback}</p>:null}<div className="mt-3">{schedules[attempt.id]?<ScheduleComparison snapshot={schedules[attempt.id]!}/>:<ViewAttempt attempt={attempt} announce={setMessage} historical/>}</div>{investigations[attempt.id]?<div className="mt-4"><InvestigationHintSnapshot reference={investigations[attempt.id]!}/></div>:null}</li>)}</ol></div>
  </section>;
  const review=<section aria-label="Review tools" className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface">
    <div role="tablist" aria-label="Review tools" className="flex shrink-0 border-b border-border px-3">{tabs.map(value=><button type="button" role="tab" key={value} id={`${toolsId}-${value}`} aria-controls={`${toolsId}-${value}-panel`} aria-selected={tool===value} tabIndex={tool===value?0:-1} onClick={()=>selectTool(value)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const i=tabs.indexOf(value);const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs[2]:tabs[(i+(e.key==='ArrowRight'?1:2))%3];selectTool(next);document.getElementById(`${toolsId}-${next}`)?.focus();}}} className={`min-h-12 border-b-2 px-4 text-sm font-semibold ${tool===value?'border-action text-action':'border-transparent text-ink-soft hover:text-ink'}`}>{value==='feedback'?'Feedback':value==='rubric'?'Rubric':'Example'}</button>)}</div>
    <div className="min-h-0 flex-1">
      <div role="tabpanel" id={`${toolsId}-feedback-panel`} aria-labelledby={`${toolsId}-feedback`} hidden={tool!=='feedback'} className="h-full overflow-y-auto p-5">
        <h2 className="sr-only">Feedback and decision</h2>
        {investigations[submissionId]?<InvestigationHintSnapshot reference={investigations[submissionId]!}/>:null}
        {project?<details className="mb-4 border-b border-border pb-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Confirmed project direction</summary><p className="text-sm font-semibold">{project.recommendation?.company} · {project.state?.direction==='recommended'?project.recommendation?.title:'Approved alternative'}</p>{project.state?.direction==='alternative'?project.requests?.filter(r=>r.status==='approved').map(r=><div key={r.id} className="mt-3 whitespace-pre-wrap text-sm"><p>{r.proposal.direction}</p><p className="mt-2">{r.proposal.question}</p>{r.decision_note?<p className="mt-2">{r.decision_note}</p>:null}</div>):null}</details>:null}
        <fieldset><legend className="mb-3 text-sm font-semibold">Decision</legend><div className="divide-y divide-border rounded-lg border border-border">{(['submitted','revision_requested','completed'] as const).map(value=><label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 px-3 text-sm font-semibold focus-within:ring-2 focus-within:ring-inset focus-within:ring-action ${status===value?'bg-success-bg':'hover:bg-surface-subtle'}`}><input type="radio" name="review-decision" className="size-4 shrink-0 accent-action" checked={status===value} onChange={()=>{setStatus(value);setMessage('');}}/>{value==='submitted'?'Awaiting review':value==='revision_requested'?'Request revision':'Mark complete'}</label>)}</div></fieldset>
        <label htmlFor="admin-feedback" className="mt-5 block text-sm font-semibold">Feedback {status==='revision_requested'?'(required)':'(optional)'}</label><textarea id="admin-feedback" rows={6} value={feedback} onChange={e=>{setFeedback(e.target.value);setMessage('');}} className="mt-2 w-full rounded-lg border border-border-strong p-3 text-base leading-7" placeholder="Add feedback…"/>
      </div>
      <div role="tabpanel" tabIndex={0} id={`${toolsId}-rubric-panel`} aria-labelledby={`${toolsId}-rubric`} hidden={tool!=='rubric'} className="h-full overflow-y-auto [overflow-wrap:anywhere]"><GradingReferenceContent reference={reference} kind="rubric" editHref={editHref}/></div>
      <div role="tabpanel" tabIndex={0} id={`${toolsId}-example-panel`} aria-labelledby={`${toolsId}-example`} hidden={tool!=='example'} className={`h-full ${reference?.document?'overflow-hidden':'overflow-y-auto'} [overflow-wrap:anywhere]`}><GradingReferenceContent reference={reference} kind="example" editHref={editHref} loadPdf={exampleOpened}/></div>
    </div>
    <footer className="shrink-0 border-t border-border bg-surface p-4">
      {message?<p role="status" className={`mb-3 text-sm font-semibold ${message==='Review saved.'?'text-success-text':'text-danger-text'}`}>{message}</p>:null}
      <div className="flex flex-wrap items-center gap-2"><Button className="flex-1 px-3" disabled={!dirty||saving} onClick={()=>saveReview(false)}>{saving?'Saving…':'Save review'}</Button><Button className="flex-1 px-3" variant="secondary" disabled={saving} onClick={()=>saveReview(true)}>Save &amp; review next</Button></div>
    </footer>
  </section>;
  return <main className="pb-4"><PageContainer className="pt-3 sm:pt-4" style={{maxWidth:'100rem'}}>
    <header className="mb-4"><div className="flex flex-wrap items-center justify-between gap-x-4"><Link href={backHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-action">← Review queue</Link><span className="text-xs font-semibold text-ink-soft">Week {week.weekNumber}{enrollment.isTest?' · Test submission':''}</span></div>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight">{team?.name??person?.fullName??'Member submission'}</h1><AssignmentStatusBadge state={submission.status}/></div>
      <p className="mt-1 text-sm leading-6 text-ink-soft">{assignment?.title} · Submitted {formatSubmissionTime(submission.submittedAt)}</p>
      {team?<details className="mt-1 text-xs text-ink-soft"><summary className="cursor-pointer py-2">Team members</summary><p>{team.enrollmentIds.map(id=>workspace.people.find(p=>p.id===workspace.enrollments.find(e=>e.id===id)?.personId)?.fullName).filter(Boolean).join(' · ')}</p></details>:null}
    </header>
    <ReviewWorkspace work={work} review={review}/>
  </PageContainer></main>;
}
