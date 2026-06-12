// Captures microphone audio and exposes:
//  - a continuous RMS level (Stage 1 volume gate, cheap)
//  - a rolling waveform buffer at 16 kHz mono (input for YAMNet, Stage 2)
//
// We request a 16 kHz AudioContext so the samples are already at YAMNet's
// expected rate; no manual resampling needed. The browser resamples the mic
// stream into the context.

const TARGET_SAMPLE_RATE = 16000;
// A bit over 1s of audio so a full 1.0s window is always available at the
// device's native sample rate (before resampling to 16 kHz).
const RING_SECONDS = 1.25;

export class AudioCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  private timeData: Float32Array<ArrayBuffer> = new Float32Array(0);
  private ring: Float32Array<ArrayBuffer> = new Float32Array(0);
  private ringWrite = 0;
  private ringFilled = false;

  sampleRate = TARGET_SAMPLE_RATE;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    // Some browsers ignore the requested sampleRate; read back the real one.
    this.ctx = new Ctor({ sampleRate: TARGET_SAMPLE_RATE });
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.sampleRate = this.ctx.sampleRate;

    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.timeData = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);

    this.ring = new Float32Array(this.sampleRate * RING_SECONDS);

    // ScriptProcessorNode is deprecated but reliably supported everywhere,
    // including iOS Safari, and is simplest for collecting raw PCM frames.
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      this.writeRing(input);
    };
    // ScriptProcessor only fires when connected to the destination.
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
  }

  private writeRing(chunk: Float32Array) {
    const ring = this.ring;
    for (let i = 0; i < chunk.length; i++) {
      ring[this.ringWrite] = chunk[i];
      this.ringWrite = (this.ringWrite + 1) % ring.length;
      if (this.ringWrite === 0) this.ringFilled = true;
    }
  }

  /** Current RMS level, normalized to roughly 0..1. */
  getRMS(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const v = this.timeData[i];
      sum += v * v;
    }
    return Math.sqrt(sum / this.timeData.length);
  }

  /** Returns the most recent `length` samples in chronological order. */
  getWaveform(length: number): Float32Array {
    const ring = this.ring;
    const n = Math.min(length, ring.length);
    const out = new Float32Array(n);
    if (!this.ringFilled && this.ringWrite < n) {
      // Not enough data yet; return what we have, zero-padded at the front.
      out.set(ring.subarray(0, this.ringWrite), n - this.ringWrite);
      return out;
    }
    let start = (this.ringWrite - n + ring.length) % ring.length;
    for (let i = 0; i < n; i++) {
      out[i] = ring[start];
      start = (start + 1) % ring.length;
    }
    return out;
  }

  hasEnoughAudio(length: number): boolean {
    return this.ringFilled || this.ringWrite >= length;
  }

  stop(): void {
    this.processor?.disconnect();
    this.analyser?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.processor = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
  }
}
