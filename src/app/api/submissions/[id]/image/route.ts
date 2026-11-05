import { createClient } from '@/lib/supabase/server';
import { readBounded, storageObjectUrl } from '@/lib/uploads/server';
import { isImageMime } from '@/lib/uploads/format';
import { imagePreview } from '@/lib/uploads/image';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response('Sign in to view this image.', { status: 401, headers });
  const { id } = await params;
  // The same live RLS boundary as downloads, including previous attempts and team access.
  const { data, error } = await db.from('submissions').select('file_path,file_size,mime_type,submission_type').eq('id', id).maybeSingle();
  if (error || !data || data.submission_type !== 'file' || !data.file_path || !isImageMime(data.mime_type)) {
    return new Response('Image not found or access denied.', { status: 404, headers });
  }
  const { data: { session } } = await db.auth.getSession();
  if (!session) return new Response('Sign in to view this image.', { status: 401, headers });
  try {
    const upstream = await fetch(storageObjectUrl(data.file_path), {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok || upstream.headers.get('content-type')?.split(';')[0] !== data.mime_type) throw new Error('Image unavailable');
    const bytes = await readBounded(upstream);
    if (bytes.length !== data.file_size) throw new Error('Invalid image size');
    const preview = await imagePreview(bytes, data.mime_type!);
    return new Response(new Uint8Array(preview), { headers: { ...headers, 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="submission-preview.png"' } });
  } catch {
    return new Response('Image preview unavailable. Retry or download the original file.', { status: 503, headers });
  }
}
