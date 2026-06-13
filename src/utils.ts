import { DEFAULT_GOAL_MINUTES, type Child } from './types';

// Daily goal (minutes) for a given instrument: the instrument-specific goal if
// set, otherwise the child's fallback goal, otherwise the app default.
export function goalForInstrument(child: Child, instrument: string): number {
  return (
    child.instrumentGoals?.[instrument] ??
    child.dailyGoalMinutes ??
    DEFAULT_GOAL_MINUTES
  );
}

// mm:ss for short durations, h:mm:ss when over an hour.
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatMinutes(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)}`;
}

// "Pause after 1 min of silence" style label for the settings slider.
export function formatSilenceTolerance(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const min = seconds / 60;
  return Number.isInteger(min) ? `${min} min` : `${min.toFixed(1)} min`;
}

export function startOfWeek(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00');
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekStartISO: string): string {
  const start = new Date(weekStartISO + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatDateLabel(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
