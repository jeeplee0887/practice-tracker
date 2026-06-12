interface AudioLevelBarProps {
  level: number; // 0..1
  threshold?: number; // silence gate, 0..1, draws a marker
}

export default function AudioLevelBar({ level, threshold }: AudioLevelBarProps) {
  // RMS values are small; apply a gentle curve so the bar is readable.
  const pct = Math.min(100, Math.sqrt(Math.min(1, level)) * 100);
  const active = threshold !== undefined ? level >= threshold : pct > 5;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-[width] duration-100 ${
          active ? 'bg-emerald-500' : 'bg-slate-400'
        }`}
        style={{ width: `${pct}%` }}
      />
      {threshold !== undefined && (
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-600"
          style={{ left: `${Math.sqrt(Math.min(1, threshold)) * 100}%` }}
        />
      )}
    </div>
  );
}
