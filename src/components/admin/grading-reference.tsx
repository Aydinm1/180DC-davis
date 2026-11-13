'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {ScheduleReferenceEditor} from './schedule-reference-editor';
import {ScheduleComparison} from '@/components/program/schedule-comparison';
import type {ScheduleTask} from '@/lib/schedules/types';
import { useRouter } from 'next/navigation';
import {PdfPreview} from './pdf-preview';
import { Button } from '@/components/ui/button';
import { AssignmentBrief } from '@/components/program/assignment-brief';
import { AssignmentInstructionsEditor } from './assignment-instructions-editor';
import { emptyReference, type GradingReference } from '@/lib/grading/types';
import { saveGradingReference, removeExample } from '@/lib/grading/actions';
import { exampleUploadTask } from '@/lib/grading/client';

function ExamplePdf({ reference, onDirty }: { reference: GradingReference; onDirty: (dirty: boolean) => void }) {
  const router = useRouter();
  const [document, setDocument] = useState(reference.document);
  const [version, setVersion] = useState(reference.fileVersion);
  const [file, setFile] = useState<File>();
  const [hasTask, setHasTask] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [progress, setProgress] = useState(0);
  const task = useRef<ReturnType<typeof exampleUploadTask> | undefined>(undefined);
  const running = useRef(false), canceling = useRef(false);
  useEffect(() => { onDirty(Boolean(file) || busy); return () => onDirty(false); }, [file, busy, onDirty]);
  async function upload() {
    if (!file || running.current) return;
    running.current = true; setBusy(true); setMessage('');
    task.current ??= exampleUploadTask(file, reference.assignmentId, version, setProgress);
    const activeTask = task.current;
    setHasTask(true);
    try {
      const d = await activeTask.run();
      if (!canceling.current && task.current === activeTask) {
        setDocument({ id: d.id, name: d.original_filename }); setVersion(v => v + 1);
        setFile(undefined); task.current = undefined; setHasTask(false); setMessage('Example PDF attached.'); router.refresh();
      }
    } catch (error) { if (!canceling.current && task.current === activeTask) setMessage(error instanceof Error ? error.message : 'Could not save. Please retry.'); }
    finally { running.current = false; if (!canceling.current) setBusy(false); }
  }
  async function cancel() {
    if (canceling.current) return;
    canceling.current = true; setBusy(true);
    try {
      const result = task.current ? await task.current.cancel() : {};
      if (result.error) { setMessage(result.error); return; }
      if ('attached' in result && result.attached?.isCurrent) {
        setDocument({ id: result.attached.id, name: result.attached.name }); setVersion(v => v + 1);
      }
      task.current = undefined; setHasTask(false); setFile(undefined); setProgress(0);
      setMessage('attached' in result && result.attached ? 'The PDF was already attached before cancellation. Reload to verify the current example.' : 'Upload canceled.'); router.refresh();
    } finally { canceling.current = false; setBusy(false); }
  }
  async function remove() {
    if (running.current || !window.confirm('Remove the current example PDF? Its retained file will not be deleted.')) return;
    running.current = true; setBusy(true);
    try {
      const result = await removeExample(reference.assignmentId, version);
      if ('error' in result) return setMessage(result.error);
      setVersion(result.version); setDocument(undefined); setMessage('Example PDF removed.'); router.refresh();
    } catch { setMessage('Could not remove example. Please retry.'); }
    finally { running.current = false; setBusy(false); }
  }
  return <section aria-label="Private example PDF" className="rounded-lg border border-border p-4">
    <h4 className="font-bold">Example PDF — Admins only</h4>
    <p className="mt-2 text-sm leading-6 text-ink-soft">PDF up to 20 MB. Uploads save immediately, separately from reference text.</p>
    {document ? <div className="mt-3 flex flex-wrap gap-3"><a className="inline-flex min-h-11 items-center break-all text-sm font-bold text-action underline" href={`/api/grading-examples/${document.id}/download`}>Download {document.name}</a><Button variant="quiet" size="compact" disabled={busy || Boolean(file)} onClick={remove}>Remove example PDF</Button></div> : null}
    <label className="mt-4 block text-sm font-bold">Choose example PDF<input key={document?.id ?? 'empty'} type="file" accept="application/pdf,.pdf" disabled={busy || hasTask} className="mt-2 block w-full text-sm" onChange={e => { setFile(e.target.files?.[0]); setMessage(''); }} /></label>
    {file ? <p className="mt-2 break-all text-sm text-ink-soft">Selected: {file.name}</p> : null}
    {busy && file ? <div className="mt-3"><progress value={progress} max={100} className="w-full accent-action" aria-label="Example PDF upload progress" /><p className="text-sm text-ink-soft">{progress < 100 ? `Uploading… ${progress}%` : 'Checking and attaching PDF…'}</p></div> : null}
    <div className="mt-3 flex flex-wrap gap-3"><Button size="compact" disabled={!file || busy} onClick={upload}>{busy ? 'Saving PDF…' : hasTask ? 'Retry upload / save' : document ? 'Replace example PDF' : 'Upload example PDF'}</Button>{file ? <Button size="compact" variant="secondary" onClick={cancel}>Cancel upload</Button> : null}</div>
    <p className="mt-3 text-xs leading-5 text-ink-soft">Keep this page open until saving finishes. After reloading, reselect any unfinished PDF.</p>
    {message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}
  </section>;
}

export function GradingReferenceEditor({ assignmentId, initial, persisted, onDirty, expanded = false, scheduleStarter }: {
  assignmentId: string; initial?: GradingReference; persisted: boolean; onDirty: (id: string, dirty: boolean) => void; expanded?: boolean; scheduleStarter?:ScheduleTask[];
}) {
  const [source, setSource] = useState(initial ?? emptyReference(assignmentId));
  const [rubric, setRubric] = useState(source.rubric), [example, setExample] = useState(source.example);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [pdfDirty, setPdfDirty] = useState(false);
  const dirty = rubric !== source.rubric || example !== source.example;
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const openTarget = () => { if (window.location.hash === `#grading-${assignmentId}` && details.current) details.current.open = true; };
    openTarget(); window.addEventListener('hashchange', openTarget);
    return () => window.removeEventListener('hashchange', openTarget);
  }, [assignmentId]);
  useEffect(() => { onDirty(assignmentId, dirty || pdfDirty || saving); return () => onDirty(assignmentId, false); }, [assignmentId, dirty, pdfDirty, saving, onDirty]);
  async function save() {
    if (saving) return;
    setSaving(true); setMessage('');
    try {
      const result = await saveGradingReference({ assignmentId, rubric, example, textVersion: source.textVersion });
      if ('error' in result) return setMessage(result.error);
      setSource(current => ({ ...current, rubric, example, textVersion: result.version })); setMessage('Grading reference saved.');
    } catch { setMessage('Could not save grading reference. Your text is retained; please retry.'); }
    finally { setSaving(false); }
  }
  return <details ref={details} open={expanded || undefined} id={`grading-${assignmentId}`} className="rounded-lg border border-border bg-surface-subtle p-5">
    <summary className="cursor-pointer font-bold">Grading reference <span className="ml-2 text-xs font-semibold text-ink-soft">Admins only</span></summary>
    {!persisted ? <p className="mt-4 text-sm text-ink-soft">Save the assignment draft first, then add its grading reference.</p> : <div className="mt-5 space-y-6">
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <AssignmentInstructionsEditor label="Rubric" showFormat={false} value={rubric} format="markdown" onChange={v => { if (v.instructions !== undefined) setRubric(v.instructions); setMessage(''); }} />
        <AssignmentInstructionsEditor label="Example response" showFormat={false} value={example} format="markdown" onChange={v => { if (v.instructions !== undefined) setExample(v.instructions); setMessage(''); }} />
      </fieldset>
      <div className="flex flex-wrap items-center gap-4"><Button disabled={!dirty || saving} onClick={save}>{saving ? 'Saving reference…' : 'Save grading reference'}</Button>{dirty ? <span className="text-sm text-warning-text">Unsaved reference text</span> : null}</div>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
      {scheduleStarter!==undefined?<ScheduleReferenceEditor assignmentId={assignmentId} initial={initial?.scheduleExample} version={initial?.scheduleVersion} starter={scheduleStarter} onDirty={onDirty}/>:null}
      <ExamplePdf reference={source} onDirty={setPdfDirty} />
    </div>}
  </details>;
}

export function GradingReferenceContent({reference,kind,editHref,loadPdf=false}:{reference?:GradingReference;kind:'rubric'|'example';editHref:string;loadPdf?:boolean}) {
  const text=kind==='rubric'?reference?.rubric:reference?.example;
  const document=kind==='example'?reference?.document:undefined;
  const edit=<Link href={editHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-action">{reference?'Edit reference →':'Add grading reference →'}</Link>;
  if(kind==='example'&&reference?.scheduleExample)return <div className="p-4"><div className="flex justify-end">{edit}</div>{text?.trim()?<AssignmentBrief instructions={text} format="markdown"/>:null}<ScheduleComparison snapshot={reference.scheduleExample}/>{document?<a download href={`/api/grading-examples/${document.id}/download`} className="inline-flex min-h-11 items-center font-semibold text-action">Download example PDF</a>:null}</div>;
  if(document)return <div className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 px-4 pt-2">{text?.trim()?<details className="border-b border-border"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Written example</summary><div className="max-h-40 overflow-y-auto pb-4"><AssignmentBrief instructions={text} format="markdown"/></div></details>:null}<div className="flex justify-end">{edit}</div></div>
    <div className="min-h-0 flex-1">{loadPdf?<PdfPreview resource={{kind:'example',id:document.id,name:document.name}} fill/>:null}</div>
  </div>;
  return <div className="p-5"><div className="mb-3 flex justify-end">{edit}</div>{text?.trim()?<AssignmentBrief instructions={text} format="markdown"/>:<p className="text-sm text-ink-soft">{kind==='rubric'?'No rubric added yet.':'No example added yet.'}</p>}</div>;
}
