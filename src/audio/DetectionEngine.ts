import type { AudioCapture } from './AudioCapture';
import { yamnet } from './YAMNetClassifier';

// Maps a chosen instrument to the YAMNet class names worth watching. Filtering
// by the selected instrument reduces false positives and stops one child's
// instrument from triggering another's timer.
export const INSTRUMENT_CLASS_MAP: Record<string, string[]> = {
  Piano: ['Piano', 'Keyboard (musical)'],
  Violin: ['Bowed string instrument', 'Violin, fiddle'],
  Cello: ['Bowed string instrument', 'Cello'],
  Viola: ['Bowed string instrument', 'Viola'],
  'Double Bass': ['Bowed string instrument', 'Double bass'],
  Guitar: ['Plucked string instrument', 'Guitar'],
  Harp: ['Plucked string instrument', 'Harp'],
  Other: ['Music'],
};

// Broad music classes that fire reliably for any clearly-played instrument.
// We always watch these in addition to the instrument-specific classes,
// because the specific class (e.g. "Piano") often scores low on its own
// while "Music"/"Musical instrument" score high during real playing.
const GENERAL_MUSIC_CLASSES = ['Music', 'Musical instrument'];

export function resolveActiveClasses(instrument: string): string[] {
  const specific = INSTRUMENT_CLASS_MAP[instrument] ?? [];
  return [...new Set([...specific, ...GENERAL_MUSIC_CLASSES])];
}

// RMS below this counts as silence in Stage 1, so YAMNet is skipped. Kept low:
// bowed/sustained instruments (cello, viola) are much quieter at the mic than
// a piano's percussive attacks, and were being gated out as "silence" before
// YAMNet could classify them. YAMNet is the real arbiter; this gate only skips
// genuine quiet to save battery.
const SILENCE_RMS = 0.003;
const TICK_MS = 1000;
// Audio window length fed to YAMNet, in seconds (its window is ~0.96s).
const WINDOW_SECONDS = 1.0;
const YAMNET_RATE = 16000;

// Linear resample to YAMNet's required 16 kHz. Many devices (notably iOS
// Safari) ignore a requested 16 kHz AudioContext and run at 44.1/48 kHz;
// feeding wrong-rate audio to YAMNet wrecks classification.
function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === YAMNET_RATE) return input;
  const ratio = YAMNET_RATE / fromRate;
  const outLen = Math.round(input.length * ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i / ratio;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

export interface DetectionTick {
  rms: number;
  playing: boolean; // classified as instrument this window
  active: boolean; // timer should be running (after debounce)
  topClass: string;
  topScore: number;
  silentSeconds: number;
}

export interface DetectionOptions {
  instrument: string;
  getThreshold: () => number;
  getPauseDebounceSeconds: () => number;
  getStartDebounceSeconds: () => number;
  onTick?: (tick: DetectionTick) => void;
  onActiveChange?: (active: boolean) => void;
}

export class DetectionEngine {
  private capture: AudioCapture;
  private opts: DetectionOptions;
  private activeClasses: string[];

  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  // Recent per-window playing results, used as a sliding window for the start
  // decision so brief flicker (common with sustained instruments like cello)
  // doesn't keep resetting the counter the way a strict "N in a row" rule does.
  private recent: boolean[] = [];
  private silentSeconds = 0;
  private active = false;

  constructor(capture: AudioCapture, opts: DetectionOptions) {
    this.capture = capture;
    this.opts = opts;
    this.activeClasses = resolveActiveClasses(opts.instrument);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  private scheduleNext() {
    this.timer = setTimeout(() => void this.tick(), TICK_MS);
  }

  private async tick() {
    if (!this.running) return;
    try {
      await this.runWindow();
    } catch (err) {
      console.error('Detection tick failed', err);
    }
    if (this.running) this.scheduleNext();
  }

  private async runWindow() {
    const rms = this.capture.getRMS();

    let playing = false;
    let topClass = '';
    let topScore = 0;

    const need = Math.round(WINDOW_SECONDS * this.capture.sampleRate);
    // Stage 1: volume gate. Skip the expensive model when it's quiet.
    if (rms >= SILENCE_RMS && this.capture.hasEnoughAudio(need)) {
      // Stage 2: YAMNet classification (resampled to 16 kHz).
      const raw = this.capture.getWaveform(need);
      const waveform = resampleTo16k(raw, this.capture.sampleRate);
      const result = await yamnet.classify(waveform);
      topClass = result.topClass;
      topScore = result.topScore;
      const threshold = this.opts.getThreshold();
      const bestWatched = Math.max(
        0,
        ...this.activeClasses.map((name) => result.scores[name] ?? 0)
      );
      playing = bestWatched > threshold;
      console.debug(
        `[detect] top=${topClass} ${topScore.toFixed(2)} ` +
          `bestWatched=${bestWatched.toFixed(2)} thr=${threshold} ` +
          `playing=${playing} rate=${this.capture.sampleRate}`
      );
    }

    this.applyStateMachine(playing);

    this.opts.onTick?.({
      rms,
      playing,
      active: this.active,
      topClass,
      topScore,
      silentSeconds: this.silentSeconds,
    });
  }

  private applyStateMachine(playing: boolean) {
    const startWindows = Math.max(1, this.opts.getStartDebounceSeconds());
    const pauseSeconds = this.opts.getPauseDebounceSeconds();

    // Slide a window one wider than the required count, so a single dip below
    // threshold (a bow change, a quiet note) won't reset progress to zero.
    const span = startWindows + 1;
    this.recent.push(playing);
    if (this.recent.length > span) this.recent.shift();

    if (!this.active) {
      const playingInSpan = this.recent.reduce((n, p) => n + (p ? 1 : 0), 0);
      if (playingInSpan >= startWindows) {
        this.setActive(true);
        this.silentSeconds = 0;
      }
    } else if (playing) {
      this.silentSeconds = 0;
    } else {
      this.silentSeconds += TICK_MS / 1000;
      if (this.silentSeconds >= pauseSeconds) {
        this.setActive(false);
        this.recent = []; // require fresh evidence before restarting
      }
    }
  }

  private setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.opts.onActiveChange?.(active);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
