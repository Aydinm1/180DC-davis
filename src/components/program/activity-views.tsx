'use client';

import { useId } from 'react';
import { briefHeadings } from '@/lib/program/brief';
import { AssignmentBrief } from './assignment-brief';

export type ActivityView = 'instructions' | 'workspace';

export function ActivityViewNav({ value, onChange }: { value: ActivityView; onChange: (value: ActivityView) => void }) {
  return <nav aria-label="Assignment views" className="sticky top-0 z-10 mb-8 flex gap-6 border-b border-border bg-canvas">
    {(['instructions', 'workspace'] as const).map(view => <button key={view} type="button" aria-current={value === view ? 'page' : undefined}
      onClick={() => onChange(view)} className={`min-h-12 border-b-2 px-1 text-sm font-bold ${value === view ? 'border-action text-action' : 'border-transparent text-ink-soft hover:text-ink'}`}>{view==='instructions'?'Instructions':'Workspace'}</button>)}
  </nav>;
}

/** Authored text is unchanged; scoped anchors avoid collisions with other brief instances. */
export function BriefReader({ instructions }: { instructions: string }) {
  const scope = useId(), headings = briefHeadings(instructions, scope);
  return <div className={`grid gap-8 ${headings.length ? 'lg:grid-cols-[11rem_minmax(0,48rem)]' : ''}`}>
    {headings.length ? <nav aria-label="Instruction sections" className="min-w-0 self-start lg:sticky lg:top-20">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-faint">On this page</p>
      <ul className="space-y-1 border-l border-border">{headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`} className={`action-link flex min-h-11 items-center border-l-2 border-transparent py-2 pr-2 text-sm text-ink-soft ${heading.level === 3 ? 'pl-6' : 'pl-3 font-semibold'}`}>{heading.text}</a></li>)}</ul>
    </nav> : null}
    <article className="min-w-0 max-w-3xl"><AssignmentBrief instructions={instructions} format="markdown" headingScope={scope}/></article>
  </div>;
}
