import type { WakeLockStatus } from '../hooks/useWakeLock';

export default function WakeLockBanner({ status }: { status: WakeLockStatus }) {
  if (status !== 'released') return null;
  return (
    <div className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
      ⚠️ Screen-lock prevention paused — your screen may turn off. Check Low
      Power Mode, or keep the screen on manually.
    </div>
  );
}
