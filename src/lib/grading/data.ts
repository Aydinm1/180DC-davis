import 'server-only';
import type {ScheduleSnapshot} from '@/lib/schedules/types';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { emptyReference, type GradingReference } from './types';

// Explicit admin page inputs only: never merge these into shared program DTOs.
export async function readGradingReferences(assignmentIds: string[]): Promise<GradingReference[]> {
  await requireUser(true);
  if (!assignmentIds.length) return [];
  const db = await createClient();
  const [references, documents] = await Promise.all([
    db.from('assignment_grading_references').select('*').in('assignment_id', assignmentIds),
    db.from('grading_example_documents').select('id,assignment_id,original_filename').in('assignment_id', assignmentIds).eq('is_current', true).eq('state', 'ready'),
  ]);
  if (references.error || documents.error) throw new Error('Could not load private grading references. Please retry.');
  return assignmentIds.map(assignmentId => {
    const r = references.data.find(r => r.assignment_id === assignmentId);
    const d = documents.data.find(d => d.assignment_id === assignmentId);
    return { ...emptyReference(assignmentId), ...(r ? { rubric: r.rubric, example: r.example, textVersion: r.text_version, fileVersion: r.file_version, scheduleVersion:r.schedule_version, scheduleExample:r.schedule_example as unknown as ScheduleSnapshot|undefined } : {}),
      document: d ? { id: d.id, name: d.original_filename } : undefined };
  });
}
