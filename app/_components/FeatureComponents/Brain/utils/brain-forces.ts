import type { BrainNode } from "@/app/_types/relations";
import { isItemNode } from "./brain-graph";

interface SimNode extends BrainNode {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

type Force = ((alpha: number) => void) & { initialize: (nodes: SimNode[]) => void };

const AXES = ["x", "y", "z"] as const;
const VELOCITY = { x: "vx", y: "vy", z: "vz" } as const;

const _region = (node: SimNode): string | null =>
  isItemNode(node) ? node.category || null : null;

const _force = (tick: (nodes: SimNode[], alpha: number) => void): Force => {
  let nodes: SimNode[] = [];
  const force = ((alpha: number) => tick(nodes, alpha)) as Force;
  force.initialize = (next) => {
    nodes = next;
  };
  return force;
};

export const regionForce = (strength: number): Force =>
  _force((nodes, alpha) => {
    const centres = new Map<string, { x: number; y: number; z: number; count: number }>();
    nodes.forEach((node) => {
      const region = _region(node);
      if (!region) return;
      const centre = centres.get(region) || { x: 0, y: 0, z: 0, count: 0 };
      centre.x += node.x || 0;
      centre.y += node.y || 0;
      centre.z += node.z || 0;
      centre.count += 1;
      centres.set(region, centre);
    });

    nodes.forEach((node) => {
      const region = _region(node);
      const centre = region ? centres.get(region) : undefined;
      if (!centre || centre.count < 2) return;
      AXES.forEach((axis) => {
        const target = centre[axis] / centre.count;
        const key = VELOCITY[axis];
        node[key] = (node[key] || 0) + (target - (node[axis] || 0)) * strength * alpha;
      });
    });
  });

export const gravityForce = (strength: number): Force =>
  _force((nodes, alpha) => {
    nodes.forEach((node) => {
      AXES.forEach((axis) => {
        const key = VELOCITY[axis];
        node[key] = (node[key] || 0) - (node[axis] || 0) * strength * alpha;
      });
    });
  });

export const spreadRadius = (nodes: SimNode[], share = 0.9): number => {
  const distances = nodes
    .map((node) => Math.hypot(node.x || 0, node.y || 0, node.z || 0))
    .sort((a, b) => a - b);
  if (distances.length === 0) return 0;
  return distances[Math.min(distances.length - 1, Math.floor(distances.length * share))];
};

const _cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export const collideForce = (radiusOf: (node: SimNode) => number, strength = 0.7): Force =>
  _force((nodes) => {
    const reach = nodes.reduce((max, node) => Math.max(max, radiusOf(node)), 1) * 2;
    const grid = new Map<string, SimNode[]>();
    const cell = (value?: number) => Math.floor((value || 0) / reach);

    nodes.forEach((node) => {
      const key = _cellKey(cell(node.x), cell(node.y), cell(node.z));
      const bucket = grid.get(key);
      if (bucket) bucket.push(node);
      else grid.set(key, [node]);
    });

    nodes.forEach((node) => {
      const [cx, cy, cz] = [cell(node.x), cell(node.y), cell(node.z)];
      const mine = radiusOf(node);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            grid.get(_cellKey(cx + dx, cy + dy, cz + dz))?.forEach((other) => {
              if (other === node || other.id > node.id) return;
              const gap = mine + radiusOf(other);
              const x = (node.x || 0) - (other.x || 0);
              const y = (node.y || 0) - (other.y || 0);
              const z = (node.z || 0) - (other.z || 0);
              const distance = Math.hypot(x, y, z) || 0.01;
              if (distance >= gap) return;
              const push = ((gap - distance) / distance) * strength * 0.5;
              node.vx = (node.vx || 0) + x * push;
              node.vy = (node.vy || 0) + y * push;
              other.vx = (other.vx || 0) - x * push;
              other.vy = (other.vy || 0) - y * push;
              if (node.z !== undefined) {
                node.vz = (node.vz || 0) + z * push;
                other.vz = (other.vz || 0) - z * push;
              }
            });
          }
        }
      }
    });
  });
