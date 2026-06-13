import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioCapture } from '../audio/AudioCapture';
import { DetectionEngine, type DetectionTick } from '../audio/DetectionEngine';
import { yamnet } from '../audio/YAMNetClassifier';
import {
  type AppSettings,
  type PracticeSegment,
  type PracticeSession,
} from '../types';

export type SessionStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'mic-denied'
  | 'error';

interface UseSessionArgs {
  childId: string;
  instrument: string;
  settings: AppSettings;
}

export interface SessionView {
  status: SessionStatus;
  error: string | null;
  isPlaying: boolean; // timer actively counting
  effectiveSeconds: number;
  wallSeconds: number;
  level: number; // RMS 0..1
  debug: {
    topClass: string;
    topScore: number;
    bestWatched: number;
    playing: boolean;
    rms: number;
  };
  start: () => Promise<void>;
  end: () => PracticeSession;
}

export function useSession({
  childId,
  instrument,
  settings,
}: UseSessionArgs): SessionView {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [effectiveSeconds, setEffectiveSeconds] = useState(0);
  const [wallSeconds, setWallSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [debug, setDebug] = useState({
    topClass: '',
    topScore: 0,
    bestWatched: 0,
    playing: false,
    rms: 0,
  });

  const captureRef = useRef<AudioCapture | null>(null);
  const engineRef = useRef<DetectionEngine | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const segmentsRef = useRef<PracticeSegment[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs so the DetectionEngine reads live settings without restarting.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const closeOpenSegment = useCallback(() => {
    const open = segmentsRef.current[segmentsRef.current.length - 1];
    if (open && open.endedAt === null) {
      const end = new Date();
      open.endedAt = end.toISOString();
      open.duration = Math.max(
        0,
        (end.getTime() - new Date(open.startedAt).getTime()) / 1000
      );
    }
  }, []);

  const recomputeEffective = useCallback(() => {
    let total = 0;
    for (const seg of segmentsRef.current) {
      if (seg.endedAt === null) {
        total += (Date.now() - new Date(seg.startedAt).getTime()) / 1000;
      } else {
        total += seg.duration;
      }
    }
    setEffectiveSeconds(total);
  }, []);

  const handleActiveChange = useCallback(
    (active: boolean) => {
      if (active) {
        segmentsRef.current.push({
          startedAt: new Date().toISOString(),
          endedAt: null,
          duration: 0,
        });
      } else {
        closeOpenSegment();
      }
      setIsPlaying(active);
    },
    [closeOpenSegment]
  );

  const start = useCallback(async () => {
    setStatus('requesting');
    setError(null);
    try {
      if (!yamnet.isReady) await yamnet.load();

      const capture = new AudioCapture();
      await capture.start();
      captureRef.current = capture;

      const engine = new DetectionEngine(capture, {
        instrument,
        getThreshold: () => settingsRef.current.detectionThreshold,
        getPauseDebounceSeconds: () =>
          settingsRef.current.pauseDebounceSeconds,
        getStartDebounceSeconds: () => settingsRef.current.startDebounceSeconds,
        onActiveChange: handleActiveChange,
        onTick: (t: DetectionTick) =>
          setDebug({
            topClass: t.topClass,
            topScore: t.topScore,
            bestWatched: t.bestWatched,
            playing: t.playing,
            rms: t.rms,
          }),
      });
      engine.start();
      engineRef.current = engine;

      startedAtRef.current = new Date();
      setStatus('listening');

      tickRef.current = setInterval(() => {
        setLevel(capture.getRMS());
        if (startedAtRef.current) {
          setWallSeconds(
            (Date.now() - startedAtRef.current.getTime()) / 1000
          );
        }
        recomputeEffective();
      }, 200);
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setStatus('mic-denied');
        setError('Microphone access was denied.');
      } else {
        setStatus('error');
        setError(e?.message ?? 'Could not start audio capture.');
      }
    }
  }, [instrument, handleActiveChange, recomputeEffective]);

  const end = useCallback((): PracticeSession => {
    engineRef.current?.stop();
    closeOpenSegment();
    if (tickRef.current) clearInterval(tickRef.current);
    captureRef.current?.stop();

    const startedAt = startedAtRef.current ?? new Date();
    const endedAt = new Date();
    const segments = segmentsRef.current;
    const effective = segments.reduce((sum, s) => sum + s.duration, 0);
    const wall = (endedAt.getTime() - startedAt.getTime()) / 1000;

    return {
      id: crypto.randomUUID(),
      childId,
      instrument,
      date: startedAt.toISOString().slice(0, 10),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      effectiveDuration: Math.round(effective),
      totalElapsed: Math.round(wall),
      segments,
    };
  }, [childId, instrument, closeOpenSegment]);

  // Clean up audio if the component unmounts mid-session.
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      if (tickRef.current) clearInterval(tickRef.current);
      captureRef.current?.stop();
    };
  }, []);

  return {
    status,
    error,
    isPlaying,
    effectiveSeconds,
    wallSeconds,
    level,
    debug,
    start,
    end,
  };
}
