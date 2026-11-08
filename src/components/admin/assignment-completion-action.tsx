'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAssignmentCompletion } from '@/lib/supabase/completion-actions';
import type { AdminSubmissionRow } from '@/lib/program/admin';
import { formatSubmissionTime } from '@/lib/program/state';
import { useAdminWorkspace } from './admin-workspace';

export function AssignmentCompletionAction({row}: {row: AdminSubmissionRow}) {
  const state = useAdminWorkspace();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState('');
  if (row.team || row.submission || row.assignment.workflow==='investigation') return <span className="text-ink-faint">Await submission</span>;
  const credit = row.completionCredit;
  const active = state.cohorts.some(cohort=>cohort.id===row.enrollment.cohortId && cohort.state==='active');

  function save() {
    if (busy || !window.confirm(credit
      ? `Undo manual completion for ${row.person?.fullName} on “${row.assignment.title}”?`
      : `Mark ${row.person?.fullName} complete for “${row.assignment.title}”? No submission will be created.`)) return;
    setError('');
    startTransition(async()=>{
      try {
        const result = await setAssignmentCompletion(credit?'revoke':'grant',row.assignment.id,row.enrollment.id,credit?.id);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch { setError('Could not save completion. Please retry.'); }
    });
  }

  return <div>
    {credit ? <p className="text-xs leading-6 text-ink-soft">Manually completed · {formatSubmissionTime(credit.grantedAt)}</p> : null}
    <button type="button" disabled={busy || (!credit && !active)} onClick={save} className="inline-flex min-h-11 items-center text-sm font-semibold text-action disabled:opacity-50">
      {busy?'Saving…':credit?'Undo completion':'Mark complete'}
    </button>
    {error ? <p role="alert" className="text-sm text-danger-text">{error}</p> : null}
  </div>;
}
