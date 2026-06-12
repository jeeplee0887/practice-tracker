import * as tf from '@tensorflow/tfjs';

// YAMNet is published as a TF.js GraphModel on TF Hub. It takes a 1-D float32
// waveform at 16 kHz, mono, in [-1, 1] and returns three outputs:
//   [0] scores         -> [num_frames, 521]
//   [1] embeddings     -> [num_frames, 1024]
//   [2] log_mel_spectrogram
// We average the per-frame scores and map them to class names via the official
// class-map CSV (index,mid,display_name).
//
// Both URLs are intentionally constants so they're easy to repoint (e.g. to a
// self-hosted copy) if the upstream location moves.
const MODEL_URL = 'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1';
const CLASS_MAP_URL =
  'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv';

export interface ClassificationResult {
  topClass: string;
  topScore: number;
  scores: Record<string, number>;
}

class YAMNetClassifier {
  private model: tf.GraphModel | null = null;
  private classNames: string[] = [];
  private loadingPromise: Promise<void> | null = null;

  get isReady(): boolean {
    return this.model !== null && this.classNames.length > 0;
  }

  load(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.doLoad();
    return this.loadingPromise;
  }

  private async doLoad(): Promise<void> {
    await tf.ready();
    const [model, classNames] = await Promise.all([
      tf.loadGraphModel(MODEL_URL, { fromTFHub: true }),
      this.loadClassMap(),
    ]);
    this.model = model;
    this.classNames = classNames;
  }

  private async loadClassMap(): Promise<string[]> {
    const res = await fetch(CLASS_MAP_URL);
    if (!res.ok) throw new Error(`Failed to load YAMNet class map: ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split('\n');
    // First line is the header: index,mid,display_name
    return lines.slice(1).map((line) => parseDisplayName(line));
  }

  /** Run inference on a 16 kHz mono waveform. */
  async classify(waveform: Float32Array): Promise<ClassificationResult> {
    if (!this.model || this.classNames.length === 0) {
      throw new Error('YAMNet model not loaded');
    }
    const input = tf.tensor1d(waveform);
    const outputs = this.model.predict(input) as tf.Tensor | tf.Tensor[];
    const scoresTensor = Array.isArray(outputs) ? outputs[0] : outputs;
    // Average scores across all frames -> [521]
    const mean = scoresTensor.mean(0);
    const data = (await mean.data()) as Float32Array;

    input.dispose();
    mean.dispose();
    if (Array.isArray(outputs)) outputs.forEach((t) => t.dispose());
    else outputs.dispose();

    const scores: Record<string, number> = {};
    let topClass = '';
    let topScore = -1;
    for (let i = 0; i < data.length && i < this.classNames.length; i++) {
      const name = this.classNames[i];
      scores[name] = data[i];
      if (data[i] > topScore) {
        topScore = data[i];
        topClass = name;
      }
    }
    return { topClass, topScore, scores };
  }
}

// Handles the display_name field, which may be quoted because some names
// contain commas (e.g. "Violin, fiddle").
function parseDisplayName(line: string): string {
  const firstComma = line.indexOf(',');
  const secondComma = line.indexOf(',', firstComma + 1);
  let name = line.slice(secondComma + 1).trim();
  if (name.startsWith('"') && name.endsWith('"')) {
    name = name.slice(1, -1);
  }
  return name;
}

// Singleton — the model is large; load it once per app session.
export const yamnet = new YAMNetClassifier();
