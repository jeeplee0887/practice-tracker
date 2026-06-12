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

export function resolveActiveClasses(instrument: string): string[] {
  return INSTRUMENT_CLASS_MAP[instrument] ?? ['Music'];
}

// RMS below this counts as silence in Stage 1, so YAMNet is skipped.
const SILENCE_RMS = 0.012;
const TICK_MS = 1000;
// YAMNet's analysis window; ~0.96s at 16 kHz.
const WAVEFORM_SAMPLES = 15600;

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

  private consecutivePlaying = 0;
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

    // Stage 1: volume gate. Skip the expensive model when it's quiet.
    if (rms >= SILENCE_RMS && this.capture.hasEnoughAudio(WAVEFORM_SAMPLES)) {
      // Stage 2: YAMNet classification.
      const waveform = this.capture.getWaveform(WAVEFORM_SAMPLES);
      const result = await yamnet.classify(waveform);
      topClass = result.topClass;
      topScore = result.topScore;
      const threshold = this.opts.getThreshold();
      playing = this.activeClasses.some(
        (name) => (result.scores[name] ?? 0) > threshold
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

    if (playing) {
      this.consecutivePlaying += 1;
      this.silentSeconds = 0;
      if (!this.active && this.consecutivePlaying >= startWindows) {
        this.setActive(true);
      }
    } else {
      this.consecutivePlaying = 0;
      if (this.active) {
        this.silentSeconds += TICK_MS / 1000;
        if (this.silentSeconds >= pauseSeconds) {
          this.setActive(false);
        }
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
