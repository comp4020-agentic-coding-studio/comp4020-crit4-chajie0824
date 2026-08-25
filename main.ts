import * as THREE from "three";
import { strike } from "./audio.ts";
import {
  buildMainBells,
  findBellIndex,
  freqFor,
  isNoteStep,
  SHAN_ZHI_CHUAN_XING,
  SHIMMER_DEGREES,
  SHIMMER_OCT,
  tuneTargetSpec,
} from "./tune.ts";
import { boundsOf, layoutMain, layoutShimmer, type BellVisual } from "./scene.ts";
import {
  buildBellGroup,
  createBeam,
  createDetailTexture,
  createRenderer,
  createScene,
  createTargetRing,
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

if (
  !stageQuery ||
  !canvasQuery ||
  !readoutQuery ||
  !hintToggleQuery ||
  !playToggleQuery ||
  !hintStripQuery ||
  !hintNextQuery
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

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = createRenderer(canvas);
const { scene, camera } = createScene();
const detailTexture = createDetailTexture();
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

function disposeBell(b: Bell3D): void {
  scene.remove(b.group);
  b.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.geometry.dispose();
  });
  b.material.dispose();
}

function rebuildBells(visuals: BellVisual[], existing: Bell3D[]): Bell3D[] {
  existing.forEach(disposeBell);
  return visuals.map((v) => {
    const b = buildBellGroup(v, detailTexture);
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

type ActiveStrike = { t: number };
const mainActive = new Map<number, ActiveStrike[]>();
const shimmerActive = new Map<number, ActiveStrike[]>();

const CORNER_RATIO = Math.pow(2, 3 / 12); // minor third between 正鼓音 and 侧鼓音
const MAX_SPEED = 1.4; // px/ms, clamps velocity mapping
const BEAT_MS = 60000 / 92; // ♩=92, as marked on the score

let lastStruck = -1;
let lastPointerTime = 0;
let lastPointerX = 0;
let lastPointerY = 0;

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

function noteName(deg: number): string {
  const names: Record<number, string> = { 1: "宫", 2: "商", 3: "角", 5: "徵", 6: "羽", 7: "变宫" };
  return names[deg] ?? String(deg);
}

// Follow-along ("跟着弹") and auto-play ("播放") share one position in the
// note sequence: playback is just the machine striking the correct bell for
// you on a beat clock, which naturally advances the same counter a real
// strike would.
const noteSteps = SHAN_ZHI_CHUAN_XING.filter(isNoteStep);
let notePosition = 0;
let hintOn = false;
let isPlaying = false;
let playTimer: number | null = null;

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
    span.textContent = step.token === 8 ? "1̇" : String(step.token);
    if (i === 0) span.className = "current";
    hintStrip.appendChild(span);
  }

  const target = noteSteps[notePosition];
  const octLabel = target.token === 8 ? "（高音）" : "";
  hintNext.textContent = `下一步：${noteName(target.token === 8 ? 1 : target.token)}${octLabel} · ${notePosition + 1}/${noteSteps.length}`;
}

function currentHintBellIndex(): number {
  if (!hintOn && !isPlaying) return -1;
  const target = noteSteps[notePosition];
  return findBellIndex(mainBells, tuneTargetSpec(target.token));
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
  playToggle.textContent = "▶ 播放《山止川行》";
  playToggle.setAttribute("aria-pressed", "false");
  if (!hintOn) notePosition = 0;
  updateHintUI();
}

function stepPlayback(stepIndex: number): void {
  if (!isPlaying) return;
  if (stepIndex >= SHAN_ZHI_CHUAN_XING.length) {
    stopPlayback();
    return;
  }
  const step = SHAN_ZHI_CHUAN_XING[stepIndex];
  if (step.kind === "note") {
    const targetIndex = findBellIndex(mainBells, tuneTargetSpec(step.token));
    if (targetIndex !== -1) strikeMain(targetIndex, 0.6, 0);
  }
  playTimer = window.setTimeout(() => stepPlayback(stepIndex + 1), step.beats * BEAT_MS);
}

function startPlayback(): void {
  isPlaying = true;
  playToggle.textContent = "⏸ 停止播放";
  playToggle.setAttribute("aria-pressed", "true");
  notePosition = 0;
  updateHintUI();
  stepPlayback(0);
}

playToggle.addEventListener("click", () => {
  if (isPlaying) stopPlayback();
  else startPlayback();
});

updateHintUI();

function triggerShimmer(deg: number): void {
  const si = SHIMMER_DEGREES.indexOf(deg);
  if (si === -1) return;
  const freq = freqFor(deg, SHIMMER_OCT);
  const visual = shimmerVisuals[si] as BellVisual | undefined;
  const pan = visual ? (visual.cx / Math.max(1, width)) * 2 - 1 : 0;
  const delay = 60 + Math.random() * 90;
  window.setTimeout(() => {
    strike({ freq, velocity: 0.4, pan, gainScale: 0.35, decayScale: 0.6, pitchIndex: 4, pitchCount: 6 });
    const list = shimmerActive.get(si) ?? [];
    list.push({ t: performance.now() });
    shimmerActive.set(si, list);
  }, delay);
}

function strikeMain(index: number, velocity: number, blend: number): void {
  const bell = mainBells[index];
  const visual = mainVisuals[index];
  const freq = bell.freq * (1 + blend * (CORNER_RATIO - 1));
  const pan = (visual.cx / Math.max(1, width)) * 2 - 1;
  strike({ freq, velocity, pan, pitchIndex: index, pitchCount: mainBells.length });

  const list = mainActive.get(index) ?? [];
  list.push({ t: performance.now() });
  mainActive.set(index, list);

  const suffix = blend > 0.15 ? "（侧鼓）" : "（正鼓）";
  const octMark = bell.oct > 0 ? "（高音）" : bell.oct < 0 ? "（低音）" : "";
  readout.textContent = `${noteName(bell.deg)}${octMark} ${suffix} · 力度 ${Math.round(velocity * 100)}%`;

  triggerShimmer(bell.deg);
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

  const dt = now - lastPointerTime;
  let velocity = 0.55;
  if (!fresh && dt > 0 && dt < 90) {
    const dx = x - lastPointerX;
    const dy = y - lastPointerY;
    const speed = Math.hypot(dx, dy) / dt;
    velocity = Math.min(1, Math.max(0.25, speed / MAX_SPEED));
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
  if (ev.buttons === 0) return;
  const { x, y } = localPoint(ev);
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

const KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "z", "x", "c", "v"];

window.addEventListener("keydown", (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const idx = KEYS.indexOf(ev.key.toLowerCase());
  if (idx === -1 || idx >= mainBells.length) return;
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
    b.material.emissiveIntensity = activeGlow(shimmerActive, i, t) * 1.1;
  });

  mainGroups.forEach((b, i) => {
    const v = mainVisuals[i];
    b.group.rotation.z = reduceMotion ? 0 : Math.sin(t / 1400 + v.phase) * 0.012;
    b.material.emissiveIntensity = activeGlow(mainActive, i, t) * 1.1;
  });

  const hintBellIndex = currentHintBellIndex();
  const targetVisual = hintBellIndex !== -1 ? mainVisuals[hintBellIndex] : undefined;
  if (targetVisual) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 220);
    const radius = targetVisual.r * (1.35 + 0.25 * pulse);
    targetRing.visible = true;
    targetRing.position.set(targetVisual.cx, targetVisual.cy + targetVisual.hang * 0.548, 20);
    targetRing.scale.set(radius, radius, 1);
    (targetRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * pulse;
  } else {
    targetRing.visible = false;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
