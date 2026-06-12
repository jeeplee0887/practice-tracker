import { useMemo, useState } from 'react';
import SessionTimeline from '../components/SessionTimeline';
import { useAppData, todayISO } from '../hooks/useStorage';
import {
  formatDateLabel,
  formatDuration,
  formatWeekLabel,
  startOfWeek,
} from '../utils';
import type { PracticeSession } from '../types';

export default function HistoryScreen() {
  const { children, sessions } = useAppData();
  const [childId, setChildId] = useState(children[0]?.id ?? '');
  const [expanded, setExpanded] = useState<string | null>(null);

  const childSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.childId === childId && s.endedAt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [sessions, childId]
  );

  const weeks = useMemo(() => groupByWeek(childSessions), [childSessions]);
  const streak = useMemo(() => computeStreak(childSessions), [childSessions]);

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">History</h1>

      {children.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setChildId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                c.id === childId
                  ? 'border-transparent text-white'
                  : 'border-slate-300 text-slate-600'
              }`}
              style={c.id === childId ? { backgroundColor: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {streak > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          🔥 {streak}-day streak
        </div>
      )}

      {weeks.length === 0 ? (
        <p className="text-sm text-slate-400">No sessions yet.</p>
      ) : (
        <div className="space-y-6">
          {weeks.map((week) => (
            <section key={week.weekStart}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-600">
                  {formatWeekLabel(week.weekStart)}
                </h2>
                <span className="font-mono text-sm font-semibold text-indigo-600">
                  {formatDuration(week.total)}
                </span>
              </div>
              <ul className="space-y-2">
                {week.sessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg bg-white p-3 shadow-sm"
                  >
                    <button
                      onClick={() =>
                        setExpanded(expanded === s.id ? null : s.id)
                      }
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {formatDateLabel(s.date)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {s.instrument}
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-indigo-600">
                        {formatDuration(s.effectiveDuration)}
                      </span>
                    </button>
                    {expanded === s.id && (
                      <div className="mt-3">
                        <SessionTimeline session={s} />
                        <div className="mt-1 text-xs text-slate-400">
                          {formatDuration(s.effectiveDuration)} of{' '}
                          {formatDuration(s.totalElapsed)} (
                          {s.totalElapsed > 0
                            ? Math.round(
                                (s.effectiveDuration / s.totalElapsed) * 100
                              )
                            : 0}
                          % efficiency)
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

interface WeekGroup {
  weekStart: string;
  total: number;
  sessions: PracticeSession[];
}

function groupByWeek(sessions: PracticeSession[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();
  for (const s of sessions) {
    const wk = startOfWeek(s.date);
    let group = map.get(wk);
    if (!group) {
      group = { weekStart: wk, total: 0, sessions: [] };
      map.set(wk, group);
    }
    group.total += s.effectiveDuration;
    group.sessions.push(s);
  }
  return [...map.values()].sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  );
}

function computeStreak(sessions: PracticeSession[]): number {
  const days = new Set(sessions.map((s) => s.date));
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(todayISO() + 'T00:00:00');
  // Allow the streak to count even if today has no practice yet.
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
