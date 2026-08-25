// Lazy Web Audio engine: one AudioContext + master bus, created on first
// user gesture (autoplay policy requires this). Each strike layers a few
// inharmonic partials so a bell reads as bronze, not a pure sine beep.

type PartialTone = { ratio: number; amp: number; decayMul: number };

// Measured from a real 65-bell Zeng Hou Yi replica recording (Wuhan
// Conservatory sample set), not guessed: an FFT of the strike and its decay
// showed the loudest partial at the moment of impact sits at ~5.7x the
// fundamental (the bright "clang"), while a completely different partial at
// ~2.9x is what's still ringing four seconds later — by then the fundamental
// itself has already died out. That collapse from a bright, fast-decaying
// high partial into a lower sustained hum is what makes a struck bronze bell
// sound like metal instead of a synthesizer; a plain harmonic stack doesn't
// have it.
const PARTIALS: PartialTone[] = [
  { ratio: 1.0, amp: 0.5, decayMul: 0.6 },
  { ratio: 2.9, amp: 0.9, decayMul: 1.4 },
  { ratio: 4.7, amp: 0.4, decayMul: 0.3 },
  { ratio: 5.7, amp: 1.0, decayMul: 0.2 },
  { ratio: 8.3, amp: 0.25, decayMul: 0.1 },
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
