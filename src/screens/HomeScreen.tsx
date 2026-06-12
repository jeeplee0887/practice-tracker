import { Link, useNavigate } from 'react-router-dom';
import ProgressRing from '../components/ProgressRing';
import {
  useAppData,
  secondsPracticedToday,
} from '../hooks/useStorage';
import { formatDateLabel, formatDuration } from '../utils';

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
          {children.map((child) => {
            const practiced = secondsPracticedToday(sessions, child.id);
            const goalSeconds = child.dailyGoalMinutes * 60;
            const progress = goalSeconds > 0 ? practiced / goalSeconds : 0;
            return (
              <div
                key={child.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <ProgressRing
                  progress={progress}
                  color={child.color}
                  label={`${Math.round(practiced / 60)}`}
                  sublabel={`/ ${child.dailyGoalMinutes} min`}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold">
                    {child.name}
                  </h2>
                  <p className="truncate text-sm text-slate-500">
                    {child.instruments.join(', ') || 'No instruments set'}
                  </p>
                  {progress >= 1 && (
                    <p className="text-xs font-medium text-emerald-600">
                      🎉 Daily goal reached!
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/start/${child.id}`)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white active:bg-indigo-700"
                  style={{ backgroundColor: child.color }}
                >
                  Start
                </button>
              </div>
            );
          })}
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
