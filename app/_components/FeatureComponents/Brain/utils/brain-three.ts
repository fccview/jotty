import * as THREE from "three";
import type { BrainNode } from "@/app/_types/relations";
import { paintStamp, stampKey, StampInk } from "./brain-glyphs";

export interface PaintTarget {
  body: number;
  ring: number;
  label: number;
}

export interface NodeParts {
  group: THREE.Group;
  body: THREE.Sprite;
  hit: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  crowded: boolean;
  target: PaintTarget;
}

const LABEL_FONT_PX = 40;
const LABEL_PAD_X = 18;
const LABEL_PAD_Y = 10;
const LABEL_MAX_CHARS = 32;
const LABEL_SCREEN_HEIGHT = 0.026;
export const LABEL_PIXEL_SHARE = LABEL_SCREEN_HEIGHT * 1.35;
const LABEL_LIFT = 3;
const RING_TEXTURE_PX = 128;
const STAMP_TEXTURE_PX = 128;
const STAMP_PADDING = 1.25;
const TWEEN_RATE = 0.2;
const SETTLED = 0.004;
const HIT_SCALE = 1.8;
const HIT_MIN_EXTRA = 2.5;
const PICKABLE_OPACITY = 0.3;

const _ignoreRaycast = () => undefined;

const stamps = new Map<string, THREE.CanvasTexture>();

const _stampTexture = (node: BrainNode, ink: StampInk): THREE.CanvasTexture => {
  const key = stampKey(node, ink);
  const cached = stamps.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = STAMP_TEXTURE_PX;
  canvas.height = STAMP_TEXTURE_PX;
  const context = canvas.getContext("2d")!;
  const centre = STAMP_TEXTURE_PX / 2;
  paintStamp(context, node, centre, centre, centre / STAMP_PADDING / 1.16, ink);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  stamps.set(key, texture);
  return texture;
};

export const forgetStamps = () => {
  stamps.forEach((texture) => texture.dispose());
  stamps.clear();
};

const _stampSprite = (node: BrainNode, radius: number, ink: StampInk): THREE.Sprite => {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: _stampTexture(node, ink),
      transparent: true,
      alphaTest: 0.05,
      opacity: 1,
      depthWrite: true,
    }),
  );
  sprite.raycast = _ignoreRaycast;
  sprite.renderOrder = 5;
  const size = radius * 2 * STAMP_PADDING;
  sprite.scale.set(size, size, 1);
  return sprite;
};

const _pill = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const radius = height / 2;
  context.beginPath();
  context.moveTo(radius, 0);
  context.arcTo(width, 0, width, height, radius);
  context.arcTo(width, height, 0, height, radius);
  context.arcTo(0, height, 0, 0, radius);
  context.arcTo(0, 0, width, 0, radius);
  context.closePath();
};

const _sprite = (canvas: HTMLCanvasElement, fixedSize = false): THREE.Sprite => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      sizeAttenuation: !fixedSize,
    }),
  );
  sprite.raycast = _ignoreRaycast;
  sprite.visible = false;
  return sprite;
};

const _labelCanvas = (text: string, ink: string, paper: string, border: string): HTMLCanvasElement => {
  const shown = text.length > LABEL_MAX_CHARS ? `${text.slice(0, LABEL_MAX_CHARS - 1)}…` : text;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  const font = `600 ${LABEL_FONT_PX}px Inter, system-ui, sans-serif`;
  context.font = font;
  canvas.width = Math.ceil(context.measureText(shown).width) + LABEL_PAD_X * 2;
  canvas.height = LABEL_FONT_PX + LABEL_PAD_Y * 2;

  _pill(context, canvas.width, canvas.height);
  context.fillStyle = paper;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = border;
  context.stroke();
  context.font = font;
  context.textBaseline = "middle";
  context.fillStyle = ink;
  context.fillText(shown, LABEL_PAD_X, canvas.height / 2 + 2);
  return canvas;
};

const _labelSprite = (text: string, ink: string, paper: string, border: string): THREE.Sprite => {
  const canvas = _labelCanvas(text, ink, paper, border);
  const sprite = _sprite(canvas, true);
  sprite.renderOrder = 20;
  sprite.center.set(0.5, 0);
  sprite.scale.set((LABEL_SCREEN_HEIGHT * canvas.width) / canvas.height, LABEL_SCREEN_HEIGHT, 1);
  return sprite;
};

const _ringCanvas = (colour: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = RING_TEXTURE_PX;
  canvas.height = RING_TEXTURE_PX;
  const context = canvas.getContext("2d")!;
  context.beginPath();
  context.arc(RING_TEXTURE_PX / 2, RING_TEXTURE_PX / 2, RING_TEXTURE_PX / 2 - 6, 0, Math.PI * 2);
  context.lineWidth = 6;
  context.strokeStyle = colour;
  context.stroke();
  return canvas;
};

const _ringSprite = (colour: string, radius: number): THREE.Sprite => {
  const sprite = _sprite(_ringCanvas(colour));
  sprite.renderOrder = 10;
  sprite.scale.set(radius * 3, radius * 3, 1);
  return sprite;
};

export interface PartColours {
  body: string;
  halo: string;
  edge: string;
  mark: string;
  ink: string;
  paper: string;
  border: string;
}

const _stampInk = (colours: PartColours): StampInk => ({
  fill: colours.body,
  edge: colours.edge,
  mark: colours.mark,
});

export const nodeParts = (node: BrainNode, radius: number, colours: PartColours): NodeParts => {
  const group = new THREE.Group();
  const body = _stampSprite(node, radius, _stampInk(colours));

  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(radius * HIT_SCALE, radius + HIT_MIN_EXTRA), 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );

  hit.userData.nodeId = node.id;

  const ring = _ringSprite(colours.halo, radius);
  const label = _labelSprite(node.title, colours.ink, colours.paper, colours.border);
  label.position.set(0, radius + LABEL_LIFT, 0);

  group.add(body, hit, ring, label);
  return {
    group,
    body,
    hit,
    ring,
    label,
    labelAspect: label.scale.x / label.scale.y,
    crowded: false,
    target: { body: 1, ring: 0, label: 0 },
  };
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export const pickNode = (
  parts: Map<string, NodeParts>,
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
): string | null => {
  pointer.set(ndcX, ndcY);
  raycaster.setFromCamera(pointer, camera);
  const targets = Array.from(parts.values())
    .filter((part) => part.body.material.opacity > PICKABLE_OPACITY)
    .map((part) => part.hit);
  const [first] = raycaster.intersectObjects(targets, false);
  return (first?.object.userData.nodeId as string | undefined) || null;
};

const _swapTexture = (sprite: THREE.Sprite, canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  sprite.material.map?.dispose();
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
};

export const recolourParts = (parts: NodeParts, node: BrainNode, colours: PartColours) => {
  const title = node.title;
  parts.body.material.map = _stampTexture(node, _stampInk(colours));
  parts.body.material.needsUpdate = true;
  _swapTexture(parts.ring, _ringCanvas(colours.halo));
  const canvas = _labelCanvas(title, colours.ink, colours.paper, colours.border);
  _swapTexture(parts.label, canvas);
};

const _toward = (current: number, target: number): [number, boolean] => {
  const next = current + (target - current) * TWEEN_RATE;
  return Math.abs(target - next) < SETTLED ? [target, false] : [next, true];
};

export const tweenParts = (parts: NodeParts): boolean => {
  const [body, bodyMoving] = _toward(parts.body.material.opacity, parts.target.body);
  const [ring, ringMoving] = _toward(parts.ring.material.opacity, parts.target.ring);
  const [label, labelMoving] = _toward(
    parts.label.material.opacity,
    parts.crowded ? 0 : parts.target.label,
  );

  parts.body.material.opacity = body;
  parts.ring.material.opacity = ring;
  parts.ring.visible = ring > SETTLED;
  parts.label.material.opacity = label;
  parts.label.visible = label > SETTLED;

  return bodyMoving || ringMoving || labelMoving;
};

export const disposeParts = (parts: NodeParts) => {
  parts.body.material.dispose();
  parts.hit.geometry.dispose();
  parts.hit.material.dispose();
  [parts.ring, parts.label].forEach((sprite) => {
    sprite.material.map?.dispose();
    sprite.material.dispose();
  });
};
