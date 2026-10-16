'use client';

import { useEffect } from 'react';

function isChunkLoadError(err: unknown): boolean {
  const anyErr = err as any;
  const name = String(anyErr?.name || '');
  const message = String(anyErr?.message || anyErr?.reason?.message || '');

  if (name === 'ChunkLoadError') return true;
  if (/ChunkLoadError/i.test(message)) return true;
  // Webpack/Next common text: "Loading chunk <id> failed" / "Loading CSS chunk"
  if (/Loading (CSS )?chunk [\d\w-]+ failed/i.test(message)) return true;
  // Next sometimes wraps dynamic import failures
  if (/Failed to fetch dynamically imported module/i.test(message)) return true;

  return false;
}

export function ChunkLoadErrorHandler(): null {
  useEffect(() => {
    const storageKey = 'vesselai_chunk_reload_attempted';

    const tryRecover = (err: unknown) => {
      if (!isChunkLoadError(err)) return;

      // Avoid reload loops if the underlying issue is persistent.
      const alreadyTried = typeof window !== 'undefined' && window.sessionStorage.getItem(storageKey) === '1';
      if (alreadyTried) {
        // Leave a breadcrumb for debugging.
        // eslint-disable-next-line no-console
        console.error('[ChunkLoadErrorHandler] ChunkLoadError persists after reload attempt:', err);
        return;
      }

      try {
        window.sessionStorage.setItem(storageKey, '1');
      } catch {
        // ignore
      }

      // eslint-disable-next-line no-console
      console.warn('[ChunkLoadErrorHandler] Detected ChunkLoadError; reloading to recover...', err);
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      tryRecover(event.error || event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      tryRecover(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
