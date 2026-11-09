import { briefBlocks, briefInline, type BriefFormat } from '@/lib/program/brief';

function Inline({ text }: { text: string }) {
  return briefInline(text).map((part, index) => part.type === 'bold' ? <strong key={index} className="font-bold text-ink">{part.text}</strong>
    : part.type === 'code' ? <code key={index} className="rounded bg-surface-subtle px-1 py-0.5 font-mono text-sm text-ink [overflow-wrap:anywhere]">{part.text}</code>
    : part.type === 'link' ? <a key={index} href={part.href} target="_blank" rel="noreferrer" className="font-semibold text-action underline underline-offset-4">{part.text}</a> : part.text);
}

export function AssignmentBrief({ instructions, format = 'plain', headingScope }: { instructions: string; format?: BriefFormat; headingScope?: string }) {
  if (format === 'plain') return <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-8 text-ink-soft">{instructions}</p>;
  return <div className="space-y-5 break-words [overflow-wrap:anywhere] text-base leading-8 text-ink-soft">{briefBlocks(instructions).map((block, index) => {
    if(block.type==='table')return <div key={index} role="region" aria-label="Instruction table" tabIndex={0} className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[32rem] border-collapse text-left text-sm leading-6"><thead className="bg-surface-subtle text-ink"><tr>{block.headers.map((cell,i)=><th key={i} scope="col" className="border-b border-border px-4 py-3 font-bold"><Inline text={cell}/></th>)}</tr></thead><tbody>{block.rows.map((row,i)=><tr key={i} className="border-b border-border last:border-0">{row.map((cell,j)=><td key={j} className="px-4 py-3 align-top"><Inline text={cell}/></td>)}</tr>)}</tbody></table></div>;
    if (block.type === 'heading') return <h2 key={index} id={headingScope ? `${headingScope}-${index}` : undefined} tabIndex={headingScope ? -1 : undefined} className="scroll-mt-24 pt-5 text-xl font-bold tracking-tight text-ink first:pt-0 sm:text-2xl"><Inline text={block.text} /></h2>;
    if (block.type === 'subheading') return <h3 key={index} id={headingScope ? `${headingScope}-${index}` : undefined} tabIndex={headingScope ? -1 : undefined} className="scroll-mt-24 pt-3 text-lg font-bold text-ink"><Inline text={block.text} /></h3>;
    if (block.type === 'list') {
      const items = block.items.map((text, i) => <li key={i} className="pl-1"><Inline text={text} /></li>);
      return block.ordered ? <ol key={index} start={block.start} className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-ink">{items}</ol>
        : <ul key={index} className="list-disc space-y-2 pl-6 marker:text-action">{items}</ul>;
    }
    return <p key={index} className="whitespace-pre-wrap"><Inline text={block.text} /></p>;
  })}</div>;
}
