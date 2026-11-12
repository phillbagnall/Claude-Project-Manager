import { useCallback, useEffect, useState } from 'react';

declare const __BUILD_ID__: string;
export const BUILD_ID = __BUILD_ID__;

/** True when the deployed site is a newer build than the code running in this tab. */
export async function newVersionAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false; // e.g. the dev server, which has no version.json
    const { build } = await res.json();
    return typeof build === 'string' && build !== BUILD_ID;
  } catch {
    return false; // offline
  }
}

/**
 * Watches for a newer deploy: on start, whenever the tab comes back into view, and
 * every 30 minutes. `check()` can also be called directly (e.g. from the ↻ button).
 */
export function useUpdateCheck() {
  const [updateReady, setUpdateReady] = useState(false);
  const check = useCallback(async () => {
    const ready = await newVersionAvailable();
    if (ready) setUpdateReady(true);
    return ready;
  }, []);
  useEffect(() => {
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = setInterval(check, 30 * 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(timer);
    };
  }, [check]);
  return { updateReady, check };
}
