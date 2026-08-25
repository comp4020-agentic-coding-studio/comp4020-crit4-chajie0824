// Lazy Web Audio engine: one AudioContext + master bus, created on first
// user gesture (autoplay policy requires this). Each strike layers a few
// inharmonic partials so a bell reads as bronze, not a pure sine beep.

type PartialTone = { ratio: number; amp: number; decayMul: number };

const PARTIALS: PartialTone[] = [
  { ratio: 1, amp: 1.0, decayMul: 1.0 },
  { ratio: 2.42, amp: 0.42, decayMul: 0.5 },
  { ratio: 3.76, amp: 0.22, decayMul: 0.32 },
  { ratio: 5.43, amp: 0.12, decayMul: 0.18 },
];

let engine: { ctx: AudioContext; master: GainNode } | null = null;

function ensureAudio(): { ctx: AudioContext; master: GainNode } {
  if (!engine) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.85;
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
  }
  if (engine.ctx.state === "suspended") void engine.ctx.resume();
  return engine;
}

export type StrikeOptions = {
  freq: number;
  velocity: number;
  pan: number;
  pitchIndex: number;
  pitchCount: number;
  gainScale?: number;
  decayScale?: number;
};

export function strike(opts: StrikeOptions): void {
  const { ctx, master } = ensureAudio();
  const now = ctx.currentTime;
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), now);
  panner.connect(master);

  const gainScale = opts.gainScale ?? 1;
  const decayScale = opts.decayScale ?? 1;
  const spread = Math.max(1, opts.pitchCount - 1);
  const fundDecay = (2.1 - (opts.pitchIndex / spread) * 1.25) * decayScale;

  for (const p of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(opts.freq * p.ratio, now);

    const gain = ctx.createGain();
    const brightBoost = p.ratio === 1 ? 1 : Math.pow(opts.velocity, 1.4);
    const peak = 0.09 * p.amp * (0.35 + 0.9 * opts.velocity) * brightBoost * gainScale;
    const decay = Math.max(0.12, fundDecay * p.decayMul);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.001, 0.0001), now + decay);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }
}
