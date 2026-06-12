import { useCallback, useEffect, useRef, useState } from 'react';

export type WakeLockStatus = 'idle' | 'active' | 'released' | 'unsupported';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', cb: () => void) => void;
}

interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

const supported =
  typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Keeps the screen awake during an active session. The OS may still override
// the lock (Low Power Mode / battery saver); we surface that via 'released'.
export function useWakeLock() {
  const [status, setStatus] = useState<WakeLockStatus>(
    supported ? 'idle' : 'unsupported'
  );
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const wantLockRef = useRef(false);

  const request = useCallback(async () => {
    wantLockRef.current = true;
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    try {
      const wl = (navigator as WakeLockNavigator).wakeLock!;
      const sentinel = await wl.request('screen');
      sentinelRef.current = sentinel;
      sentinel.addEventListener('release', () => {
        // System released it (e.g. Low Power Mode) or we did.
        if (wantLockRef.current) setStatus('released');
      });
      setStatus('active');
    } catch {
      // Denied — typically Low Power Mode.
      setStatus('released');
    }
  }, []);

  const release = useCallback(async () => {
    wantLockRef.current = false;
    try {
      await sentinelRef.current?.release();
    } catch {
      /* ignore */
    }
    sentinelRef.current = null;
    if (supported) setStatus('idle');
  }, []);

  // Re-acquire when the user returns to a visible tab and still wants the lock.
  useEffect(() => {
    if (!supported) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wantLockRef.current) {
        void request();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [request]);

  return { status, supported, request, release };
}
