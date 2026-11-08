import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import type { Investigation, InvestigationReview } from './types';
export async function readInvestigation(assignmentId: string, preview=false): Promise<Investigation> {
 await requireUser();const db=await createClient();
 const r=await db.rpc('read_investigation',{p_assignment:assignmentId,p_preview:preview});
 if(r.error) throw new Error('Could not load the investigation. Reload and retry.');
 return r.data as unknown as Investigation;
}
export async function readInvestigationReview(submissionId: string): Promise<InvestigationReview | undefined> {
 await requireUser(true);const db=await createClient();const r=await db.rpc('investigation_review',{p_submission:submissionId});
 if(r.error) throw new Error('Could not load the investigation reference. Reload and retry.');
 return r.data as unknown as InvestigationReview | undefined;
}
