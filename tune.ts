// Scale + note data for the instrument, tuned to 1=D — the key "山止川行" is
// written in, so playing its own melody sits naturally on the rack.

export type NoteSpec = { deg: number; oct: number };
export type Bell = NoteSpec & { freq: number; index: number };

const DEGREE_SEMITONES: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
const ROOT_D3 = 146.83; // D3

export function freqFor(deg: number, oct: number): number {
  const semis = DEGREE_SEMITONES[deg];
  if (semis === undefined) throw new Error(`bad scale degree ${deg}`);
  return ROOT_D3 * Math.pow(2, oct + semis / 12);
}

// The playable rack (甬钟 tier): a low anchor pair, two full octaves of
// do-re-mi-fa-sol-la-ti, and a capstone high tonic. Fa (4) was added
// alongside 欢乐颂 — real bianzhong repertoire is often pentatonic-plus-变宫
// (no fa), but a plain diatonic tune like this genuinely needs it, and real
// bianzhong sets are documented as capable of full 7-tone melodies too.
export const MAIN_SPEC: NoteSpec[] = [
  { deg: 6, oct: -1 },
  { deg: 7, oct: -1 },
  { deg: 1, oct: 0 },
  { deg: 2, oct: 0 },
  { deg: 3, oct: 0 },
  { deg: 4, oct: 0 },
  { deg: 5, oct: 0 },
  { deg: 6, oct: 0 },
  { deg: 7, oct: 0 },
  { deg: 1, oct: 1 },
  { deg: 2, oct: 1 },
  { deg: 3, oct: 1 },
  { deg: 4, oct: 1 },
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

// Which recorded bianzhong sample plays for each bell, and at what playback
// rate. Every rate here was computed from the exact target/source
// frequencies (12-tone equal temperament, A4=440), not estimated — most are
// 1.0 (a genuine recording of that exact pitch exists); the handful that
// aren't are semitone-close substitutes for eight notes missing from the
// sample set, exactly like a sampled instrument stretches a nearby recording
// across an unsampled key. Files themselves: public/bianzhong/*.mp3, trimmed
// and re-encoded from the "Bian Zhong" sample library (recorded at Wuhan
// Conservatory of Music on a 65-bell Zeng Hou Yi replica; free for
// non-commercial use per its included manual).
export type SampleRef = { file: string; rate: number };

const SAMPLE_TABLE: Record<string, SampleRef> = {
  "6,-1": { file: "a2.mp3", rate: 1.122462 }, // B2, from A2 (+2 semitones)
  "7,-1": { file: "a2.mp3", rate: 1.259921 }, // C#3, from A2 (+4 semitones)
  "1,0": { file: "g3.mp3", rate: 0.749154 }, // D3, from G3 (-5 semitones)
  "2,0": { file: "g3.mp3", rate: 0.840896 }, // E3, from G3 (-3 semitones)
  "3,0": { file: "g3.mp3", rate: 0.943874 }, // F#3, from G3 (-1 semitone)
  "4,0": { file: "g3.mp3", rate: 1 }, // G3, exact
  "5,0": { file: "a3.mp3", rate: 1 },
  "6,0": { file: "b3.mp3", rate: 1 },
  "7,0": { file: "c4.mp3", rate: 1.059463 }, // C#4, from C4 (+1 semitone)
  "1,1": { file: "d4.mp3", rate: 1 },
  "2,1": { file: "e4.mp3", rate: 1 },
  "3,1": { file: "fs4.mp3", rate: 1 },
  "4,1": { file: "g4.mp3", rate: 1 }, // G4, exact
  "5,1": { file: "a4.mp3", rate: 1 },
  "6,1": { file: "b4.mp3", rate: 1 },
  "7,1": { file: "cs5.mp3", rate: 1 },
  "1,2": { file: "d5.mp3", rate: 1 },
  "1,3": { file: "d6.mp3", rate: 1 },
  "2,3": { file: "e6.mp3", rate: 1 },
  "3,3": { file: "fs6.mp3", rate: 1 },
  "5,3": { file: "a6.mp3", rate: 1 },
  "6,3": { file: "c7.mp3", rate: 0.943874 }, // B6, from C7 (-1 semitone)
  "7,3": { file: "d7.mp3", rate: 0.943874 }, // C#7, from D7 (-1 semitone)
};

export function sampleFor(deg: number, oct: number): SampleRef {
  const ref = SAMPLE_TABLE[`${deg},${oct}`];
  if (!ref) throw new Error(`no sample mapped for degree ${deg} octave ${oct}`);
  return ref;
}

// The shimmer rack (钮钟 tier): one small bell per scale degree, mounted
// higher and never struck directly — it echoes whichever degree was just
// played, up near the top of the ensemble's range, so the rack reads as a
// real multi-tier set without asking for more hit targets than a hand can use.
export const SHIMMER_DEGREES = [1, 2, 3, 5, 6, 7];
export const SHIMMER_OCT = 3;

// Jianpu scores, transcribed beat-group by beat-group exactly as each score
// groups them: each space-separated group is one beat, split evenly among
// however many notes share it. "-" holds the previous beat, "0" rests it —
// both are real time, not skipped, which matters for auto-play timing. A
// "." after a digit stretches it by one extra held beat. "^"/"_" immediately
// after a digit mark it an octave up/down from the song's own middle
// register (e.g. "71^7" is the "7 i 7" neighbour-tone figure — a dotted "1"
// over "7"s in the score). Movable-do: degree numbers map onto this
// instrument's own D-rooted scale regardless of the score's stated key, the
// same way a capoed guitar plays a song in a different key than written.

export type TuneStep =
  | { kind: "note"; deg: number; octShift: number; beats: number }
  | { kind: "silence"; beats: number };

function tokenizeGroup(body: string): Array<{ ch: string; octShift: number }> {
  const out: Array<{ ch: string; octShift: number }> = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "^" || c === "_") continue;
    const octShift = body[i + 1] === "^" ? 1 : body[i + 1] === "_" ? -1 : 0;
    out.push({ ch: c, octShift });
  }
  return out;
}

function parseBeatGroup(raw: string): TuneStep[] {
  if (raw === "-" || raw === "0") return [{ kind: "silence", beats: 1 }];

  const extraHold = raw.endsWith(".");
  const body = extraHold ? raw.slice(0, -1) : raw;
  const tokens = tokenizeGroup(body);
  const beats = 1 / tokens.length;

  const steps: TuneStep[] = tokens.map(({ ch, octShift }) =>
    ch === "0" ? { kind: "silence", beats } : { kind: "note", deg: Number(ch), octShift, beats },
  );
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

export function isNoteStep(step: TuneStep): step is Extract<TuneStep, { kind: "note" }> {
  return step.kind === "note";
}

export function tuneTargetSpec(step: Extract<TuneStep, { kind: "note" }>, baseOct: number): NoteSpec {
  return { deg: step.deg, oct: baseOct + step.octShift };
}

export type Song = { id: string; name: string; baseOct: number; steps: TuneStep[] };

// 山止川行 and 天地缓缓 were transcribed here too, but neither could be
// confirmed correct by ear (only 欢乐颂 was) and were dropped rather than
// leave unverified content shipped. Re-add once there's a way to check them.

// 1=C, the only one of the four songs that actually needs fa (4) — the
// reason MAIN_SPEC has it at all. Uses a "34" grace-note figure (two
// sixteenths sharing a beat) in its B phrase; a couple of small sub-digit
// marks in the source under those bars looked like fingering/tuplet
// annotations, not separate pitches, so they aren't transcribed as notes.
const OU_LE_SONG_RAW = `
3 3 4 5
5 4 3 2
1 1 2 3
3 2 2 -
3 3 4 5
5 4 3 2
1 1 2 3
2 1 1 -
2 34 3 1
2 34 3 2
1 2 0 0
3 3 4 5
5 4 3 2
1 1 2 3
2 1 1 -
`;

// 兰亭序's opening vocal hook ("兰亭临帖，行书如行云流水，水月下门，推心
// 细如你脚步") rather than the wordless instrumental intro tried earlier,
// which is why that didn't sound recognizable even if the notes were right.
// Register note: the intro sits a full octave above the score's own written
// pitch (dotted throughout), but the verse drops back to normal register
// for singing — only the two "1"s in the last bar actually carry a dot in
// the source, marked here with "^" rather than shifting baseOct for the
// whole line.
const LAN_TING_XU_RAW = `
0 5 3 5
6 35 65 32
3 - 03 23
1^ 61^ 65 31
`;

export const SONGS: Song[] = [
  { id: "oulesong", name: "欢乐颂", baseOct: 0, steps: parseTune(OU_LE_SONG_RAW) },
  { id: "lantingxu", name: "兰亭序", baseOct: 0, steps: parseTune(LAN_TING_XU_RAW) },
];
