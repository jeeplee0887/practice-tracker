import type { PracticeSession } from '../types';

// Horizontal timeline: gray track = whole session, green blocks = playing.
export default function SessionTimeline({
  session,
}: {
  session: PracticeSession;
}) {
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt
    ? new Date(session.endedAt).getTime()
    : start + session.totalElapsed * 1000;
  const total = Math.max(1, (end - start) / 1000);

  return (
    <div className="relative h-6 w-full overflow-hidden rounded-md bg-slate-200">
      {session.segments.map((seg, i) => {
        const segStart = new Date(seg.startedAt).getTime();
        const left = ((segStart - start) / 1000 / total) * 100;
        const width = (seg.duration / total) * 100;
        return (
          <div
            key={i}
            className="absolute top-0 h-full bg-emerald-500"
            style={{ left: `${left}%`, width: `${Math.max(0.5, width)}%` }}
          />
        );
      })}
    </div>
  );
}
