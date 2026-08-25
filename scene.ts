// Bell layout and hit-testing, in plain 2D stage coordinates. The bells
// themselves are rendered as real 3D geometry (scene3d.ts), but interaction
// stays 2D: an orthographic camera maps these same cx/cy/r/hang numbers onto
// world space one-to-one, so pointer hit-testing and the corner/centre
// strike blend never need to know a third dimension exists.

export type BellKind = "yong" | "niu";

export type BellVisual = {
  cx: number;
  cy: number;
  r: number;
  hang: number;
  kind: BellKind;
  phase: number;
};

export type Stage = {
  width: number;
  height: number;
  mainBeamY: number;
  shimmerBeamY: number;
};

// Matches scene3d.ts's BODY_HEIGHT_RATIO (the scanned model's real
// height/half-width) — kept as a plain number here rather than an import so
// 2D hit-testing stays independent of the 3D rendering module, per the file
// header above.
const BODY_HEIGHT_RATIO = 2.3145;

export function layoutMain(stage: Stage, count: number): BellVisual[] {
  const marginX = stage.width * 0.06;
  const usable = Math.max(1, stage.width - marginX * 2);
  const bigR = Math.min(stage.height * 0.11, usable / count / 2.1);
  const smallR = bigR * 0.55;
  // Cord length targets the bottom of the stage on average (so the rack
  // still fills the space rather than leaving a dead gap), but varies
  // noticeably per bell rather than lining every bottom edge up neatly —
  // real bianzhong racks hang at uneven heights, not a bottom-aligned row.
  const bottomTarget = stage.height * 0.94;
  const out: BellVisual[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const cx = marginX + usable * t;
    const r = bigR + (smallR - bigR) * t;
    const bodyHeight = BODY_HEIGHT_RATIO * r;
    const baseHang = Math.max(r * 1.5, bottomTarget - stage.mainBeamY - bodyHeight);
    const wobble = Math.sin(i * 0.85) * r * 0.55 + Math.sin(i * 2.3 + 1) * r * 0.3;
    const hang = Math.max(r * 1.2, baseHang + wobble);
    out.push({ cx, cy: stage.mainBeamY, r, hang, kind: "yong", phase: i * 0.7 });
  }
  return out;
}

export function layoutShimmer(stage: Stage, count: number): BellVisual[] {
  const marginX = stage.width * 0.16;
  const usable = Math.max(1, stage.width - marginX * 2);
  const r = Math.max(6, stage.height * 0.035);
  const out: BellVisual[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const cx = marginX + usable * t;
    const hang = r * 2 + Math.sin(i * 1.3) * r * 0.3;
    out.push({ cx, cy: stage.shimmerBeamY, r, hang, kind: "niu", phase: i * 1.1 });
  }
  return out;
}

export function boundsOf(v: BellVisual): { x0: number; x1: number; y0: number; y1: number } {
  // The body itself is compact (real bianzhong proportions, not the tall
  // stylized shape this used to be), so the hit region starts partway up
  // the cord rather than exactly at the body — a natural target size still
  // matters even though the visual body is shorter now.
  return {
    x0: v.cx - v.r * 1.1,
    x1: v.cx + v.r * 1.1,
    y0: v.cy + v.hang * 0.35,
    y1: v.cy + v.hang + BODY_HEIGHT_RATIO * v.r + v.r * 0.2,
  };
}

