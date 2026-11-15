import { applyConsoleBus } from './console-bus.js';
import { renderScore, type StereoPcm } from './render.js';
import type { ScoreEvent } from './score.js';

declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

class ScoreProcessor extends AudioWorkletProcessor {
  private pcm: StereoPcm | null = null;
  private offset = 0;

  constructor() {
    super();
    this.port.onmessage = ({ data }: MessageEvent<readonly ScoreEvent[]>) => {
      this.pcm = applyConsoleBus(renderScore(data, sampleRate), {
        sampleRate: Math.min(sampleRate, 22050),
        bitDepth: 8,
      });
    };
  }

  process(_inputs: Float32Array[][], [output]: Float32Array[][]): boolean {
    if (!this.pcm) return true;
    if (this.offset === 0) this.port.postMessage({ startedAt: currentTime });

    const [left, right] = output;
    for (let index = 0; index < left.length; index += 1) {
      const sample = Math.floor((this.offset * this.pcm.sampleRate) / sampleRate);
      if (sample >= this.pcm.left.length) {
        this.port.postMessage({ ended: true });
        return false;
      }
      left[index] = this.pcm.left[sample];
      right[index] = this.pcm.right[sample];
      this.offset += 1;
    }
    return true;
  }
}

registerProcessor('overtone-score', ScoreProcessor);
