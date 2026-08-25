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

// The bracketed instrumental intro of "山止川行" (1=D, 4/4), transcribed
// beat-group by beat-group exactly as the score groups them: each
// space-separated group is one beat, split evenly among however many digits
// share it. "-" holds the previous beat, "0" rests it — both are real time,
// not skipped, which matters for auto-play timing. A "." after a digit
// stretches it by one extra held beat. Token 8 is the high tonic reached by
// the "7 i 7" neighbour-tone figure (a dotted "1" over "7"s in the score).
const RAW_SCORE = `
3 5
5 6 6 676 56
3 5 5 5 35
56 6 717 65
3 - 0 35
56 6 676 56
35 5 5 23
21 6 235
6 - 0 35
56 6 676 56
35 25 3 35
56 6 717 65
23. 0 35
56 06 676 56
35 25 3 23
21 6 235
566 - -
`;

export type TuneStep = { kind: "note"; token: number; beats: number } | { kind: "silence"; beats: number };

function parseBeatGroup(raw: string): TuneStep[] {
  if (raw === "-" || raw === "0") return [{ kind: "silence", beats: 1 }];

  const extraHold = raw.endsWith(".");
  const body = extraHold ? raw.slice(0, -1) : raw;
  const chars = body.split("");
  const beats = 1 / chars.length;

  const steps: TuneStep[] = chars.map((c, i) => {
    if (c === "0") return { kind: "silence", beats };
    const isHighDo = c === "1" && chars[i - 1] === "7" && chars[i + 1] === "7";
    return { kind: "note", token: isHighDo ? 8 : Number(c), beats };
  });
  if (extraHold) steps.push({ kind: "silence", beats: 1 });
  return steps;
}

function parseTune(raw: string): TuneStep[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(parseBeatGroup);
}

export const SHAN_ZHI_CHUAN_XING: TuneStep[] = parseTune(RAW_SCORE);

export function isNoteStep(step: TuneStep): step is Extract<TuneStep, { kind: "note" }> {
  return step.kind === "note";
}

export function tuneTargetSpec(token: number): NoteSpec {
  return token === 8 ? { deg: 1, oct: 1 } : { deg: token, oct: 0 };
}
