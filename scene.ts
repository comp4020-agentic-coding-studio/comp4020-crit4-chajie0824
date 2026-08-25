// Bell geometry and procedural rendering. Shapes are drawn with Canvas 2D
// bezier curves rather than a 3D model or traced SVG, but every proportion
// below is pulled from real Zeng Hou Yi bianzhong reference: the lens-shaped
// 合瓦形 body (two flared panels meeting at a shallow-notched point, not a
// round bell), the raised 篆带 bands framing rows of 枚 bosses, and the
// handle that tells the two tiers apart — a long standing 甬 rod on the
// heavier, lower, playable bells versus a plain 钮 loop on the small ones.

export type BellKind = "yong" | "niu";

export type BellVisual = {
  cx: number;
  cy: number;
  r: number;
  hang: number;
  kind: BellKind;
  phase: number;
  speckles: Array<{ x: number; y: number; r: number; a: number }>;
};

export type Stage = {
  width: number;
  height: number;
  mainBeamY: number;
  shimmerBeamY: number;
};

function makeSpeckles(r: number): Array<{ x: number; y: number; r: number; a: number }> {
  const out: Array<{ x: number; y: number; r: number; a: number }> = [];
  const count = 5 + Math.floor(r / 6);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + i * 1.37;
    const dist = r * (0.3 + (0.5 * ((i * 53) % 17)) / 17);
    out.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.6,
      r: 1 + ((i * 29) % 5) / 2,
      a: 0.05 + ((i * 13) % 9) / 40,
    });
  }
  return out;
}

export function layoutMain(stage: Stage, count: number): BellVisual[] {
  const marginX = stage.width * 0.06;
  const usable = Math.max(1, stage.width - marginX * 2);
  const bigR = Math.min(stage.height * 0.052, usable / count / 2.1);
  const smallR = bigR * 0.55;
  const out: BellVisual[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const cx = marginX + usable * t;
    const r = bigR + (smallR - bigR) * t;
    const hang = stage.height * 0.1 + Math.sin(i * 0.85) * 16 + i * 1.4;
    out.push({ cx, cy: stage.mainBeamY, r, hang, kind: "yong", phase: i * 0.7, speckles: makeSpeckles(r) });
  }
  return out;
}

export function layoutShimmer(stage: Stage, count: number): BellVisual[] {
  const marginX = stage.width * 0.16;
  const usable = Math.max(1, stage.width - marginX * 2);
  const r = Math.max(6, stage.height * 0.02);
  const out: BellVisual[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const cx = marginX + usable * t;
    const hang = stage.height * 0.05 + Math.sin(i * 1.3) * 6;
    out.push({ cx, cy: stage.shimmerBeamY, r, hang, kind: "niu", phase: i * 1.1, speckles: makeSpeckles(r) });
  }
  return out;
}

export function boundsOf(v: BellVisual): { x0: number; x1: number; y0: number; y1: number } {
  return {
    x0: v.cx - v.r * 1.1,
    x1: v.cx + v.r * 1.1,
    y0: v.cy + v.hang * 0.15,
    y1: v.cy + v.hang + v.r * 0.15,
  };
}

export function drawBeam(ctx: CanvasRenderingContext2D, y: number, width: number): void {
  ctx.fillStyle = "#5a3f24";
  ctx.fillRect(0, y - 6, width, 12);
  ctx.fillStyle = "#2e2115";
  ctx.fillRect(0, y + 6, width, 3);
}

export function drawBell(ctx: CanvasRenderingContext2D, v: BellVisual, angle: number, glow: number): void {
  const r = v.r;
  const bodyTop = v.hang * 0.22;
  const bodyH = v.hang * 0.82;
  const topW = r * 0.62;
  const botW = r;

  ctx.save();
  ctx.translate(v.cx, v.cy);
  ctx.rotate(angle);

  ctx.strokeStyle = "#6b5230";
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, bodyTop);
  ctx.stroke();

  if (v.kind === "yong") {
    ctx.fillStyle = "#8a6636";
    ctx.fillRect(-r * 0.05, -r * 0.5, r * 0.1, r * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.5, r * 0.09, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#a97c3f";
    ctx.fill();
  } else {
    ctx.strokeStyle = "#8a6636";
    ctx.lineWidth = Math.max(1.2, r * 0.06);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.02, r * 0.16, r * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (glow > 0.01) {
    const g = ctx.createRadialGradient(0, bodyTop + bodyH * 0.4, 0, 0, bodyTop + bodyH * 0.4, r * 2.2);
    g.addColorStop(0, `rgba(232,180,99,${0.35 * glow})`);
    g.addColorStop(1, "rgba(232,180,99,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, bodyTop + bodyH * 0.4, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const yTop = bodyTop;
  const yBot = bodyTop + bodyH;
  const yWaist = bodyTop + bodyH * 0.42;
  ctx.beginPath();
  ctx.moveTo(-topW, yTop);
  ctx.bezierCurveTo(-topW * 1.15, yTop + bodyH * 0.25, -botW, yWaist, -botW, yWaist + bodyH * 0.18);
  ctx.bezierCurveTo(-botW * 0.9, yBot - bodyH * 0.06, -botW * 0.32, yBot - r * 0.06, 0, yBot);
  ctx.bezierCurveTo(botW * 0.32, yBot - r * 0.06, botW * 0.9, yBot - bodyH * 0.06, botW, yWaist + bodyH * 0.18);
  ctx.bezierCurveTo(botW, yWaist, topW * 1.15, yTop + bodyH * 0.25, topW, yTop);
  ctx.closePath();

  const grad = ctx.createLinearGradient(-botW, 0, botW, 0);
  grad.addColorStop(0, "#4a3319");
  grad.addColorStop(0.28, "#c79a55");
  grad.addColorStop(0.5, "#a97c3f");
  grad.addColorStop(0.75, "#7a5a30");
  grad.addColorStop(1, "#3a2712");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(30,20,10,0.6)";
  ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.stroke();

  ctx.save();
  ctx.clip();

  ctx.strokeStyle = "rgba(20,14,8,0.35)";
  ctx.lineWidth = Math.max(1, r * 0.03);
  for (const t of [0.3, 0.42, 0.58, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(-botW, yTop + bodyH * t);
    ctx.lineTo(botW, yTop + bodyH * t);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(230,196,140,0.55)";
  for (const rowT of [0.36, 0.5]) {
    const rowY = yTop + bodyH * rowT;
    const halfW = botW * (0.55 + rowT * 0.3) * 0.85;
    const cols = 7;
    for (let i = 0; i < cols; i++) {
      const bx = -halfW + (halfW * 2 * i) / (cols - 1);
      ctx.beginPath();
      ctx.ellipse(bx, rowY, r * 0.05, r * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const s of v.speckles) {
    ctx.fillStyle = `rgba(79,114,102,${s.a})`;
    ctx.beginPath();
    ctx.arc(s.x, bodyTop + bodyH * 0.5 + s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}
