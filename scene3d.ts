// Real 3D bronze bells: a lens/almond cross-section built by revolving a
// profile curve with THREE.LatheGeometry (a well-tested primitive, unlike a
// hand-authored parametric mesh) and then flattening it front-to-back —
// which gets the vesica-shaped 合瓦 silhouette without hand-rolled geometry
// math. Metalness/roughness plus a baked 篆带/枚/patina detail texture do
// the material work; no environment-map lighting, since real ancient bronze
// reads as weathered and matte, not mirror-polished.

import * as THREE from "three";
import type { BellVisual } from "./scene.ts";

export type Bell3D = {
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
};

const metalShared = new THREE.MeshStandardMaterial({ color: 0x8a6636, metalness: 0.85, roughness: 0.55 });

function bellProfile(r: number, hang: number): THREE.Vector2[] {
  const bodyTop = hang * 0.22;
  const bodyH = hang * 0.82;
  const topW = r * 0.62;
  const botW = r;
  return [
    new THREE.Vector2(Math.max(0.5, topW * 0.94), bodyTop),
    new THREE.Vector2(topW, bodyTop + bodyH * 0.06),
    new THREE.Vector2(topW * 1.08, bodyTop + bodyH * 0.22),
    new THREE.Vector2(botW * 0.94, bodyTop + bodyH * 0.42),
    new THREE.Vector2(botW, bodyTop + bodyH * 0.6),
    new THREE.Vector2(botW * 0.86, bodyTop + bodyH * 0.82),
    new THREE.Vector2(botW * 0.4, bodyTop + bodyH * 0.96),
    new THREE.Vector2(Math.max(0.4, botW * 0.06), bodyTop + bodyH),
  ];
}

export function createDetailTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("bianzhong: could not create the bronze detail texture");

  c.fillStyle = "#c7c2b8";
  c.fillRect(0, 0, size, size);

  c.fillStyle = "rgba(35,28,18,0.3)";
  for (const v of [0.3, 0.335, 0.46, 0.495, 0.62, 0.655]) {
    c.fillRect(0, v * size, size, size * 0.016);
  }

  c.fillStyle = "rgba(255,248,232,0.5)";
  for (const v of [0.38, 0.54]) {
    const cols = 16;
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols;
      c.beginPath();
      c.ellipse(u * size, v * size, size * 0.016, size * 0.012, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  for (let i = 0; i < 1100; i++) {
    const u = (i * 137) % size;
    const v = (i * 71) % size;
    const a = 0.03 + ((i * 13) % 9) / 70;
    c.fillStyle = `rgba(58,88,76,${a})`;
    c.beginPath();
    c.arc(u, v, 1 + ((i * 5) % 3), 0, Math.PI * 2);
    c.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildBellGroup(v: BellVisual, detailMap: THREE.CanvasTexture): Bell3D {
  const group = new THREE.Group();
  group.position.set(v.cx, v.cy, 0);

  const bodyTop = v.hang * 0.22;
  const cordR = Math.max(0.6, v.r * 0.025);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(cordR, cordR, bodyTop, 6), metalShared);
  cord.position.y = bodyTop / 2;
  group.add(cord);

  if (v.kind === "yong") {
    const rodH = v.r * 0.5;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(v.r * 0.05, v.r * 0.05, rodH, 8), metalShared);
    rod.position.y = -rodH / 2;
    group.add(rod);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(v.r * 0.09, 8, 8), metalShared);
    cap.position.y = -rodH;
    group.add(cap);
  } else {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(v.r * 0.15, v.r * 0.045, 8, 16), metalShared);
    loop.rotation.x = Math.PI / 2;
    loop.position.y = v.r * 0.02;
    group.add(loop);
  }

  const bodyGeo = new THREE.LatheGeometry(bellProfile(v.r, v.hang), 28);
  const material = new THREE.MeshStandardMaterial({
    color: 0x9c7a42,
    metalness: 0.82,
    roughness: 0.48,
    map: detailMap,
    emissive: new THREE.Color(0xe8b463),
    emissiveIntensity: 0,
  });
  const body = new THREE.Mesh(bodyGeo, material);
  body.scale.z = 0.42;
  group.add(body);

  return { group, material };
}

export function createBeam(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(4000, 12, 30);
  const material = new THREE.MeshStandardMaterial({ color: 0x5a3f24, roughness: 0.85, metalness: 0.05 });
  return new THREE.Mesh(geometry, material);
}

export function positionBeam(mesh: THREE.Mesh, y: number, width: number): void {
  mesh.position.set(width / 2, y, -20);
}

export function createTargetRing(): THREE.Mesh {
  const geometry = new THREE.RingGeometry(0.8, 1, 48);
  const material = new THREE.MeshBasicMaterial({
    color: 0xe8b463,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  return mesh;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createScene(): { scene: THREE.Scene; camera: THREE.OrthographicCamera } {
  const scene = new THREE.Scene();

  scene.add(new THREE.HemisphereLight(0xf3d9a6, 0x120e0a, 1.15));

  const key = new THREE.DirectionalLight(0xffdca8, 2.4);
  key.position.set(0.4, -0.7, 1);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8fb0c9, 0.6);
  rim.position.set(-0.5, 0.3, -0.8);
  scene.add(rim);

  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 2000);
  camera.position.z = 600;

  return { scene, camera };
}

export function resizeCamera(camera: THREE.OrthographicCamera, width: number, height: number): void {
  camera.left = 0;
  camera.right = width;
  camera.top = 0;
  camera.bottom = height;
  camera.updateProjectionMatrix();
}
