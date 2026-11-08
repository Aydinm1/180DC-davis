"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { formatPacificDateTimeInput, pacificWallTimeToUtc, validateAdminWeek, type AdminWeek } from "@/lib/program/admin";
import { formatDeadline } from '@/lib/program/state';
import { assignmentsForWeek, type Assignment, type Resource } from "@/lib/program/types";
import { useAdminWorkspace } from "./admin-workspace";

import { AssignmentBriefUpload } from "./assignment-brief-upload";
import { AssignmentInstructionsEditor } from './assignment-instructions-editor';
import { GradingReferenceEditor } from './grading-reference';
import type { GradingReference } from '@/lib/grading/types';
import type { CaseContent, CaseExercise } from '@/lib/cases/types';
import type { Investigation, InvestigationConfig } from '@/lib/investigations/types';
import type { GuidedProject } from '@/lib/guided/types';
import { GuidedEditor } from './guided-editor';
import { EditorSections } from './editor-sections';

const input = "mt-2 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-base text-ink";

export function AdminWeekEditor({ weekId, references = [], guided = {}, cases = {}, caseTemplate, investigations={}, investigationTemplate }: { weekId: string; references?: GradingReference[]; guided?: Record<string,GuidedProject>; cases?: Record<string,CaseExercise>; caseTemplate?: CaseContent;investigations?:Record<string,Investigation>;investigationTemplate?:InvestigationConfig }) {
  const workspace = useAdminWorkspace();
  const router = useRouter();
  const source = workspace.weeks.find((week) => week.id === weekId && week.cohortId === workspace.selectedCohortId);
  const [draft, setDraft] = useState<AdminWeek | undefined>(source ? structuredClone(source) : undefined);
  const [savedDraft, setSavedDraft] = useState(source);
  const [message, setMessage] = useState("");
  const [deadlines, setDeadlines] = useState<Record<string, string>>(() => Object.fromEntries(source ? assignmentsForWeek(source).map((assignment) => [assignment.id, formatPacificDateTimeInput(assignment.dueAt)]) : []));
  const [zones, setZones] = useState<Record<string, "PDT" | "PST" | undefined>>({});
  const [saving, startSaving] = useTransition();
  const [referenceChanges, setReferenceChanges] = useState<Record<string, boolean>>({});
  const [section, setSection] = useState<'overview' | 'assignments' | 'materials'>('overview');
  const [selectedAssignment, setSelectedAssignment] = useState(source ? assignmentsForWeek(source)[0]?.id : undefined);
  const [assignmentSections, setAssignmentSections] = useState<Record<string, 'details' | 'instructions' | 'activity' | 'grading'>>({});
  const referenceDirty = Object.values(referenceChanges).some(Boolean);
  const referenceChanged = useCallback((id: string, value: boolean) => setReferenceChanges(current => current[id] === value ? current : { ...current, [id]: value }), []);
  const dirty = Boolean(savedDraft && draft && (JSON.stringify(draft) !== JSON.stringify(savedDraft) || assignmentsForWeek(draft).some((assignment) => deadlines[assignment.id] !== formatPacificDateTimeInput(assignment.dueAt))));
  const setUnsavedChanges = workspace.setUnsavedChanges;
  useEffect(() => { setUnsavedChanges(dirty || referenceDirty); return () => setUnsavedChanges(false); }, [dirty, referenceDirty, setUnsavedChanges]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty || referenceDirty) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty, referenceDirty]);
  useEffect(() => {
    const revealTarget = () => {
      const match = /^#(grading|guided)-(.+)$/.exec(window.location.hash);
      if (!match || !source || !assignmentsForWeek(source).some(a => a.id === match[2])) return;
      setSection('assignments');
      setSelectedAssignment(match[2]);
      setAssignmentSections(current => ({ ...current, [match[2]]: match[1] === 'grading' ? 'grading' : 'activity' }));
    };
    const frame = requestAnimationFrame(revealTarget);
    window.addEventListener('hashchange', revealTarget);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', revealTarget); };
  }, [source]);
  useEffect(() => {
    if (!referenceDirty) return;
    const guard = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest('a');
      if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === '_blank') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/api/') || url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault(); event.stopPropagation();
      if (window.confirm('Discard your unsaved grading reference or week changes?')) router.push(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', guard, true);
    return () => document.removeEventListener('click', guard, true);
  }, [referenceDirty, router]);
  if (!source || !draft) return <PageContainer className="py-16"><StateMessage title="Week not found">Choose a week from the currently selected cohort.</StateMessage></PageContainer>;

  function patch(values: Partial<AdminWeek>) { setDraft((current) => current ? { ...current, ...values } : current); setMessage(""); }
  function save(publicationState: AdminWeek["publicationState"]) {
    if (!draft) return;
    const assignments: Assignment[] = [];
    for (const assignment of assignmentsForWeek(draft)) {
      const converted = pacificWallTimeToUtc(deadlines[assignment.id] ?? "", zones[assignment.id]);
      if (converted.error) return setMessage(converted.error);
      if (!converted.value) return setMessage("Enter a valid Pacific deadline.");
      assignments.push({ ...assignment, dueAt: converted.value });
    }
    const candidate = { ...draft, assignment: undefined, assignments, expectedAssignmentIds: savedDraft ? assignmentsForWeek(savedDraft).map(a => a.id) : [], publicationState, resources: draft.resources.map((resource, index) => ({ ...resource, sortOrder: index + 1 })) };
    const error = validateAdminWeek(candidate, { forPublish: publicationState === "published" });
    if (error) return setMessage(error);
    startSaving(async () => {
      const error = await workspace.updateWeek(candidate);
      if (error) return setMessage(error);
      // Compare edits with the successfully saved draft, not regenerated resource IDs.
      setDraft(candidate);
      setSavedDraft(candidate);
      workspace.setUnsavedChanges(referenceDirty);
      setMessage(publicationState === "published" ? "Week published." : "Draft saved.");
    });
  }
  function updateResource(id: string, values: Partial<Resource>) { if (!draft) return; patch({ resources: draft.resources.map((resource) => resource.id === id ? { ...resource, ...values } : resource) }); }
  function moveResource(index: number, direction: -1 | 1) { if (!draft) return; const next = [...draft.resources]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; patch({ resources: next }); }
  function updateAssignment(id: string, values: Partial<Assignment>) { if (!draft) return; patch({ assignment: undefined, assignments: assignmentsForWeek(draft).map((assignment) => assignment.id === id ? { ...assignment, ...values } : assignment) }); }

  return <main className="pb-28"><PageContainer className="py-9 sm:py-11"><Link href={`/admin/weeks?cohort=${workspace.selectedCohortId}`} onClick={(event) => { if ((dirty || referenceDirty) && !window.confirm("Discard your unsaved week or grading reference changes?")) event.preventDefault(); }} className="inline-flex min-h-11 items-center text-sm font-bold text-action">← All weeks</Link><header className="mt-6"><div className="flex flex-wrap items-center gap-3"><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {draft.weekNumber.toString().padStart(2, "0")}</p><span className="text-sm font-semibold capitalize text-ink-faint">{source.publicationState}</span></div><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{draft.title || `Week ${draft.weekNumber}`}</h1></header>
    <div className="mt-8 space-y-6">
      <EditorSections label="Week sections" value={section} onChange={setSection} options={[{ value: 'overview', label: 'Overview' }, { value: 'assignments', label: `Assignments (${assignmentsForWeek(draft).length})` }, { value: 'materials', label: 'Materials' }]} />
      <div hidden={section !== 'overview'}>
      <Card className="p-6 sm:p-8"><h2 className="text-xl font-bold">Week</h2><div className="mt-6 grid grid-cols-1 gap-6"><label className="text-sm font-bold">Title<input className={input} value={draft.title} onChange={(event) => patch({ title: event.target.value })} /></label><label className="text-sm font-bold">Description<textarea rows={4} className={`${input} py-3`} value={draft.description} onChange={(event) => patch({ description: event.target.value })} /></label><label className="text-sm font-bold">Presentation URL<input className={input} type="url" value={draft.slidesUrl ?? ""} onChange={(event) => patch({ slidesUrl: event.target.value || undefined })} placeholder="https://..." /></label></div></Card>
      </div>
      <div hidden={section !== 'assignments'}>
      <section aria-label="Assignments" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Assignments</h2><Button variant="secondary" disabled={saving} onClick={() => { const id = crypto.randomUUID(); const dueAt = new Date().toISOString(); patch({ assignment: undefined, assignments: [...assignmentsForWeek(draft), { id, weekNumber: draft.weekNumber, title: "", instructions: "", dueAt }] }); setDeadlines((current) => ({ ...current, [id]: formatPacificDateTimeInput(dueAt) })); setSelectedAssignment(id); }}>Add assignment</Button></div>
        <label className="block text-sm font-bold lg:hidden">Select assignment<select className={input} value={selectedAssignment ?? ''} onChange={e => setSelectedAssignment(e.target.value)}>{assignmentsForWeek(draft).map((a, i) => <option key={a.id} value={a.id}>{a.title || `Assignment ${i + 1}`}</option>)}</select></label>
        <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Select assignment" className="hidden space-y-2 lg:block">{assignmentsForWeek(draft).map((a, i) => <button type="button" key={a.id} aria-pressed={selectedAssignment === a.id} onClick={() => setSelectedAssignment(a.id)} className={`w-full rounded-lg border p-4 text-left ${selectedAssignment === a.id ? 'border-action bg-success-bg' : 'border-border bg-surface hover:bg-surface-subtle'}`}><span className="block break-words text-sm font-bold">{a.title || `Assignment ${i + 1}`}</span><span className="mt-2 block text-xs text-ink-soft">{a.submissionMode === 'team' ? 'Team' : 'Individual'} · {(guided[a.id]?.workflow ?? a.workflow) === 'guided' ? 'Guided project' : (guided[a.id]?.workflow ?? a.workflow) === 'cases' ? 'Eight-case challenge' : (guided[a.id]?.workflow ?? a.workflow) === 'investigation' ? 'Spreadsheet investigation' : 'Standard'}</span><span className="mt-1 block text-xs leading-5 text-ink-soft">{formatDeadline(a.dueAt)}</span></button>)}</nav>
        <div className="min-w-0">
        {assignmentsForWeek(draft).map((assignment, index) => {
          const persisted = assignmentsForWeek(source).find((item) => item.id === assignment.id);
          const assignmentSection = assignmentSections[assignment.id] ?? 'details';
          return <div key={assignment.id} data-assignment-editor={assignment.id} hidden={selectedAssignment !== assignment.id}><Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words text-lg font-bold">{assignment.title || `Assignment ${index + 1}`}</h3><Button variant="quiet" disabled={saving} onClick={() => { if (workspace.submissions.some((item) => item.assignmentId === assignment.id)) return setMessage("This assignment cannot be removed because it has submissions."); if (persisted?.document) return setMessage("This assignment cannot be removed because it has an attached PDF."); if (referenceDirty) return setMessage('Save your activity or grading reference edits before removing an assignment.'); if (window.confirm("Remove this assignment from the week?")) { const remaining = assignmentsForWeek(draft).filter((item) => item.id !== assignment.id); patch({ assignment: undefined, assignments: remaining }); setSelectedAssignment(remaining[0]?.id); } }}>Remove assignment</Button></div>
            <div className="mt-5"><EditorSections label="Assignment sections" value={assignmentSection} onChange={value => setAssignmentSections(current => ({ ...current, [assignment.id]: value }))} options={[{ value: 'details', label: 'Details' }, { value: 'instructions', label: 'Instructions' }, { value: 'activity', label: 'Activity setup' }, { value: 'grading', label: 'Grading reference' }]} /></div>
            <div hidden={assignmentSection !== 'details'}>
            <div className="mt-6 grid grid-cols-1 gap-6"><label className="text-sm font-bold">Title<input className={input} value={assignment.title} onChange={(event) => updateAssignment(assignment.id, { title: event.target.value })} /></label>
              <label className="text-sm font-bold">Submission type<select className={input} value={assignment.submissionMode??'individual'} disabled={workspace.submissions.some(s=>s.assignmentId===assignment.id)} onChange={e=>updateAssignment(assignment.id,{submissionMode:e.target.value as 'individual'|'team'})}><option value="individual">Individual · each participant submits</option><option value="team">Team · one shared submission</option></select><span className="mt-2 block text-xs font-normal text-ink-soft">Assign teams in Members. Submission type locks after work or upload history exists.</span></label>
              <div><label htmlFor={`summary-${assignment.id}`} className="text-sm font-bold">Summary (optional)</label><textarea id={`summary-${assignment.id}`} aria-describedby={`summary-help-${assignment.id}`} rows={3} className={`${input} py-3`} value={assignment.summary ?? ''} onChange={event => updateAssignment(assignment.id, {summary:event.target.value})} /><p id={`summary-help-${assignment.id}`} className="mt-2 text-xs text-ink-soft">{Array.from(assignment.summary ?? '').length} / 300 characters</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]"><label className="text-sm font-bold">Deadline (Pacific time)<input className={input} type="datetime-local" value={deadlines[assignment.id] ?? ""} onChange={(event) => { setDeadlines((current) => ({ ...current, [assignment.id]: event.target.value })); setZones((current) => ({ ...current, [assignment.id]: undefined })); setMessage(""); }} /></label><label className="text-sm font-bold">DST choice<select className={input} value={zones[assignment.id] ?? ""} onChange={(event) => setZones((current) => ({ ...current, [assignment.id]: event.target.value ? event.target.value as "PDT" | "PST" : undefined }))}><option value="">Automatic</option><option value="PDT">PDT</option><option value="PST">PST</option></select></label></div>
            </div></div>
            <div hidden={assignmentSection !== 'instructions'}><div className="mt-6 grid grid-cols-1 gap-6">
              <AssignmentInstructionsEditor value={assignment.instructions} format={assignment.instructionsFormat} onChange={values => updateAssignment(assignment.id, values)} />
              {persisted ? <AssignmentBriefUpload key={persisted.id} assignment={persisted} onDirty={referenceChanged} /> : <p className="text-sm text-ink-soft">Save the assignment draft first, then attach its PDF.</p>}
            </div></div>
            <div hidden={assignmentSection !== 'grading'} className="mt-6"><GradingReferenceEditor assignmentId={assignment.id} initial={references.find(r => r.assignmentId === assignment.id)} persisted={Boolean(persisted)} onDirty={referenceChanged} expanded /></div>
            <div hidden={assignmentSection !== 'activity'} className="mt-6">
              {persisted&&guided[assignment.id]?<GuidedEditor assignmentId={assignment.id} initial={guided[assignment.id]} cases={cases[assignment.id]} caseTemplate={caseTemplate} investigation={investigations[assignment.id]} investigationTemplate={investigationTemplate} teamMode={persisted.submissionMode==='team'} onDirty={referenceChanged}/>:<p className="text-sm text-ink-soft">Save the assignment first to configure its workflow.</p>}
            </div>
          </Card></div>;
        })}
        </div></div>
        {!assignmentsForWeek(draft).length ? <p className="text-sm text-ink-soft">This week has no submission requirement.</p> : null}
      </section>
      </div>
      <div hidden={section !== 'materials'}>
      <Card className="p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Resources</h2><Button variant="secondary" onClick={() => patch({ resources: [...draft.resources, { id: `resource-${crypto.randomUUID()}`, title: "", url: "", type: "guide", sortOrder: draft.resources.length + 1 }] })}>Add resource</Button></div><div className="mt-6 space-y-5">{draft.resources.map((resource, index) => <div key={resource.id} className="rounded-card border border-border bg-surface-subtle p-5"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Title<input className={input} value={resource.title} onChange={(event) => updateResource(resource.id, { title: event.target.value })} /></label><label className="text-sm font-bold">Type<select className={input} value={resource.type} onChange={(event) => updateResource(resource.id, { type: event.target.value as Resource["type"] })}>{["guide", "template", "reading", "video", "workshop"].map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label><label className="text-sm font-bold sm:col-span-2">URL<input className={input} value={resource.url} onChange={(event) => updateResource(resource.id, { url: event.target.value })} /></label></div><div className="mt-4 flex flex-wrap gap-2"><Button size="compact" variant="quiet" disabled={index === 0} onClick={() => moveResource(index, -1)}>Move up</Button><Button size="compact" variant="quiet" disabled={index === draft.resources.length - 1} onClick={() => moveResource(index, 1)}>Move down</Button><Button size="compact" variant="quiet" onClick={() => patch({ resources: draft.resources.filter((item) => item.id !== resource.id) })}>Remove</Button></div></div>)}</div></Card>
      </div>
    </div>
    <div className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-strong bg-surface p-4 shadow-lg"><div>{message ? <p className={`text-sm font-bold ${/saved|published/.test(message) ? "text-success-text" : "text-danger-text"}`} role="status">{message}</p> : dirty || referenceDirty ? <p className="text-sm font-bold text-warning-text">{dirty ? "Unsaved week changes" : "Unsaved activity, reference or PDF"}</p> : <p className="text-sm text-ink-soft">All changes saved</p>}</div><div className="flex flex-wrap gap-3">{source.publicationState === "published" ? <><Button variant="secondary" disabled={saving} onClick={() => { if (window.confirm("Return this week to draft? Members will lose access.")) save("draft"); }}>Return to draft</Button><Button disabled={!dirty || saving} onClick={() => save("published")}>{saving ? "Saving…" : "Save changes"}</Button></> : <><Button variant="secondary" disabled={!dirty || saving} onClick={() => save("draft")}>Save draft</Button><Button disabled={saving} onClick={() => save("published")}>Save &amp; publish</Button></>}</div></div>
  </PageContainer></main>;
}
