'use client';

import type { AdminSubmissionRow } from '@/lib/program/admin';
import { formatSubmissionTime } from '@/lib/program/state';
import { useAdminWorkspace } from './admin-workspace';
import {canManuallyComplete} from '@/lib/program/bulk-completion';
import { ManualCompletionButton } from './manual-completion-button';

export function AssignmentCompletionAction({row}: {row: AdminSubmissionRow}) {
  const state = useAdminWorkspace();
  if (row.team || row.swapGroup || row.submission || (row.assignment.workflow==='investigation'||row.assignment.workflow==='schedule')) return <span className="text-ink-faint">Await submission</span>;
  const credit = row.completionCredit;
  const eligible = canManuallyComplete(row,state);
  return <div className="flex flex-col items-start">
    <ManualCompletionButton assignmentId={row.assignment.id} enrollmentId={row.enrollment.id} personName={row.person?.fullName??'this participant'} assignmentTitle={row.assignment.title} creditId={credit?.id} disabled={!credit&&!eligible}/>
    {credit ? <span className="text-xs leading-5 text-ink-soft" title={`Manually completed · ${formatSubmissionTime(credit.grantedAt)}`}>Manual credit · {new Intl.DateTimeFormat("en-US", {timeZone:"America/Los_Angeles",month:"short",day:"numeric"}).format(new Date(credit.grantedAt))}</span> : null}
  </div>;
}
