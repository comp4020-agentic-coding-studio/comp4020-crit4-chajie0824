import { strike } from "./audio.ts";
import {
  buildMainBells,
  findBellIndex,
  freqFor,
  SHAN_ZHI_CHUAN_XING,
  SHIMMER_DEGREES,
  SHIMMER_OCT,
  tuneTargetSpec,
} from "./tune.ts";
import { boundsOf, drawBeam, drawBell, layoutMain, layoutShimmer, type BellVisual } from "./scene.ts";

const stageQuery = document.querySelector<HTMLDivElement>("#stage");
const canvasQuery = document.querySelector<HTMLCanvasElement>("#bells");
const readoutQuery = document.querySelector<HTMLDivElement>("#readout");
const hintToggleQuery = document.querySelector<HTMLButtonElement>("#hintToggle");
const hintStripQuery = document.querySelector<HTMLDivElement>("#hintStrip");

if (!stageQuery || !canvasQuery || !readoutQuery || !hintToggleQuery || !hintStripQuery) {
  throw new Error("bianzhong: expected stage markup is missing");
}

// Re-bound with explicit non-null types: TS narrowing from the guard above
// doesn't extend into the closures declared below, so the querySelector
// results have to be given a real non-null type once, here.
const stageEl: HTMLDivElement = stageQuery;
const canvas: HTMLCanvasElement = canvasQuery;
const readout: HTMLDivElement = readoutQuery;
const hintToggle: HTMLButtonElement = hintToggleQuery;
const hintStrip: HTMLDivElement = hintStripQuery;

const ctxQuery = canvas.getContext("2d");
if (!ctxQuery) throw new Error("bianzhong: 2d canvas context unavailable");
const ctx: CanvasRenderingContext2D = ctxQuery;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mainBells = buildMainBells();
let mainVisuals: BellVisual[] = [];
let shimmerVisuals: BellVisual[] = [];
let width = 0;
let height = 0;

function resize(): void {
  const rect = stageEl.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stage = { width, height, mainBeamY: height * 0.24, shimmerBeamY: height * 0.08 };
  mainVisuals = layoutMain(stage, mainBells.length);
  shimmerVisuals = layoutShimmer(stage, SHIMMER_DEGREES.length);
}

new ResizeObserver(resize).observe(stageEl);
resize();

type ActiveStrike = { t: number };
const mainActive = new Map<number, ActiveStrike[]>();
const shimmerActive = new Map<number, ActiveStrike[]>();

const CORNER_RATIO = Math.pow(2, 3 / 12); // minor third between 正鼓音 and 侧鼓音
const MAX_SPEED = 1.4; // px/ms, clamps velocity mapping

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

let hintOn = false;
let hintIndex = 0;

function updateHintStrip(): void {
  if (!hintOn) {
    hintStrip.hidden = true;
    return;
  }
  hintStrip.hidden = false;
  hintStrip.innerHTML = "";
  const windowSize = 8;
  for (let i = 0; i < windowSize; i++) {
    const token = SHAN_ZHI_CHUAN_XING[(hintIndex + i) % SHAN_ZHI_CHUAN_XING.length];
    const span = document.createElement("span");
    span.textContent = token === 8 ? "1̇" : String(token);
    if (i === 0) span.className = "current";
    hintStrip.appendChild(span);
  }
}

function currentHintBellIndex(): number {
  if (!hintOn) return -1;
  const token = SHAN_ZHI_CHUAN_XING[hintIndex];
  return findBellIndex(mainBells, tuneTargetSpec(token));
}

function advanceHint(struckIndex: number): void {
  if (!hintOn) return;
  if (struckIndex === currentHintBellIndex()) {
    hintIndex = (hintIndex + 1) % SHAN_ZHI_CHUAN_XING.length;
    updateHintStrip();
  }
}

hintToggle.addEventListener("click", () => {
  hintOn = !hintOn;
  hintToggle.setAttribute("aria-pressed", String(hintOn));
  if (hintOn) hintIndex = 0;
  updateHintStrip();
});
updateHintStrip();

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
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.25,
    0,
    width * 0.5,
    height * 0.25,
    Math.max(width, height) * 0.7,
  );
  bg.addColorStop(0, "#241a10");
  bg.addColorStop(1, "#120e0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (mainVisuals.length) drawBeam(ctx, mainVisuals[0].cy, width);
  if (shimmerVisuals.length) drawBeam(ctx, shimmerVisuals[0].cy, width);

  const hintBellIndex = currentHintBellIndex();

  shimmerVisuals.forEach((v, i) => {
    const sway = reduceMotion ? 0 : Math.sin(t / 1300 + v.phase) * 0.01;
    drawBell(ctx, v, sway, activeGlow(shimmerActive, i, t));
  });

  mainVisuals.forEach((v, i) => {
    const sway = reduceMotion ? 0 : Math.sin(t / 1400 + v.phase) * 0.012;
    const strikeGlow = activeGlow(mainActive, i, t);
    const hintGlow = hintBellIndex === i ? 0.5 + 0.3 * Math.sin(t / 260) : 0;
    drawBell(ctx, v, sway, Math.max(strikeGlow, hintGlow));
  });

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
