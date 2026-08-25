// Real 3D bronze bells. The body is a real 3D-printable bianzhong scan
// (public/models/bianzhong-body.glb — an open-source STL, decimated and
// split down to just the ornate lower body; the plain handle above it is
// still procedural, since a scanned rod would only add file size for
// something a cylinder already does fine). Everything else (cord, handle,
// beam) is simple procedural geometry.
//
// Shading uses MeshMatcapMaterial, not real lights: a matcap only depends on
// each pixel's view-space normal, so the real bosses/relief on the scanned
// body actually read as depth — a flat unlit color would hide them entirely,
// and real lights are what went wrong twice already (near-pure-metal with
// no environment map read as black; the ambient fix for that then washed
// out into a flat grey). A matcap is fully deterministic — one authored
// image, no light/material interaction to get wrong — while still shading
// by normal direction like a real light would.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { BellVisual } from "./scene.ts";

export type Bell3D = {
  group: THREE.Group;
  material: THREE.MeshMatcapMaterial;
};

const STRIKE_GLOW = new THREE.Color(0xffd27a);

function createMatcapTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("bianzhong: could not create the matcap texture");

  const grad = c.createRadialGradient(size * 0.4, size * 0.32, size * 0.03, size * 0.5, size * 0.5, size * 0.5);
  grad.addColorStop(0, "#f3d9a6");
  grad.addColorStop(0.22, "#d9b06c");
  grad.addColorStop(0.5, "#a97c3f");
  grad.addColorStop(0.78, "#5e4322");
  grad.addColorStop(1, "#241708");
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const matcap = createMatcapTexture();
const metalShared = new THREE.MeshMatcapMaterial({ color: 0x8a6636, matcap });

// The scanned body's own bounding box (measured once from the exported
// GLB): half-width and height in its native units, used to scale it
// uniformly to whatever radius a given bell needs.
const BODY_NATIVE_HALF_WIDTH = 0.5287;
const BODY_NATIVE_HEIGHT = 1.2237;
export const BODY_HEIGHT_RATIO = BODY_NATIVE_HEIGHT / BODY_NATIVE_HALF_WIDTH;

export function bodyHeightFor(r: number): number {
  return BODY_HEIGHT_RATIO * r;
}

function findFirstMeshGeometry(root: THREE.Object3D): THREE.BufferGeometry | null {
  let found: THREE.BufferGeometry | null = null;
  root.traverse((obj) => {
    if (!found && obj instanceof THREE.Mesh) found = obj.geometry;
  });
  return found;
}

let bodyGeometryPromise: Promise<THREE.BufferGeometry> | null = null;

export function loadBodyGeometry(): Promise<THREE.BufferGeometry> {
  if (!bodyGeometryPromise) {
    bodyGeometryPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        "./models/bianzhong-body.glb",
        (gltf) => {
          const geometry = findFirstMeshGeometry(gltf.scene);
          if (!geometry) {
            reject(new Error("bianzhong: model file has no mesh"));
            return;
          }
          // Bake the native model's own axes onto ours: its long axis is Z
          // (a 3D-print "up"), the neck (where the handle meets the body)
          // sits at native z=0.89, and it isn't centered in X/depth. After
          // this, local (0,0,0) is the neck and +y runs down through the
          // body, matching where every other bell part already expects it.
          geometry.translate(-0.0438, 0.42, -0.89);
          geometry.rotateX(Math.PI / 2);
          resolve(geometry);
        },
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
  }
  return bodyGeometryPromise;
}

export function buildBellGroup(v: BellVisual, bodyGeometry: THREE.BufferGeometry): Bell3D {
  const group = new THREE.Group();
  group.position.set(v.cx, v.cy, 0);

  const cordR = Math.max(0.6, v.r * 0.025);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(cordR, cordR, v.hang, 6), metalShared);
  cord.position.y = v.hang / 2;
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

  // Base color is white so the matcap shows its natural bronze tone; a
  // strike blends this toward gold (applyStrikeGlow) and resets to white
  // each frame, rather than accumulating.
  const material = new THREE.MeshMatcapMaterial({ color: 0xffffff, matcap });
  const body = new THREE.Mesh(bodyGeometry, material);
  body.userData.sharedGeometry = true; // one GLB load, reused across every bell — never dispose it per-bell
  body.scale.setScalar(v.r / BODY_NATIVE_HALF_WIDTH);
  body.position.y = v.hang;
  group.add(body);

  return { group, material };
}

export function applyStrikeGlow(material: THREE.MeshMatcapMaterial, glow: number): void {
  material.color.setRGB(1, 1, 1).lerp(STRIKE_GLOW, glow * 0.85);
}

export function createBeam(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(4000, 12, 30);
  const material = new THREE.MeshBasicMaterial({ color: 0x5a3f24 });
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
  // No lights: matcap and basic materials both shade without them.
  const scene = new THREE.Scene();

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
