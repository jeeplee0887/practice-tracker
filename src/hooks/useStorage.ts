import { useCallback, useSyncExternalStore } from 'react';
import {
  type AppData,
  type AppSettings,
  type Child,
  type PracticeSession,
  DEFAULT_SETTINGS,
  CHILD_COLORS,
} from '../types';

const STORAGE_KEY = 'practice-tracker:data';

function seedData(): AppData {
  return {
    children: [
      {
        id: crypto.randomUUID(),
        name: 'Alex',
        instruments: ['Piano'],
        dailyGoalMinutes: 30,
        color: CHILD_COLORS[0],
      },
    ],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      children: parsed.children ?? [],
      sessions: parsed.sessions ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return seedData();
  }
}

// Module-level store so every screen reads the same data and re-renders on change.
let state: AppData = load();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function setState(next: AppData) {
  state = next;
  persist();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppData {
  return state;
}

export function useAppData() {
  const data = useSyncExternalStore(subscribe, getSnapshot);

  const addChild = useCallback((child: Omit<Child, 'id'>) => {
    setState({
      ...state,
      children: [...state.children, { ...child, id: crypto.randomUUID() }],
    });
  }, []);

  const updateChild = useCallback((id: string, patch: Partial<Child>) => {
    setState({
      ...state,
      children: state.children.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  }, []);

  const deleteChild = useCallback((id: string) => {
    setState({
      ...state,
      children: state.children.filter((c) => c.id !== id),
      sessions: state.sessions.filter((s) => s.childId !== id),
    });
  }, []);

  const addSession = useCallback((session: PracticeSession) => {
    setState({ ...state, sessions: [...state.sessions, session] });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState({ ...state, settings: { ...state.settings, ...patch } });
  }, []);

  return {
    children: data.children,
    sessions: data.sessions,
    settings: data.settings,
    addChild,
    updateChild,
    deleteChild,
    addSession,
    updateSettings,
  };
}

// Helpers usable outside React (e.g. beforeunload partial-session save).
export function saveSessionDirect(session: PracticeSession) {
  setState({ ...state, sessions: [...state.sessions, session] });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function secondsPracticedToday(
  sessions: PracticeSession[],
  childId: string
): number {
  const today = todayISO();
  return sessions
    .filter((s) => s.childId === childId && s.date === today)
    .reduce((sum, s) => sum + s.effectiveDuration, 0);
}
