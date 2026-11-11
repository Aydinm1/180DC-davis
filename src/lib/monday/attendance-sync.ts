import type { MondayConfig } from './reader';
import type { AttendanceExportSnapshot, AttendanceSyncResult } from './attendance-types';

type MondayItem = { id: string; board: { id: string }; column_values: { id: string; text: string | null; value: string | null }[] };
type SnapshotReader = (enrollmentId?: string) => Promise<AttendanceExportSnapshot>;

/** Check-only projection. Replays never clear a box or create a board item. */
export async function syncMondayAttendance(config: MondayConfig, snapshot: SnapshotReader, transport: typeof fetch = fetch): Promise<AttendanceSyncResult> {
  const result: AttendanceSyncResult = { checked: 0, alreadyChecked: 0, issues: [] };
  const deadline = Date.now() + 45_000;
  async function request(query: string, variables: Record<string, unknown>) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() >= deadline) throw new Error('Monday sync timed out. Retry to finish the remaining records.');
      try {
        const response = await transport('https://api.monday.com/v2', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(Math.min(8000,deadline-Date.now())),
          headers: { Authorization: config.token, 'Content-Type': 'application/json', 'API-Version': '2026-04' }, body: JSON.stringify({ query, variables }) });
        const body = await response.json().catch(() => null);
        const retryable = response.status === 429 || response.status >= 500 || body?.errors?.some((e: { extensions?: { code?: string } }) => /RATE_LIMIT|COMPLEXITY|TEMPORARILY_BLOCKED/.test(e.extensions?.code || ''));
        if (retryable && attempt === 0) {
          const seconds = Number(response.headers.get('retry-after'));
          if (seconds > 3) throw new Error('Monday is rate-limited. Wait and retry the sync.');
          await new Promise(resolve => setTimeout(resolve, Math.max(500, Number.isFinite(seconds) ? seconds*1000 : 0)));
          continue;
        }
        if (!response.ok || body?.errors?.length || !body?.data) throw new Error('Monday could not save attendance. Check board access and retry.');
        return body.data;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Monday')) throw error;
        if (attempt === 1) throw new Error('Monday is unavailable. Retry the sync.');
      }
    }
    throw new Error('Monday is unavailable. Retry the sync.');
  }
  const source = await snapshot();
  if (!Number.isInteger(source.weekNumber) || source.weekNumber<1 || source.weekNumber>6 || source.participants.length>200) throw new Error('Monday attendance scope is invalid or too large.');
  const meta = await request('query($boards:[ID!]!){account{id} boards(ids:$boards){id columns{id title type}}}', { boards: [config.board] });
  const board = meta.boards?.[0];
  if (String(meta.account?.id)!==config.account || String(board?.id)!==config.board) throw new Error('Monday account or board does not match configuration.');
  const columns = board.columns.filter((c: {title: string})=>c.title.trim()===`Week ${source.weekNumber}`);
  if (columns.length!==1 || columns[0].type!=='checkbox' || !board.columns.some((c: {id: string;type: string})=>c.id===config.email && c.type==='text')) throw new Error(`Monday needs one checkbox named Week ${source.weekNumber} and the configured email column.`);
  const columnId: string = columns[0].id;
  let offset = 0;
  await Promise.all(Array.from({length:Math.min(3,source.participants.length)},async()=>{
    while (offset<source.participants.length) {
      const participant = source.participants[offset++];
      try {
        // Recheck live admin authority, official status, attendance and mappings per item.
        const fresh = (await snapshot(participant.enrollmentId)).participants.find(p=>p.enrollmentId===participant.enrollmentId);
        if (!fresh) throw new Error('Attendance changed. Refresh and retry.');
        if (fresh.items.length!==1 || !/^\d+$/.test(fresh.items[0])) throw new Error(fresh.items.length ? 'Multiple Monday links. Resolve the enrollment mapping first.' : 'No Monday link. Link this participant through Members → Monday import.');
        const id = fresh.items[0];
        const data = await request('query($items:[ID!]!,$columns:[String!]){items(ids:$items){id board{id} column_values(ids:$columns){id text value}}}', {items:[id],columns:[config.email,columnId]});
        const item: MondayItem | undefined = data.items?.find((i: MondayItem)=>String(i.id)===id);
        if (!item || String(item.board?.id)!==config.board || item.column_values.find(c=>c.id===config.email)?.text?.trim().toLowerCase()!==fresh.email.toLowerCase()) throw new Error('Monday item is missing, moved, or has a different email. Review the mapping.');
        const value = JSON.parse(item.column_values.find(c=>c.id===columnId)?.value || 'null');
        if (value?.checked===true || value?.checked==='true') {result.alreadyChecked++;continue;}
        const live = (await snapshot(participant.enrollmentId)).participants.find(p=>p.enrollmentId===participant.enrollmentId);
        if (!live || live.items.length!==1 || live.items[0]!==id || live.email!==fresh.email) throw new Error('Attendance or mapping changed. Refresh and retry.');
        const saved = await request('mutation($board:ID!,$item:ID!,$values:JSON!){change_multiple_column_values(board_id:$board,item_id:$item,column_values:$values){id}}', {board:config.board,item:id,values:JSON.stringify({[columnId]:{checked:'true'}})});
        if (String(saved.change_multiple_column_values?.id)!==id) throw new Error('Monday did not confirm this record. Retry the sync.');
        result.checked++;
      } catch (error) {
        result.issues.push({name:participant.name,reason:error instanceof Error && /^(Monday|Attendance|No Monday|Multiple Monday)/.test(error.message) ? error.message : 'Could not sync this participant. Refresh and retry.'});
      }
    }
  }));
  return result;
}
