'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function SubmissionImage({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  return failed ? <div role="status" className="rounded-lg border border-border p-4 text-sm">
    <p>Image preview unavailable. Retry or download the original file.</p>
    <Button className="mt-3" variant="secondary" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>Retry image preview</Button>
  </div> : (
    // Private authenticated endpoint: intentionally bypass shared Next image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img key={retry} src={`/api/submissions/${id}/image${retry ? `?retry=${retry}` : ''}`} alt={`Submitted image: ${name}`}
      loading="lazy" onError={() => setFailed(true)} className="h-auto max-h-[70vh] max-w-full rounded-lg border border-border object-contain" />
  );
}
