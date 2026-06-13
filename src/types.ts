export interface Child {
  id: string;
  name: string;
  instruments: string[];
  // Fallback daily goal (minutes) for any instrument without a specific goal.
  dailyGoalMinutes: number;
  // Per-instrument daily goal in minutes, keyed by instrument name.
  instrumentGoals?: Record<string, number>;
  color: string;
}

export interface PracticeSegment {
  startedAt: string;
  endedAt: string | null;
  duration: number; // seconds
}

export interface PracticeSession {
  id: string;
  childId: string;
  instrument: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startedAt: string; // ISO datetime
  endedAt: string | null;
  effectiveDuration: number; // seconds of actual playing
  totalElapsed: number; // wall clock seconds
  segments: PracticeSegment[];
}

export interface AppSettings {
  detectionThreshold: number; // 0.0-1.0, default 0.5
  pauseDebounceSeconds: number; // default 60, hard max 120
  startDebounceSeconds: number; // default 3
  debugMode: boolean;
}

export interface AppData {
  children: Child[];
  sessions: PracticeSession[];
  settings: AppSettings;
}

export const DEFAULT_GOAL_MINUTES = 30;

export const PAUSE_DEBOUNCE_MIN = 15;
export const PAUSE_DEBOUNCE_MAX = 120;

export const DEFAULT_SETTINGS: AppSettings = {
  detectionThreshold: 0.5,
  pauseDebounceSeconds: 60,
  startDebounceSeconds: 3,
  debugMode: false,
};

export const CHILD_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
];

export const AVAILABLE_INSTRUMENTS = [
  'Piano',
  'Violin',
  'Viola',
  'Cello',
  'Double Bass',
  'Guitar',
  'Harp',
  'Other',
];
