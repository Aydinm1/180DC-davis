import {serveSwapFile} from '@/lib/slide-swap/server';
import { createClient } from '@/lib/supabase/server';
import { storageObjectUrl } from '@/lib/uploads/server';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response('Sign in to download.', { status: 401, headers });
  const { id } = await params;
  const proof=await db.rpc('slide_swap_proof',{p_submission:id});
  if(proof.data)return serveSwapFile(proof.data,true,false);
  // RLS checks the live roster and owner/admin authority, including historical attempts.
  const { data, error } = await db.from('submissions').select('file_path,original_filename,submission_type').eq('id', id).maybeSingle();
  if (error || !data || data.submission_type !== 'file' || !data.file_path) return new Response('File not found or access denied.', { status: 404, headers });
  const { data: { session } } = await db.auth.getSession();
  if (!session) return new Response('Sign in to download.', { status: 401, headers });
  try {
    const upstream = await fetch(storageObjectUrl(data.file_path), { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(60000) });
    if (!upstream.ok || !upstream.body) return new Response('File unavailable. Please retry.', { status: 503, headers });
    const name = (data.original_filename ?? 'submission').replace(/[\x00-\x1f\x7f]/g, '_');
    const encoded = encodeURIComponent(name).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`);
    return new Response(upstream.body, { headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="submission.${name.split('.').pop()?.replace(/[^a-z0-9]/gi, '')}"; filename*=UTF-8''${encoded}` } });
  } catch { return new Response('File unavailable. Please retry.', { status: 503, headers }); }
}
