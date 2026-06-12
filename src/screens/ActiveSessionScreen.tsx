import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AudioLevelBar from '../components/AudioLevelBar';
import WakeLockBanner from '../components/WakeLockBanner';
import { useSession } from '../hooks/useSession';
import { useWakeLock } from '../hooks/useWakeLock';
import { useAppData, saveSessionDirect } from '../hooks/useStorage';
import { formatDuration } from '../utils';

interface LocationState {
  childId?: string;
  instrument?: string;
}

export default function ActiveSessionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { children, settings } = useAppData();

  const child = children.find((c) => c.id === state.childId);

  const session = useSession({
    childId: state.childId ?? '',
    instrument: state.instrument ?? 'Piano',
    settings,
  });
  const wakeLock = useWakeLock();

  const startedOnce = useRef(false);
  const endRef = useRef(session.end);
  endRef.current = session.end;
  const savedRef = useRef(false);

  useEffect(() => {
    if (!state.childId) {
      navigate('/start', { replace: true });
      return;
    }
    if (startedOnce.current) return;
    startedOnce.current = true;
    void session.start();
    void wakeLock.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist a partial session if the tab is closed mid-practice.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (savedRef.current) return;
      const draft = endRef.current();
      if (draft.effectiveDuration > 0) {
        savedRef.current = true;
        saveSessionDirect(draft);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  function handleEnd() {
    savedRef.current = true; // don't double-save via beforeunload
    const draft = session.end();
    void wakeLock.release();
    navigate('/session/summary', { state: { session: draft }, replace: true });
  }

  const playing = session.isPlaying;

  return (
    <div
      className="flex min-h-dvh flex-col px-5 pt-8"
      // Keep the End Session button clear of the iPhone home-indicator bar.
      style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="font-medium" style={{ color: child?.color }}>
          {child?.name ?? '—'} · {state.instrument}
        </span>
        <WakeLockIcon
          active={wakeLock.status === 'active'}
          supported={wakeLock.supported}
        />
      </div>

      <div className="mt-2">
        <WakeLockBanner status={wakeLock.status} />
      </div>

      {session.status === 'mic-denied' && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Microphone blocked</p>
          <p className="mt-1">
            Enable microphone access for this site in your browser settings,
            then start again.
          </p>
          <button
            onClick={() => navigate('/start')}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-white"
          >
            Back to start
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          className={`mb-3 rounded-full px-4 py-1.5 text-sm font-semibold ${
            playing
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {playing ? '🎵 Playing' : '⏸ Paused'}
        </div>

        <div className="font-mono text-7xl font-bold tabular-nums tracking-tight">
          {formatDuration(session.effectiveSeconds)}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          effective practice time
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Total elapsed:{' '}
          <span className="font-mono">
            {formatDuration(session.wallSeconds)}
          </span>
        </div>

        <div className="mt-8 w-full max-w-xs">
          <AudioLevelBar level={session.level} />
          <div className="mt-1 text-center text-xs text-slate-400">
            microphone level
          </div>
        </div>

        {settings.debugMode && (
          <div className="mt-6 w-full max-w-xs rounded-lg bg-slate-100 p-3 text-center font-mono text-xs text-slate-600">
            <div>
              top: {session.debug.topClass || '—'}{' '}
              {session.debug.topScore
                ? `(${session.debug.topScore.toFixed(2)})`
                : ''}
            </div>
            <div>classified playing: {String(session.debug.playing)}</div>
          </div>
        )}
      </div>

      <button
        onClick={handleEnd}
        className="w-full rounded-xl bg-red-600 py-4 text-lg font-semibold text-white active:bg-red-700"
      >
        End Session
      </button>
    </div>
  );
}

function WakeLockIcon({
  active,
  supported,
}: {
  active: boolean;
  supported: boolean;
}) {
  if (!supported) return <span title="Wake lock unsupported">🔓</span>;
  return (
    <span title={active ? 'Screen kept awake' : 'Screen lock not held'}>
      {active ? '🔒' : '🔓'}
    </span>
  );
}
