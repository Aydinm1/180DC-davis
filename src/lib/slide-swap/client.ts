'use client';
import { createClient } from '@/lib/supabase/client';
import { prepareSwap, finalizeSwap, cancelSwap } from './actions';


export function swapUploadTask(file: File, assignmentId: string,kind:'deck'|'proof', expected: { id: string; updatedAt?: string } | undefined, progress: (value: number) => void, saving: () => void) {
  let intent: {id:string;path:string;mime:string} | undefined;const request=crypto.randomUUID();
  let transfer: import('tus-js-client').Upload | undefined;
  let uploaded = false, canceled = false;
  let rejectTransfer: ((reason: Error) => void) | undefined;
  return {
    async run() {
      if (canceled) throw new Error('Upload canceled. Start again when ready.');
      if (!intent) {
        const result = await prepareSwap(assignmentId,kind, { name: file.name, size: file.size, type: file.type }, expected?.id??null, expected?.updatedAt??null,request);
        if (result.error) throw new Error(result.error);
        intent = result.intent!;
      }
      if (canceled) { await cancelSwap(intent.id); throw new Error('Upload canceled.'); }
      if (!uploaded) {
        const { Upload } = await import('tus-js-client');
        const db = createClient();
        const endpoint = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
        if (endpoint.hostname.endsWith('.supabase.co')) endpoint.hostname = endpoint.hostname.replace('.supabase.co', '.storage.supabase.co');
        await new Promise<void>((resolve, reject) => {
          rejectTransfer = reject;
          const options: import('tus-js-client').UploadOptions = {
            endpoint: `${endpoint.origin}/storage/v1/upload/resumable`,
            chunkSize: 6 * 1024 * 1024, retryDelays: [0, 1000, 3000, 5000],
            uploadDataDuringCreation: true, storeFingerprintForResuming: false,
            metadata: { bucketName: 'slide-swap', objectName: intent!.path, contentType: intent!.mime, cacheControl: '0' },
            onBeforeRequest: async request => {
              if (canceled) throw new Error('Canceled');
              const { data: { session } } = await db.auth.getSession();
              if (!session) throw new Error('Sign in again.');
              request.setHeader('Authorization', `Bearer ${session.access_token}`);
              request.setHeader('x-upsert', 'false');
            },
            onShouldRetry: (error, attempt, options) => {
              const status = error.originalResponse?.getStatus();
              return !canceled && (!status || status === 429 || status >= 500) && attempt < (options.retryDelays?.length ?? 0);
            },
            onProgress: (sent, total) => progress(Math.round(sent / total * 100)),
            onError: () => reject(new Error('Transfer interrupted. Retry to resume, or cancel. If your session expired, sign in again and reselect the file.')),
            onSuccess: () => { uploaded = true; resolve(); },
          };
          if (transfer) transfer.options = { ...transfer.options, ...options };
          else transfer = new Upload(file, options);
          transfer.start();
        });
      }
      if (canceled) throw new Error('Upload canceled.');
      saving();
      const result = await finalizeSwap(intent.id);
      if (result.error) throw new Error(result.error);
      return result;
    },
    async cancel() {
      canceled = true;
      try {
        await transfer?.abort(); // Do not send TUS DELETE: browsers cannot delete objects.
        return intent ? await cancelSwap(intent.id) : undefined;
      } catch {
        return { error: 'Cancellation could not be confirmed. Your file is still selected; any unfinished upload expires after one hour. You can start again or submit a link.' };
      } finally {
        rejectTransfer?.(new Error('Upload stopped. Your file is still selected.'));
      }
    },
  };
}
