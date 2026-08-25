import * as THREE from "three";
import { samplesReady, strike } from "./audio.ts";
import {
  buildMainBells,
  findBellIndex,
  isNoteStep,
  SHIMMER_DEGREES,
  SONGS,
  tuneTargetSpec,
  type TuneStep,
} from "./tune.ts";
import { boundsOf, layoutMain, layoutShimmer, type BellVisual } from "./scene.ts";
import {
  applyStrikeGlow,
  bodyHeightFor,
  buildBellGroup,
  createBeam,
  createRenderer,
  createScene,
  createTargetRing,
  loadBodyGeometry,
  positionBeam,
  resizeCamera,
  type Bell3D,
} from "./scene3d.ts";

const stageQuery = document.querySelector<HTMLDivElement>("#stage");
const canvasQuery = document.querySelector<HTMLCanvasElement>("#bells");
const readoutQuery = document.querySelector<HTMLDivElement>("#readout");
const hintToggleQuery = document.querySelector<HTMLButtonElement>("#hintToggle");
const playToggleQuery = document.querySelector<HTMLButtonElement>("#playToggle");
const hintStripQuery = document.querySelector<HTMLDivElement>("#hintStrip");
const hintNextQuery = document.querySelector<HTMLDivElement>("#hintNext");
const songSelectQuery = document.querySelector<HTMLSelectElement>("#songSelect");

if (
  !stageQuery ||
  !canvasQuery ||
  !readoutQuery ||
  !hintToggleQuery ||
  !playToggleQuery ||
  !hintStripQuery ||
  !hintNextQuery ||
  !songSelectQuery
) {
  throw new Error("bianzhong: expected stage markup is missing");
}

// Re-bound with explicit non-null types: TS narrowing from the guard above
// doesn't extend into the closures declared below, so the querySelector
// results have to be given a real non-null type once, here.
const stageEl: HTMLDivElement = stageQuery;
const canvas: HTMLCanvasElement = canvasQuery;
const readout: HTMLDivElement = readoutQuery;
const hintToggle: HTMLButtonElement = hintToggleQuery;
const playToggle: HTMLButtonElement = playToggleQuery;
const hintStrip: HTMLDivElement = hintStripQuery;
const hintNext: HTMLDivElement = hintNextQuery;
const songSelect: HTMLSelectElement = songSelectQuery;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = createRenderer(canvas);
const { scene, camera } = createScene();
const targetRing = createTargetRing();
scene.add(targetRing);
const mainBeam = createBeam();
const shimmerBeam = createBeam();
scene.add(mainBeam, shimmerBeam);

const mainBells = buildMainBells();
let mainVisuals: BellVisual[] = [];
let shimmerVisuals: BellVisual[] = [];
let mainGroups: Bell3D[] = [];
let shimmerGroups: Bell3D[] = [];
let width = 0;
let height = 0;

// The body mesh's geometry is shared across every bell instance (one GLB
// load, reused 21 times), so disposing a bell must not dispose it — only
// the small per-bell parts (cord, handle) actually own their geometry.
let bodyGeometry: THREE.BufferGeometry | null = null;

function disposeBell(b: Bell3D): void {
  scene.remove(b.group);
  b.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.sharedGeometry) obj.geometry.dispose();
  });
  b.material.dispose();
}

function rebuildBells(visuals: BellVisual[], existing: Bell3D[]): Bell3D[] {
  if (!bodyGeometry) return existing;
  existing.forEach(disposeBell);
  return visuals.map((v) => {
    const b = buildBellGroup(v, bodyGeometry as THREE.BufferGeometry);
    scene.add(b.group);
    return b;
  });
}

function resize(): void {
  const rect = stageEl.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  renderer.setSize(width, height, false);
  resizeCamera(camera, width, height);

  const stage = { width, height, mainBeamY: height * 0.24, shimmerBeamY: height * 0.08 };
  mainVisuals = layoutMain(stage, mainBells.length);
  shimmerVisuals = layoutShimmer(stage, SHIMMER_DEGREES.length);
  positionBeam(mainBeam, stage.mainBeamY, width);
  positionBeam(shimmerBeam, stage.shimmerBeamY, width);

  mainGroups = rebuildBells(mainVisuals, mainGroups);
  shimmerGroups = rebuildBells(shimmerVisuals, shimmerGroups);
}

new ResizeObserver(resize).observe(stageEl);
resize();

loadBodyGeometry()
  .then((geometry) => {
    bodyGeometry = geometry;
    resize();
  })
  .catch((err: unknown) => {
    console.error("bianzhong: failed to load the bell model", err);
  });

type ActiveStrike = { t: number };
const mainActive = new Map<number, ActiveStrike[]>();

// Plain letters only, left-to-right matching the bell order — no ";"/"'"
// (their physical position and even presence varies across keyboard
// layouts, so they silently didn't work for some players). One key per
// main bell, so every bell is keyboard-reachable.
const KEYS = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "a", "s", "d", "f", "g", "h", "j"];

const MAX_SPEED = 1.4; // px/ms, clamps velocity mapping

let lastStruck = -1;
let lastPointerTime = 0;
let lastPointerX = 0;
let lastPointerY = 0;

// Tracked on every hover (button up), independent of drag state, so a fresh
// click's velocity can come from how fast the pointer was actually moving
// on approach — like swinging a mallet — instead of a fixed default.
let hoverX = 0;
let hoverY = 0;
let hoverTime = 0;
let hasHover = false;

function hitTestMain(x: number, y: number): number {
  for (let i = 0; i < mainVisuals.length; i++) {
    const b = boundsOf(mainVisuals[i]);
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return i;
  }
  return -1;
}

function blendFor(index: number, x: number): number {
  const v = mainVisuals[index];
  const d = Math.abs(x - v.cx) / (v.r * 1.15);
  return Math.min(1, Math.max(0, d));
}

// Traditional Chinese scale-degree names (gongche/五声 theory), not a direct
// translation of do-re-mi-fa-sol-la-ti. Pinyin alone ("Qingjiao") isn't
// actually recognizable even to a Chinese speaker who knows the core five
// (宫商角徵羽) but not the two added for a full seven-tone scale (清角/变宫)
// — showing the characters themselves plus the solfège equivalent side by
// side is what actually identifies the note, not the romanization alone.
function noteName(deg: number): string {
  const names: Record<number, string> = {
    1: "宫 (Gōng) · Do",
    2: "商 (Shāng) · Re",
    3: "角 (Jué) · Mi",
    4: "清角 (Qīngjiǎo) · Fa",
    5: "徵 (Zhǐ) · Sol",
    6: "羽 (Yǔ) · La",
    7: "变宫 (Biàngōng) · Ti",
  };
  return names[deg] ?? String(deg);
}

// Follow-along ("跟着弹") and auto-play ("播放") share one position in the
// note sequence: playback is just the machine striking the correct bell for
// you on a beat clock, which naturally advances the same counter a real
// strike would.
let currentSong = SONGS[0];
let noteSteps = currentSong.steps.filter(isNoteStep);
let notePosition = 0;
let hintOn = false;
let isPlaying = false;
let playTimer: number | null = null;

function keyLabelForStep(step: Extract<TuneStep, { kind: "note" }>): string {
  const idx = findBellIndex(mainBells, tuneTargetSpec(step, currentSong.baseOct));
  return idx === -1 ? "?" : KEYS[idx].toUpperCase();
}

function updateHintUI(): void {
  const active = hintOn || isPlaying;
  hintStrip.hidden = !active;
  hintNext.hidden = !active;
  if (!active) return;

  hintStrip.innerHTML = "";
  const windowSize = 8;
  for (let i = 0; i < windowSize; i++) {
    const step = noteSteps[(notePosition + i) % noteSteps.length];
    const span = document.createElement("span");
    span.textContent = keyLabelForStep(step);
    if (i === 0) span.className = "current";
    hintStrip.appendChild(span);
  }

  const target = noteSteps[notePosition];
  const octMark = target.octShift > 0 ? " (high)" : target.octShift < 0 ? " (low)" : "";
  hintNext.textContent = `Next: ${noteName(target.deg)}${octMark} · press ${keyLabelForStep(target)} · ${notePosition + 1}/${noteSteps.length}`;
}

function currentHintBellIndex(): number {
  if (!hintOn && !isPlaying) return -1;
  const target = noteSteps[notePosition];
  return findBellIndex(mainBells, tuneTargetSpec(target, currentSong.baseOct));
}

function advanceHint(struckIndex: number): void {
  if (!hintOn && !isPlaying) return;
  if (struckIndex === currentHintBellIndex()) {
    notePosition = (notePosition + 1) % noteSteps.length;
    updateHintUI();
  }
}

hintToggle.addEventListener("click", () => {
  hintOn = !hintOn;
  hintToggle.setAttribute("aria-pressed", String(hintOn));
  if (hintOn && !isPlaying) notePosition = 0;
  updateHintUI();
});

function stopPlayback(): void {
  isPlaying = false;
  if (playTimer !== null) {
    window.clearTimeout(playTimer);
    playTimer = null;
  }
  playToggle.disabled = false;
  playToggle.textContent = `▶ Play "${currentSong.name}"`;
  playToggle.setAttribute("aria-pressed", "false");
  if (!hintOn) notePosition = 0;
  updateHintUI();
}

function stepPlayback(stepIndex: number): void {
  if (!isPlaying) return;
  if (stepIndex >= currentSong.steps.length) {
    stopPlayback();
    return;
  }
  const step = currentSong.steps[stepIndex];
  if (step.kind === "note") {
    const targetIndex = findBellIndex(mainBells, tuneTargetSpec(step, currentSong.baseOct));
    if (targetIndex !== -1) strikeMain(targetIndex, 0.6, 0);
  }
  const beatMs = 60000 / currentSong.bpm;
  playTimer = window.setTimeout(() => stepPlayback(stepIndex + 1), step.beats * beatMs);
}

async function startPlayback(): Promise<void> {
  isPlaying = true;
  playToggle.disabled = true;
  playToggle.textContent = "Loading…";
  // Auto-play fires its first notes within milliseconds, easily racing the
  // sample fetch/decode — wait for it, or an early note plays as a jarring
  // synth fallback instead of the real recording (audible as a wrong-timbre
  // "gong" hit mid-tune, since the other notes are the real thing).
  await samplesReady();
  if (!isPlaying) return; // stopped while loading
  playToggle.disabled = false;
  playToggle.textContent = "⏸ Stop";
  playToggle.setAttribute("aria-pressed", "true");
  notePosition = 0;
  updateHintUI();
  stepPlayback(0);
}

playToggle.addEventListener("click", () => {
  if (isPlaying) stopPlayback();
  else void startPlayback();
});

function selectSong(id: string): void {
  const song = SONGS.find((s) => s.id === id);
  if (!song) return;
  stopPlayback();
  currentSong = song;
  noteSteps = currentSong.steps.filter(isNoteStep);
  notePosition = 0;
  playToggle.textContent = `▶ Play "${currentSong.name}"`;
  updateHintUI();
}

songSelect.addEventListener("change", () => selectSong(songSelect.value));

playToggle.textContent = `▶ Play "${currentSong.name}"`;
updateHintUI();

function strikeMain(index: number, velocity: number, blend: number): void {
  const bell = mainBells[index];
  const visual = mainVisuals[index];
  const pan = (visual.cx / Math.max(1, width)) * 2 - 1;
  strike({ deg: bell.deg, oct: bell.oct, velocity, pan, blend });

  const list = mainActive.get(index) ?? [];
  list.push({ t: performance.now() });
  mainActive.set(index, list);

  const suffix = blend > 0.15 ? "(edge)" : "(center)";
  const octMark = bell.oct > 0 ? " (high)" : bell.oct < 0 ? " (low)" : "";
  readout.textContent = `${noteName(bell.deg)}${octMark} ${suffix} · velocity ${Math.round(velocity * 100)}%`;

  advanceHint(index);
}

function localPoint(ev: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function handlePointerActive(x: number, y: number, fresh: boolean): void {
  const idx = hitTestMain(x, y);
  const now = performance.now();
  if (idx === -1) {
    lastStruck = -1;
    return;
  }
  if (idx === lastStruck && !fresh) return;

  let velocity = 0.55;
  if (fresh) {
    // Approach speed: how fast the pointer was moving in the hover trail
    // leading up to this click, not just whether the click itself was fast.
    const dt = now - hoverTime;
    if (hasHover && dt > 0 && dt < 150) {
      const speed = Math.hypot(x - hoverX, y - hoverY) / dt;
      velocity = Math.min(1, Math.max(0.25, speed / MAX_SPEED));
    }
  } else {
    const dt = now - lastPointerTime;
    if (dt > 0 && dt < 90) {
      const speed = Math.hypot(x - lastPointerX, y - lastPointerY) / dt;
      velocity = Math.min(1, Math.max(0.25, speed / MAX_SPEED));
    }
  }
  strikeMain(idx, velocity, blendFor(idx, x));
  lastStruck = idx;
  lastPointerTime = now;
  lastPointerX = x;
  lastPointerY = y;
}

canvas.addEventListener("pointerdown", (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const { x, y } = localPoint(ev);
  handlePointerActive(x, y, true);
});
canvas.addEventListener("pointermove", (ev) => {
  const { x, y } = localPoint(ev);
  if (ev.buttons === 0) {
    hoverX = x;
    hoverY = y;
    hoverTime = performance.now();
    hasHover = true;
    return;
  }
  handlePointerActive(x, y, false);
});
canvas.addEventListener("pointerup", () => {
  lastStruck = -1;
});
canvas.addEventListener("pointercancel", () => {
  lastStruck = -1;
});
canvas.addEventListener("pointerleave", () => {
  lastStruck = -1;
});

window.addEventListener("keydown", (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const idx = KEYS.indexOf(ev.key.toLowerCase());
  if (idx === -1 || idx >= mainBells.length) return;
  // A bare letter key matching one of ours: claim it outright so nothing
  // else on the page (a focused <select>'s native letter-jump, browser
  // find-as-you-type) can also act on it. This can't do anything about a
  // browser extension intercepting the key before the page ever sees it
  // (Vimium-style bare-letter shortcuts are the usual cause of one specific
  // key silently doing nothing) -- that has to be fixed on that end.
  ev.preventDefault();
  strikeMain(idx, 0.6, 0);
});

function activeGlow(map: Map<number, ActiveStrike[]>, index: number, t: number): number {
  const list = map.get(index);
  if (!list || list.length === 0) return 0;
  let glow = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const age = (t - list[i].t) / 1000;
    if (age > 2) {
      list.splice(i, 1);
      continue;
    }
    glow = Math.max(glow, Math.exp(-age * 0.9));
  }
  return glow;
}

function frame(t: number): void {
  shimmerGroups.forEach((b, i) => {
    const v = shimmerVisuals[i];
    b.group.rotation.z = reduceMotion ? 0 : Math.sin(t / 1300 + v.phase) * 0.01;
  });

  mainGroups.forEach((b, i) => {
    const v = mainVisuals[i];
    b.group.rotation.z = reduceMotion ? 0 : Math.sin(t / 1400 + v.phase) * 0.012;
    applyStrikeGlow(b.material, activeGlow(mainActive, i, t));
  });

  const hintBellIndex = currentHintBellIndex();
  const targetVisual = hintBellIndex !== -1 ? mainVisuals[hintBellIndex] : undefined;
  if (targetVisual) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 220);
    const radius = targetVisual.r * (1.35 + 0.25 * pulse);
    targetRing.visible = true;
    const bodyCenterY = targetVisual.cy + targetVisual.hang + bodyHeightFor(targetVisual.r) * 0.5;
    targetRing.position.set(targetVisual.cx, bodyCenterY, 20);
    targetRing.scale.set(radius, radius, 1);
    (targetRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * pulse;
  } else {
    targetRing.visible = false;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
