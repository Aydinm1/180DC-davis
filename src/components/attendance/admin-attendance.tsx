'use client';
import Image from 'next/image';
import { AttendancePresentation } from './attendance-presentation';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminWorkspace } from '@/components/admin/admin-workspace';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/container';
import { saveAttendance } from '@/lib/attendance/actions';
import { syncAttendanceToMonday } from '@/lib/monday/attendance-actions';
import type { AttendanceSyncResult } from '@/lib/monday/attendance-types';
import { attendanceTime, isCheckInOpen, type AttendanceAdminData, type AttendanceOperation } from '@/lib/attendance/types';

export function AdminAttendance({ cohortId, data }: { cohortId: string; data: AttendanceAdminData }) {
  const { weeks, cohorts, enrollments, people } = useAdminWorkspace();
  const cohort = cohorts.find(c => c.id === cohortId);
  const cohortWeeks = weeks.filter(w => w.cohortId === cohortId).sort((a,b) => a.weekNumber-b.weekNumber);
  const [weekId, setWeekId] = useState(cohortWeeks[0]?.id ?? '');
  const week = cohortWeeks.find(w => w.id === weekId);
  const session = data.sessions.find(s => s.week_id === weekId);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState<'official' | 'test'>('official');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<AttendanceSyncResult>();
  const [refreshing, startRefresh] = useTransition();
  const [now, setNow] = useState(Date.parse(data.now));
  const router = useRouter();
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const open = session && isCheckInOpen(session, now);
  const officialIds = new Set(enrollments.filter(e=>e.cohortId===cohortId && !e.isTest).map(e=>e.id));
  const roster = enrollments.filter(e => e.cohortId === cohortId && !!e.isTest === (audience === 'test')).map(enrollment => ({ enrollment, person: people.find(p => p.id === enrollment.personId) })).filter(row => row.person).sort((a,b) => a.person!.fullName.localeCompare(b.person!.fullName));
  const currentRecords = data.records.filter(r => r.session_id === session?.id);
  const presentCount = currentRecords.filter(r => r.present && officialIds.has(r.enrollment_id)).length;
  const disabled = saving || refreshing || syncing;
  function refresh() { startRefresh(() => router.refresh()); }
  async function save(input: AttendanceOperation) {
    if (disabled) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await saveAttendance(input);
      if (result.error) setError(result.error);
      else { setMessage('Attendance saved.'); refresh(); }
    } catch { setError('Could not save attendance. Check your connection, refresh and retry.'); }
    finally { setSaving(false); }
  }
  async function sync() {
    if (disabled || !week) return;
    setSyncing(true);setSyncResult(undefined);
    try {setSyncResult(await syncAttendanceToMonday(cohortId,week.id));}
    catch {setSyncResult({checked:0,alreadyChecked:0,issues:[],error:'Could not sync attendance. Retry; existing checks are safe.'});}
    finally {setSyncing(false);}
  }
  return <main><PageContainer className="py-9 sm:py-11"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-deep">Workshop attendance</p><h1 className="mt-3 text-3xl font-bold">Attendance</h1></div><Button variant="secondary" disabled={disabled} onClick={refresh}>{refreshing ? 'Refreshing…' : 'Refresh'}</Button></header>
    <section aria-label="Program weeks" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cohortWeeks.map(w => {
      const s = data.sessions.find(item => item.week_id === w.id);
      const count = data.records.filter(r => r.session_id === s?.id && r.present && officialIds.has(r.enrollment_id)).length;
      return <button key={w.id} disabled={disabled} aria-pressed={weekId === w.id} onClick={() => { setWeekId(w.id); setDate(''); setError(''); setMessage(''); setSyncResult(undefined); }} className={`min-h-28 rounded-card border p-4 text-left ${weekId===w.id ? 'border-action bg-success-bg' : 'border-border bg-surface'}`}><span className="text-xs font-bold text-brand-deep">Week {w.weekNumber}</span><span className="mt-1 block font-bold">{w.title}</span><span className="mt-2 block text-sm text-ink-soft">{s ? `${s.workshop_date} · ${isCheckInOpen(s, now) ? 'Open' : 'Closed'} · ${count} present` : 'Date not set · Not opened'}</span></button>;
    })}</section>
    {week ? <section className="mt-7 rounded-card border border-border bg-surface p-5 sm:p-8" aria-labelledby="attendance-week"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="attendance-week" className="text-xl font-bold">Week {week.weekNumber} · {week.title}</h2>{session && audience==='official'?<Button variant="secondary" disabled={disabled} onClick={()=>void sync()}>{syncing?'Syncing…':'Sync to Monday'}</Button>:null}</div>      {session && audience==='official' ? <div>
        {syncResult?.error?<p role="alert" className="mt-3 text-sm text-danger-text">{syncResult.error}</p>:syncResult?<p role="status" className="mt-3 text-sm">Week {week.weekNumber}: {syncResult.checked} checked · {syncResult.alreadyChecked} already checked{syncResult.issues.length?` · ${syncResult.issues.length} need attention`:''}</p>:null}
        {syncResult?.issues.length?<details className="mt-3"><summary className="cursor-pointer py-2 text-sm font-semibold">Sync details</summary><ul className="mt-2 space-y-2 text-sm">{syncResult.issues.map((issue,i)=><li key={i}><strong>{issue.name}</strong> · {issue.reason}</li>)}</ul></details>:null}
      </div>:null}
<div className="mt-5 flex flex-wrap items-end gap-4"><label className="block text-sm font-bold">Workshop date<input type="date" className="mt-2 block min-h-11 rounded-lg border border-border-strong px-3" value={date || session?.workshop_date || ''} disabled={disabled || !!open} onChange={event => setDate(event.target.value)} /></label>{open ? <Button variant="secondary" disabled={disabled} onClick={() => void save({ action: 'close', sessionId: session.id })}>Close check-in</Button> : <Button disabled={disabled || cohort?.state !== 'active' || week.publicationState !== 'published' || !(date || session?.workshop_date)} onClick={() => { if (session && !window.confirm('Reopen check-in with a new code and two-hour window? Existing attendance will be kept.')) return; void save({ action: 'open', weekId, workshopDate: date || session!.workshop_date }); }}>{session ? 'Reopen check-in' : 'Open check-in'}</Button>}</div>
      {cohort?.state !== 'active' || week.publicationState !== 'published' ? <p className="mt-3 text-sm text-ink-soft">Open check-in requires an active cohort and published week.</p> : null}
      {open ? <div className="mt-8 flex flex-col items-center gap-6 rounded-card bg-surface-subtle p-5 text-center sm:flex-row sm:justify-around sm:p-8"><div><p className="text-sm font-bold text-brand-deep">Workshop check-in code</p><p className="my-4 break-all font-mono text-5xl font-bold tracking-[0.12em] sm:text-6xl" aria-label={`Code ${session.code.split('').join(' ')}`}>{session.code}</p><p className="text-sm">Closes {attendanceTime(session.closes_at)}</p></div>{session.qr ? <Image unoptimized src={session.qr} alt={`Scan to check in for Week ${week.weekNumber}`} width={280} height={280} className="h-auto w-full max-w-[280px] rounded-lg" /> : <p className="text-sm text-danger-text">Set NEXT_PUBLIC_SITE_URL to display the QR. Members can still enter the code in GAP.</p>}</div> : null}
      {session ? <AttendancePresentation key={session.id} session={session} weekNumber={week.weekNumber} title={week.title} now={now} /> : null}
      {error ? <p role="alert" className="mt-5 text-danger-text">{error}</p> : null}{message ? <p role="status" className="mt-5 text-success-text">{message}</p> : null}
      {session ? <label className="mt-6 block text-sm font-bold">Participation view<select aria-label="Participation view" disabled={disabled} value={audience} onChange={event=>setAudience(event.target.value as 'official' | 'test')} className="ml-3 min-h-11 rounded-lg border border-border-strong bg-surface px-3"><option value="official">Official participants</option><option value="test">Test participants only</option></select></label> : null}
      {session ? <div className="mt-10"><div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-lg font-bold">{audience === 'test' ? 'Test roster' : `Workshop roster · ${presentCount} present`}</h3><label className="text-sm font-bold">Search people<input type="search" value={search} onChange={event => setSearch(event.target.value)} className="ml-3 min-h-11 max-w-full rounded-lg border border-border-strong px-3" /></label></div><ul className="mt-5 divide-y divide-border">{roster.filter(row => `${row.person!.fullName} ${row.person!.email}`.toLowerCase().includes(search.toLowerCase())).map(({ enrollment, person }) => {
        const record = currentRecords.find(r => r.enrollment_id === enrollment.id);
        return <li key={enrollment.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-bold">{person!.fullName}</p><p className="break-all text-sm text-ink-soft">{person!.email}</p><p className="mt-1 text-sm text-ink-soft">{enrollment.participationStatus !== 'enrolled' ? `${enrollment.participationStatus} · ` : ''}{record?.present ? `Present · ${attendanceTime(record.recorded_at!)}` : 'Not recorded'}</p></div><Button variant={record?.present ? 'secondary' : 'primary'} disabled={disabled} onClick={() => { if (record?.present && !window.confirm(`Undo attendance for ${person!.fullName}? This correction will be recorded.`)) return; void save({ action:'correct',sessionId:session.id,enrollmentId:enrollment.id,present:!record?.present,expectedUpdatedAt:record?.updated_at ?? null }); }}>{record?.present ? 'Undo' : 'Mark present'}</Button></li>;
      })}</ul>{!roster.length ? <p className="mt-5 text-sm text-ink-soft">No participants in this cohort yet.</p> : null}</div> : <p className="mt-6 text-sm text-ink-soft">Set a workshop date, then open check-in.</p>}
      {session ? <details className="mt-7 border-t border-border pt-5"><summary className="cursor-pointer text-sm font-bold">Attendance history</summary><ul className="mt-3 space-y-3 text-sm">{data.history.filter(h => h.session_id === session.id && enrollments.some(e => e.id === h.enrollment_id && !!e.isTest === (audience === 'test'))).map(h => <li key={h.id}>{people.find(p => p.id === enrollments.find(e => e.id === h.enrollment_id)?.personId)?.fullName ?? 'Participant'} · {h.present ? 'Present' : 'Not recorded'} · {h.source === 'admin' ? `Corrected by ${h.actor_name ?? h.actor_id}` : 'Member check-in'} · {attendanceTime(h.changed_at)}</li>)}</ul></details> : null}
    </section> : null}
  </PageContainer></main>;
}
