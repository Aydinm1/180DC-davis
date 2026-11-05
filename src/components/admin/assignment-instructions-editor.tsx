'use client';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { AssignmentBrief } from '@/components/program/assignment-brief';
import { safeBriefUrl, MAX_BRIEF_CHARACTERS, type BriefFormat } from '@/lib/program/brief';

export function AssignmentInstructionsEditor({ value, format = 'plain', onChange, label = 'Instructions', showFormat = true }: {
  value: string; format?: BriefFormat; label?: string; showFormat?: boolean; onChange: (patch: { instructions?: string; instructionsFormat?: BriefFormat }) => void;
}) {
  const id = useId(), textarea = useRef<HTMLTextAreaElement>(null);
  const linkText = useRef<HTMLInputElement>(null), linkAddress = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState<{ start: number; end: number; source: string; text: string; url: string } | null>(null);
  const linkOpen = link !== null;
  useLayoutEffect(() => {
    if (linkOpen) (linkAddress.current?.value ? linkText.current : linkText.current?.value ? linkAddress.current : linkText.current)?.focus();
  }, [linkOpen]);
  const selection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    if (!selection.current || !textarea.current) return;
    textarea.current.focus(); textarea.current.setSelectionRange(...selection.current);
    selection.current = null;
  }, [value]);
  const [error, setError] = useState('');
  const button = 'min-h-11 rounded-md border border-border px-3 text-sm font-bold text-ink hover:bg-surface-subtle';
  function apply(kind: 'heading' | 'bold' | 'bullets' | 'numbers' | 'link') {
    const node = textarea.current; if (!node) return;
    const start = node.selectionStart, end = node.selectionEnd;
    const selected = value.slice(start, end);
    let insert = '';
    if (kind === 'bold') insert = `**${selected || 'Bold text'}**`;
    else if (kind === 'link') {
      const trimmed = selected.trim();
      const linkStart = trimmed ? start + selected.indexOf(trimmed) : start;
      setLink({ start: linkStart, end: trimmed ? linkStart + trimmed.length : end, source: value,
        text: safeBriefUrl(trimmed) ? '' : trimmed.replace(/\s+/g, ' '), url: safeBriefUrl(trimmed) ? trimmed : '' });
      setError('');
      return;
    } else {
      const lines = (selected || (kind === 'heading' ? 'Section heading' : 'List item')).split('\n');
      insert = (start > 0 && value[start - 1] !== '\n' ? '\n' : '')
        + lines.map((line, index) => `${kind === 'heading' ? '## ' : kind === 'bullets' ? '- ' : `${index + 1}. `}${line}`).join('\n')
        + (end < value.length && value[end] !== '\n' ? '\n' : '');
    }
    selection.current = [start, start + insert.length];
    onChange({ instructions: value.slice(0, start) + insert + value.slice(end), instructionsFormat: 'markdown' });
    setError('');
  }
  function cancelLink() {
    setLink(null); setError(''); textarea.current?.focus();
  }
  function insertLink() {
    if (!link) return;
    if (link.source !== value) return setError('Instructions changed. Cancel and select the text again.');
    const text = link.text.trim(), safe = safeBriefUrl(link.url.trim());
    if (!text || /[\[\]\r\n]/.test(text)) {
      setError('Enter link text without brackets or line breaks.'); linkText.current?.focus(); return;
    }
    if (!safe || /[)\s]/.test(safe)) {
      setError('Enter a complete http:// or https:// web address without spaces or closing parentheses.'); linkAddress.current?.focus(); return;
    }
    const insert = `[${text}](${safe})`;
    selection.current = [link.start, link.start + insert.length];
    onChange({ instructions: value.slice(0, link.start) + insert + value.slice(link.end), instructionsFormat: 'markdown' });
    setLink(null); setError('');
  }
  return <div className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-bold">{label}</label>
      {showFormat ? <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">Format<select aria-label={label === 'Instructions' ? 'Instruction format' : `${label} format`} className="min-h-11 rounded-md border border-border bg-surface px-2 text-sm" value={format} onChange={e => onChange({ instructionsFormat: e.target.value as BriefFormat })}><option value="plain">Plain text</option><option value="markdown">Formatted</option></select></label> : null}</div>
    <div role="group" aria-label={label === 'Instructions' ? 'Instruction formatting' : `${label} formatting`} className="mt-2 flex flex-wrap gap-2">{(['heading','bold','bullets','numbers','link'] as const).map(kind => <button key={kind} type="button" className={button} aria-expanded={kind === 'link' ? linkOpen : undefined} aria-controls={kind === 'link' ? `${id}-link` : undefined} onClick={() => apply(kind)}>{({heading:'Heading',bold:'Bold',bullets:'Bulleted list',numbers:'Numbered list',link:'Link'})[kind]}</button>)}</div>
    {link ? <div id={`${id}-link`} role="group" aria-label={`${label} link`} className="mt-3 rounded-lg border border-border bg-surface-subtle p-4" onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelLink(); }
      else if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); insertLink(); }
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-semibold">Link text<input ref={linkText} value={link.text} onChange={e => setLink({ ...link, text: e.target.value })} className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 font-normal" /></label>
        <label className="min-w-0 text-sm font-semibold">Web address<input ref={linkAddress} type="url" inputMode="url" placeholder="https://…" value={link.url} onChange={e => setLink({ ...link, url: e.target.value })} className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 font-normal" /></label>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-danger-text">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} onClick={insertLink}>Insert link</button><button type="button" className={button} onClick={cancelLink}>Cancel</button></div>
    </div> : null}
    <textarea ref={textarea} id={id} rows={10} value={value} onChange={e => onChange({instructions:e.target.value})} aria-describedby={`${id}-help`} className="mt-3 block w-full rounded-lg border border-border-strong bg-surface p-3.5 text-base leading-7" />
    <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-ink-soft">Up to {MAX_BRIEF_CHARACTERS.toLocaleString('en-US')} characters. No HTML, images or embeds.</p>
    <details className="mt-4 rounded-lg border border-border bg-surface-subtle p-4"><summary className="cursor-pointer text-sm font-bold">Preview {label.toLowerCase()}</summary><div className="mt-5"><AssignmentBrief instructions={value} format={format} /></div></details>
  </div>;
}
