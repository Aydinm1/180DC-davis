'use client';

import Link from 'next/link';
import { useLocalSearchParams, replaceLocalQuery } from '@/lib/navigation/local-query';
import { Badge } from '@/components/ui/badge';
import { StateMessage } from '@/components/ui/state-message';
import { caseFilters, caseParticipants, caseStatus, filterCaseParticipants } from '@/lib/cases/progress';
import { formatSubmissionTime } from '@/lib/program/state';
import type { AdminSubmissionRow } from '@/lib/program/admin';
import { useAdminWorkspace } from './admin-workspace';

export function AdminCaseProgress({ assignmentId, rows, query }: { assignmentId: string; rows: readonly AdminSubmissionRow[]; query: string }) {
  const workspace = useAdminWorkspace(), params = useLocalSearchParams();
  const status = caseStatus(params.get('caseStatus'), params.get('status')), search = params.get('q') ?? '';
  const participants = caseParticipants(rows, workspace.caseProgress);
  const visible = filterCaseParticipants(participants, status, search);
  const context = new URLSearchParams(query); context.set('caseStatus', status);
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(context);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    replaceLocalQuery(next, '#submissions');
  }
  return <section id="submissions" aria-label="Case exercise progress" className="border-t border-border">
    <div className="bg-surface-subtle/60 px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Filter case progress">{caseFilters.map(f => <button key={f.value} type="button" aria-pressed={status === f.value} onClick={() => update({ caseStatus: f.value })} className={`min-h-11 rounded-md px-3 text-sm font-semibold ${status === f.value ? 'bg-action text-white' : 'text-ink-soft hover:bg-surface'}`}>{f.label} {f.value === 'all' ? participants.length : participants.filter(p => p.status === f.value).length}</button>)}</div>
        <label className="text-xs font-semibold text-ink-soft">Search participants<input type="search" value={search} onChange={e => update({ q: e.target.value })} placeholder="Name or email" className="mt-2 block min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm sm:w-56" /></label>
      </div>
    </div>
    {visible.length ? <ul className="divide-y divide-border">{visible.map(person => <li key={person.enrollmentId} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="min-w-0"><p className="break-words font-bold">{person.person?.fullName}</p><p className="mt-1 break-all text-xs text-ink-soft">{person.person?.email}</p></div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:justify-end">
        <div><Badge tone={person.status === 'complete' ? 'success' : person.status === 'in_progress' ? 'info' : 'neutral'}>{caseFilters.find(f => f.value === person.status)?.label}</Badge><p className="mt-1 text-xs text-ink-soft">{person.completedAt ? formatSubmissionTime(person.completedAt) : `${person.answered} of 8 cases saved`}</p></div>
        <Link className="action-link inline-flex min-h-11 items-center text-sm font-bold text-action" href={`/admin/cases/${assignmentId}/${person.enrollmentId}?${context}`}>View answers <span aria-hidden="true" className="ml-1">→</span><span className="sr-only">: {person.person?.fullName}</span></Link>
      </div>
    </li>)}</ul> : <div className="p-5 sm:p-7"><StateMessage title={participants.length ? 'No matching participants' : 'No participants in this scope'} /></div>}
  </section>;
}
