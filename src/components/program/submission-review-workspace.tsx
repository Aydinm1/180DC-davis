"use client";

import { saveLink, saveText } from "@/lib/supabase/actions";
import { WrittenResponse } from './written-response';

import { useRef, useState } from "react";
import { useMemberAttempts } from "./member-workspace";
import { StateMessage } from "@/components/ui/state-message";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmissionEditor } from "@/components/program/submission-editor";
import { SubmittedWorkRecord } from "@/components/program/submitted-work-record";
import type { SubmissionAttempt, SubmissionPayload } from "@/lib/program/types";
import { submissionBelongsTo } from '@/lib/program/types';
import {
  canReplaceSubmission,
  submissionDisplayName,
} from "@/lib/program/submission";
import { formatSubmissionTime } from "@/lib/program/state";
import { cn } from "@/lib/ui";

const reviewPresentation = {
  submitted: { label: "Awaiting review", tone: "info", heading: "Submission received", detail: "Your work is with the review team. You can replace it until it has been reviewed." },
  revision_requested: { label: "Revision requested", tone: "warning", heading: "Reviewer feedback", detail: "Use this feedback to revise your submission." },
  completed: { label: "Complete", tone: "success", heading: "You’re all set", detail: "This assignment is complete." },
} satisfies Record<SubmissionAttempt["status"], { label: string; tone: BadgeTone; heading: string; detail: string }>;

function SubmissionLink({
  attempt,
  label,
  onFileView,
  presentation = "record",
}: {
  attempt: SubmissionAttempt;
  label?: string;
  onFileView: () => void;
  presentation?: "record" | "history";
}) {
  const [fileNotice, setFileNotice] = useState(false);
  if (attempt.payload.type === 'text') return <WrittenResponse text={attempt.payload.submittedText} />;
  const className = cn(
    "inline-flex min-h-11 items-center text-sm font-bold transition-colors",
    presentation === "record"
      ? "w-full justify-center rounded-lg border border-border-strong bg-surface px-4 text-ink hover:bg-surface-subtle"
      : "text-action hover:text-action-hover",
  );
  return attempt.payload.type === "link" ? (
    <a className={className} href={attempt.payload.submittedUrl} target="_blank" rel="noreferrer">
      {label ?? "Open submitted link"} <span className="ml-2" aria-hidden="true">↗</span>
    </a>
  ) : /^[0-9a-f-]{36}$/i.test(attempt.id) ? (
    <a className={className} href={`/api/submissions/${attempt.id}/download`}>{label ?? 'Download file'}</a>
  ) : (
    <div><button type="button" className={className} onClick={() => { setFileNotice(true); onFileView(); }}>{label ?? "Download file"}</button>{fileNotice ? <p className="mt-2 text-sm leading-6 text-ink-soft" role="status">This sample file is not available to download in the demo.</p> : null}</div>
  );
}

export function SubmissionReviewWorkspace({
  assignmentId,
  enrollmentId,
  initialAttempts,
  completionCredit,
  documentsOnly=false,
  checkedWorkflow=false,
}: {
  assignmentId: string;
  enrollmentId: string;
  initialAttempts: readonly SubmissionAttempt[];
  completionCredit?: {id:string;grantedAt:string};
  documentsOnly?: boolean;
  checkedWorkflow?: boolean;
}) {
  const [attempts] = useMemberAttempts(initialAttempts);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [replacing, setReplacing] = useState(false);
  const [replacementBase, setReplacementBase] = useState<{ id: string; updatedAt?: string }>();
  const [announcement, setAnnouncement] = useState("");
  const current = attempts.find((attempt) => attempt.isCurrent && attempt.assignmentId === assignmentId && submissionBelongsTo(attempt,enrollmentId));

  if (completionCredit) return <StateMessage title="Assignment complete">Your GAP lead marked this assignment complete. No submission is required.</StateMessage>;
  if (!current) return <StateMessage title="No submission yet">Return to the week to submit your work.</StateMessage>;

  const previous = attempts.filter((attempt) => !attempt.isCurrent && attempt.assignmentId === assignmentId && submissionBelongsTo(attempt,enrollmentId)).toSorted((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const presentation = reviewPresentation[current.status];
  const replacementAllowed = !checkedWorkflow && canReplaceSubmission(current);
  const actionLabel = current.status === "revision_requested" ? "Revise submission" : "Replace submission";

  async function submit(payload: SubmissionPayload, requestId?: string) {
    if (payload.type === 'file') throw new Error('Use the file upload control to submit a file.');
    if (!replacementBase) throw new Error('Reopen the replacement form before submitting.');
    const result = payload.type === 'text'
      ? await saveText(assignmentId, payload.submittedText, replacementBase.id, replacementBase.updatedAt,requestId)
      : await saveLink(assignmentId, payload.submittedUrl, replacementBase.id, replacementBase.updatedAt,requestId);
    if (result.error) throw new Error(result.error);
    setReplacing(false);
    setAnnouncement('Submission received.');
  }

  return (
    <div>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <div className={cn(
        "grid items-start gap-8 border-y border-border py-8 sm:py-10",
        current.feedback
          ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] lg:gap-12"
          : "max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:gap-10",
      )}>
        <section
          className={cn(
            current.feedback && "border-l-4 pl-5 sm:pl-7",
            current.status === "revision_requested" && "border-warning-text",
            current.status === "completed" && "border-success-text",
          )}
          aria-labelledby="review-heading"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="review-heading" className={cn(
              "font-bold tracking-[-0.025em] text-ink",
              current.feedback ? "text-2xl" : "text-xl",
            )}>{current.feedback ? "Feedback" : presentation.heading}</h2>
            <Badge tone={presentation.tone}>{presentation.label}</Badge>
          </div>
          {current.feedback ? (
            <p className="mt-5 max-w-3xl whitespace-pre-line text-xl font-semibold leading-9 text-ink">{current.feedback}</p>
          ) : (
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">{presentation.detail}</p>
          )}
          {current.reviewedAt ? <p className="mt-5 text-sm text-ink-soft">Reviewed {formatSubmissionTime(current.reviewedAt)}</p> : null}
        </section>

        <aside aria-label="Submitted work">
          <SubmittedWorkRecord attempt={current}>
            <SubmissionLink
              attempt={current}
              onFileView={() => setAnnouncement("Private file preview will be available after Supabase Storage is connected.")}
            />
            {replacementAllowed && !replacing ? (
              <Button ref={actionRef} className="w-full" size="compact" variant={current.status === "revision_requested" ? "primary" : "secondary"} onClick={() => { setReplacementBase({ id: current.id, updatedAt: current.updatedAt }); setReplacing(true); }}>
                {actionLabel}
              </Button>
            ) : null}
          </SubmittedWorkRecord>
        </aside>
      </div>

      {replacing ? (
        <section className="mt-8 rounded-card border border-border bg-surface p-6 shadow-card sm:p-8 lg:p-10" aria-label={`${actionLabel} form`}>
          <SubmissionEditor
            documentsOnly={documentsOnly}
            actionLabel={actionLabel}
            assignmentId={assignmentId}
            description="Choose one submission method. Your previous attempt remains in history."
            layout="wide"
            expected={replacementBase}
            onFileSaved={() => { setReplacing(false); setAnnouncement('Submission received.'); }}
            onCancel={() => { setReplacing(false); requestAnimationFrame(() => actionRef.current?.focus()); }}
            onSubmit={submit}
          />
        </section>
      ) : null}

      {previous.length ? (
        <section className="mt-10 border-t border-border pt-8 sm:mt-12 sm:pt-10" aria-labelledby="submission-history-heading">
          <h2 id="submission-history-heading" className="text-sm font-bold text-ink">Previous submissions</h2>
          <ol className="mt-5 max-w-3xl border-l border-border pl-5">
            {previous.map((attempt) => (
              <li key={attempt.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[1.47rem] top-1 size-2.5 rounded-full border-2 border-surface bg-border-strong" aria-hidden="true" />
                <p className="break-words text-sm font-bold text-ink">{submissionDisplayName(attempt)}</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{formatSubmissionTime(attempt.submittedAt)} · {reviewPresentation[attempt.status].label}</p>
                {attempt.feedback ? <p className="mt-2 text-sm leading-6 text-ink-soft">{attempt.feedback}</p> : null}
                <div className="mt-2">
                  <SubmissionLink
                    attempt={attempt}
                    label="View previous submission"
                    presentation="history"
                    onFileView={() => setAnnouncement(`Private file preview for ${submissionDisplayName(attempt)} will be available after Supabase Storage is connected.`)}
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
