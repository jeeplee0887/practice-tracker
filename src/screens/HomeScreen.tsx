import { Link, useNavigate } from 'react-router-dom';
import {
  useAppData,
  secondsPracticedTodayForInstrument,
} from '../hooks/useStorage';
import { formatDateLabel, formatDuration, goalForInstrument } from '../utils';

export default function HomeScreen() {
  const { children, sessions } = useAppData();
  const navigate = useNavigate();

  const recent = [...sessions]
    .filter((s) => s.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

  return (
    <div className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Practice Tracker</h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </header>

      {children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          <p className="mb-3">No children yet.</p>
          <Link
            to="/settings"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Add a child
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="truncate text-lg font-semibold">
                  {child.name}
                </h2>
                <button
                  onClick={() => navigate(`/start/${child.id}`)}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white active:opacity-90"
                  style={{ backgroundColor: child.color }}
                >
                  Start
                </button>
              </div>

              {child.instruments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">
                  No instruments set
                </p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {child.instruments.map((inst) => {
                    const practiced = secondsPracticedTodayForInstrument(
                      sessions,
                      child.id,
                      inst
                    );
                    const goalMin = goalForInstrument(child, inst);
                    const goalSeconds = goalMin * 60;
                    const progress =
                      goalSeconds > 0
                        ? Math.min(practiced / goalSeconds, 1)
                        : 0;
                    const done = progress >= 1;
                    return (
                      <div key={inst}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {inst}
                          </span>
                          <span className="text-slate-500">
                            {done && '🎉 '}
                            {Math.round(practiced / 60)} / {goalMin} min
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress * 100}%`,
                              backgroundColor: child.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600">
            Recent sessions
          </h3>
          <Link to="/history" className="text-xs text-indigo-600">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">No sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((s) => {
              const child = children.find((c) => c.id === s.childId);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div>
                    <span className="font-medium">
                      {child?.name ?? 'Unknown'}
                    </span>
                    <span className="text-slate-400">
                      {' '}
                      · {s.instrument}
                    </span>
                    <div className="text-xs text-slate-400">
                      {formatDateLabel(s.date)}
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-indigo-600">
                    {formatDuration(s.effectiveDuration)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
