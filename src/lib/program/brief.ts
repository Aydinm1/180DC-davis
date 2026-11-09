export type BriefFormat = 'plain' | 'markdown';
export const MAX_ASSIGNMENT_SUMMARY = 300;
export const MAX_BRIEF_CHARACTERS = 50000;
export type BriefInline = { type: 'text' | 'bold' | 'code'; text: string } | { type: 'link'; text: string; href: string };
export type BriefBlock = { type: 'paragraph' | 'heading' | 'subheading'; text: string }
  | { type: 'list'; ordered: boolean; start: number; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export function briefHeadings(value: string, scope: string) {
  return briefBlocks(value).flatMap((block, index) => block.type === 'heading' || block.type === 'subheading'
    ? [{ id: `${scope}-${index}`, text: briefInline(block.text).map(part => part.text).join(''), level: block.type === 'heading' ? 2 : 3 }] : []);
}

export function safeBriefUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

/** Deliberately small Markdown subset, not a general HTML/Markdown interpreter. */
export function briefInline(text: string): BriefInline[] {
  const result: BriefInline[] = [];
  const pattern = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|(?<!!)\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) result.push({ type: 'text', text: text.slice(cursor, match.index) });
    const href = match[4] ? safeBriefUrl(match[4]) : undefined;
    result.push(match[1] ? { type: 'code', text: match[1] } : match[2] ? { type: 'bold', text: match[2] }
      : href ? { type: 'link', text: match[3], href } : { type: 'text', text: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) result.push({ type: 'text', text: text.slice(cursor) });
  return result;
}

export function briefBlocks(value: string): BriefBlock[] {
  const blocks: BriefBlock[] = [], lines = value.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  function flush() { if (paragraph.length) { blocks.push({ type: 'paragraph', text: paragraph.join('\n') }); paragraph = []; } }
  for (let index=0;index<lines.length;index++) {
    const line=lines[index], headers=tableCells(line), separator=tableCells(lines[index+1]??'');
    if(line.includes('|') && headers.length<=32 && headers.length===separator.length && separator.every(cell=>/^:?-{3,}:?$/.test(cell))) {
      flush(); const rows:string[][]=[]; index++;
      while(index+1<lines.length && lines[index+1].includes('|')) {
        const cells=tableCells(lines[index+1]); if(cells.length!==headers.length)break;
        rows.push(cells);index++;
      }
      blocks.push({type:'table',headers,rows});continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const list = /^(?:[-*] |(\d+)\. )(.+)$/.exec(line);
    if (!line.trim()) { flush(); continue; }
    if (heading) { flush(); blocks.push({ type: heading[1].length === 3 ? 'subheading' : 'heading', text: heading[2] }); }
    else if (list) {
      flush(); const ordered = Boolean(list[1]), last = blocks.at(-1);
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(list[2]);
      else blocks.push({ type: 'list', ordered, start: ordered ? Math.min(Number(list[1]), 9999) : 1, items: [list[2]] });
    } else paragraph.push(line);
  }
  flush(); return blocks;
}

function tableCells(line:string) {
  const cells:string[]=[];let cell='',code=false;
  for(let i=0;i<line.length;i++) {
    const c=line[i];
    if(c==='\\' && line[i+1]==='|'){cell+='|';i++;continue;}
    if(c==='`')code=!code;
    if(c==='|'&&!code){cells.push(cell.trim());cell='';}else cell+=c;
  }
  cells.push(cell.trim());if(line.trimStart().startsWith('|'))cells.shift();if(line.trimEnd().endsWith('|')&&cells.at(-1)==='')cells.pop();
  return cells;
}
