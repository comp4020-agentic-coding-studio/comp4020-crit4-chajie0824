// Scale + note data for the instrument, tuned to 1=D — the key "山止川行" is
// written in, so playing its own melody sits naturally on the rack.

export type NoteSpec = { deg: number; oct: number };
export type Bell = NoteSpec & { freq: number; index: number };

const DEGREE_SEMITONES: Record<number, number> = { 1: 0, 2: 2, 3: 4, 5: 7, 6: 9, 7: 11 };
const ROOT_D3 = 146.83; // D3

export function freqFor(deg: number, oct: number): number {
  const semis = DEGREE_SEMITONES[deg];
  if (semis === undefined) throw new Error(`bad scale degree ${deg}`);
  return ROOT_D3 * Math.pow(2, oct + semis / 12);
}

// The playable rack (甬钟 tier): a low anchor pair, two full hexatonic
// octaves (do re mi sol la ti — no fa, matching the pentatonic-plus-变宫
// scale real bianzhong ensembles play), and a capstone high tonic.
export const MAIN_SPEC: NoteSpec[] = [
  { deg: 6, oct: -1 },
  { deg: 7, oct: -1 },
  { deg: 1, oct: 0 },
  { deg: 2, oct: 0 },
  { deg: 3, oct: 0 },
  { deg: 5, oct: 0 },
  { deg: 6, oct: 0 },
  { deg: 7, oct: 0 },
  { deg: 1, oct: 1 },
  { deg: 2, oct: 1 },
  { deg: 3, oct: 1 },
  { deg: 5, oct: 1 },
  { deg: 6, oct: 1 },
  { deg: 7, oct: 1 },
  { deg: 1, oct: 2 },
];

export function buildMainBells(): Bell[] {
  return MAIN_SPEC.map((spec, index) => ({ ...spec, index, freq: freqFor(spec.deg, spec.oct) }));
}

export function findBellIndex(bells: Bell[], spec: NoteSpec): number {
  return bells.findIndex((b) => b.deg === spec.deg && b.oct === spec.oct);
}

// The shimmer rack (钮钟 tier): one small bell per scale degree, mounted
// higher and never struck directly — it echoes whichever degree was just
// played, up near the top of the ensemble's range, so the rack reads as a
// real multi-tier set without asking for more hit targets than a hand can use.
export const SHIMMER_DEGREES = [1, 2, 3, 5, 6, 7];
export const SHIMMER_OCT = 3;

// The bracketed instrumental intro of "山止川行" (1=D, 4/4), transcribed as
// the sequence of struck pitches: held notes ("-") and rests ("0") carry no
// new strike, and the recurring pickup figure re-strikes the note it grew out
// of, exactly as a struck bell (it can't be sustained by holding) would. The
// token 8 marks the high tonic reached by the "7 i 7" neighbour-tone figure.
export const SHAN_ZHI_CHUAN_XING: number[] = [
  3, 5,
  5, 6, 6, 6, 7, 6, 5, 6,
  3, 5, 5, 5, 3, 5,
  5, 6, 6, 7, 8, 7, 6, 5,
  3, 3, 5,
  5, 6, 6, 6, 7, 6, 5, 6,
  3, 5, 5, 5, 2, 3,
  2, 1, 6, 2, 3, 5,
  6, 3, 5,
  5, 6, 6, 6, 7, 6, 5, 6,
  3, 5, 2, 5, 3, 3, 5,
  5, 6, 6, 7, 8, 7, 6, 5,
  2, 3, 3, 5,
  5, 6, 6, 6, 7, 6, 5, 6,
  3, 5, 2, 5, 3, 2, 3,
  2, 1, 6, 2, 3, 5,
  5, 6, 6,
];

export function tuneTargetSpec(token: number): NoteSpec {
  return token === 8 ? { deg: 1, oct: 1 } : { deg: token, oct: 0 };
}
