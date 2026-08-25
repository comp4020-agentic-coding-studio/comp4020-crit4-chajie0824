// Bianzhong sample playback. Each bell plays a real recorded strike
// (public/bianzhong/*.mp3 — trimmed and re-encoded from the "Bian Zhong"
// sample library, recorded at Wuhan Conservatory of Music on a 65-bell Zeng
// Hou Yi replica; free for non-commercial use per its included manual),
// pitch-shifted via playbackRate per tune.ts's SAMPLE_TABLE. A strike whose
// sample hasn't finished loading yet (or failed to load) falls back to a
// short synthesized tone instead of silence.

import { freqFor, sampleFor } from "./tune.ts";

const SAMPLE_BASE = "./bianzhong/";
const CORNER_RATIO = Math.pow(2, 3 / 12); // minor third, 正鼓音 -> 侧鼓音

const SAMPLE_FILES = [
  "a2.mp3",
  "a3.mp3",
  "a4.mp3",
  "a6.mp3",
  "b3.mp3",
  "b4.mp3",
  "c4.mp3",
  "c7.mp3",
  "cs5.mp3",
  "d4.mp3",
  "d5.mp3",
  "d6.mp3",
  "d7.mp3",
  "e4.mp3",
  "e6.mp3",
  "fs4.mp3",
  "fs6.mp3",
  "g3.mp3",
];

let engine: { ctx: AudioContext; master: GainNode } | null = null;
const buffers = new Map<string, AudioBuffer>();
let loadStarted = false;

function loadAllSamples(ctx: AudioContext): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const name of SAMPLE_FILES) {
    fetch(`${SAMPLE_BASE}${name}`)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => buffers.set(name, buffer))
      .catch(() => {
        // Left unset: strike() falls back to synthesis for this sample.
      });
  }
}

function ensureAudio(): { ctx: AudioContext; master: GainNode } {
  if (!engine) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const compressor = ctx.createDynamicsCompressor();
    const now = ctx.currentTime;
    compressor.threshold.setValueAtTime(-18, now);
    compressor.knee.setValueAtTime(12, now);
    compressor.ratio.setValueAtTime(3, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
    master.connect(compressor);
    compressor.connect(ctx.destination);
    engine = { ctx, master };
    loadAllSamples(ctx);
  }
  if (engine.ctx.state === "suspended") void engine.ctx.resume();
  return engine;
}

export type StrikeOptions = {
  deg: number;
  oct: number;
  velocity: number;
  pan: number;
  blend?: number;
  gainScale?: number;
};

// Measured from an FFT of a real bell recording, not guessed — see tune.ts's
// header for why these specific ratios (a bright ~5.7x partial dominates the
// strike, a completely different ~2.9x partial is what's still ringing
// seconds later). Only used for the brief window before a real sample loads.
type PartialTone = { ratio: number; amp: number; decayMul: number };
const PARTIALS: PartialTone[] = [
  { ratio: 1.0, amp: 0.5, decayMul: 0.6 },
  { ratio: 2.9, amp: 0.9, decayMul: 1.4 },
  { ratio: 4.7, amp: 0.4, decayMul: 0.3 },
  { ratio: 5.7, amp: 1.0, decayMul: 0.2 },
  { ratio: 8.3, amp: 0.25, decayMul: 0.1 },
];

function synthesizeFallback(
  ctx: AudioContext,
  destination: AudioNode,
  freq: number,
  velocity: number,
  gainScale: number,
): void {
  const now = ctx.currentTime;
  for (const p of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * p.ratio, now);

    const gain = ctx.createGain();
    const brightBoost = p.ratio === 1 ? 1 : Math.pow(velocity, 1.4);
    const peak = 0.09 * p.amp * (0.35 + 0.9 * velocity) * brightBoost * gainScale;
    const decay = Math.max(0.12, 1.4 * p.decayMul);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.001, 0.0001), now + decay);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }
}

export function strike(opts: StrikeOptions): void {
  const { ctx, master } = ensureAudio();
  const ref = sampleFor(opts.deg, opts.oct);
  const blend = opts.blend ?? 0;
  const gainScale = opts.gainScale ?? 1;
  const now = ctx.currentTime;
  const pitchBend = 1 + blend * (CORNER_RATIO - 1);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), now);
  panner.connect(master);

  const gain = ctx.createGain();
  const level = (0.45 + 0.75 * opts.velocity) * gainScale;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + 0.004);
  gain.connect(panner);

  const buffer = buffers.get(ref.file);
  if (buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = ref.rate * pitchBend;
    src.connect(gain);
    src.start(now);
  } else {
    const freq = freqFor(opts.deg, opts.oct) * pitchBend;
    synthesizeFallback(ctx, gain, freq, opts.velocity, 1);
  }
}
