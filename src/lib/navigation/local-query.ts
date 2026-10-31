'use client';

import { useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';

const change = 'gap:local-query';
function subscribe(listener: () => void) {
  window.addEventListener(change, listener);
  window.addEventListener('popstate', listener);
  return () => {
    window.removeEventListener(change, listener);
    window.removeEventListener('popstate', listener);
  };
}
const snapshot = () => window.location.search.slice(1);

/** Read local query changes synchronously, including rapid controlled-input updates. */
export function useLocalSearchParams() {
  const params = useSearchParams();
  const query = useSyncExternalStore(subscribe, snapshot, () => params.toString());
  return new URLSearchParams(query);
}

/** Only for filters over already-authorized data, never for fetching another resource. */
export function replaceLocalQuery(query: URLSearchParams, hash = '') {
  window.history.replaceState(null, '', `${window.location.pathname}?${query}${hash}`);
  window.dispatchEvent(new Event(change));
}
