import { useNavigate, useLocation } from 'react-router-dom';
import SessionTimeline from '../components/SessionTimeline';
import { useAppData } from '../hooks/useStorage';
import { formatDuration } from '../utils';
import type { PracticeSession } from '../types';

interface LocationState {
  session?: PracticeSession;
}

export default function SessionSummaryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addSession, children } = useAppData();
  const session = (location.state as LocationState)?.session;

  if (!session) {
    return (
      <div className="px-4 pt-6">
        <p className="text-slate-500">No session to summarize.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-indigo-600"
        >
          Go home
        </button>
      </div>
    );
  }

  const child = children.find((c) => c.id === session.childId);
  const efficiency =
    session.totalElapsed > 0
      ? Math.round((session.effectiveDuration / session.totalElapsed) * 100)
      : 0;

  function save() {
    addSession(session!);
    navigate('/', { replace: true });
  }

  function discard() {
    navigate('/', { replace: true });
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-2xl font-bold">Session Complete</h1>
      <p className="mt-1 text-sm text-slate-500">
        {child?.name ?? '—'} · {session.instrument}
      </p>

      <div className="mt-8 flex flex-col items-center">
        <div className="font-mono text-6xl font-bold tabular-nums text-indigo-600">
          {formatDuration(session.effectiveDuration)}
        </div>
        <div className="text-sm text-slate-400">effective practice time</div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Stat
          label="Total elapsed"
          value={formatDuration(session.totalElapsed)}
        />
        <Stat label="Efficiency" value={`${efficiency}%`} />
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Timeline</span>
          <span>
            <span className="mr-2">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              playing
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300" />
              paused
            </span>
          </span>
        </div>
        <SessionTimeline session={session} />
      </div>

      <div className="mt-10 flex gap-3">
        <button
          onClick={discard}
          className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-600"
        >
          Discard
        </button>
        <button
          onClick={save}
          className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className="font-mono text-xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
