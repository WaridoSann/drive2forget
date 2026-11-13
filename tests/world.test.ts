import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { BufferGeometry, InstancedMesh, Mesh, Scene, Texture } from 'three';
import { RoadGenerator } from '../src/world/RoadGenerator';
import { WorldManager } from '../src/world/WorldManager';

beforeAll(async () => { await RAPIER.init(); });

const created: Array<{ manager: WorldManager; physics: RAPIER.World }> = [];
afterEach(() => {
  for (const { manager, physics } of created.splice(0)) {
    manager.dispose();
    physics.free();
  }
});

function makeWorld() {
  const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const scene = new Scene();
  const material = { map: new Texture(), normalMap: new Texture(), roughnessMap: new Texture() };
  const manager = new WorldManager(scene, physics, { asphalt: material, ground: material }, 42, 'low');
  created.push({ manager, physics });
  return { manager, physics, scene };
}

function settle(manager: WorldManager, z: number, direction = 1, origin = 0) {
  // Streaming intentionally budgets at most one chunk per frame.
  for (let frame = 0; frame < 16; frame++) manager.update(z, direction, origin);
}

function row(geometry: BufferGeometry, which: 'first' | 'last', attribute: string) {
  const attr = geometry.getAttribute(attribute);
  const start = which === 'first' ? 0 : attr.count - 2;
  return Array.from({ length: attr.itemSize * 2 }, (_, i) => attr.array[start * attr.itemSize + i]);
}

function signature(group: import('three').Group) {
  const out: number[] = [];
  group.traverse(object => {
    if (object instanceof Mesh) {
      const positions = object.geometry.getAttribute('position');
      out.push(positions.count, ...Array.from(positions.array.slice(0, 24), Number));
      if (object instanceof InstancedMesh) out.push(object.count, ...Array.from(object.instanceMatrix.array.slice(0, 64)));
    }
  });
  return out;
}

describe('deterministic continuous road', () => {
  it('reproduces a seed across negative and very large distances', () => {
    const road = new RoadGenerator(42);
    const again = new RoadGenerator(42);
    const other = new RoadGenerator(73);
    let distinct = false;
    for (const s of [-100000, -192, -0.01, 0, 96, 961.25, 1000000]) {
      const first = road.sample(s);
      const second = again.sample(s);
      expect(first.x).toBe(second.x);
      expect(first.y).toBe(second.y);
      expect(first.tangent.toArray()).toEqual(second.tangent.toArray());
      expect(first.tangent.length()).toBeCloseTo(1, 6);
      expect(Number.isFinite(first.x + first.y)).toBe(true);
      distinct ||= first.x !== other.sample(s).x || first.y !== other.sample(s).y;
    }
    expect(distinct).toBe(true);
  });

  it('has smooth tangents and shared road position, normal and texture coordinates at chunk boundaries', () => {
    const road = new RoadGenerator(42);
    for (const boundary of [-96, 0, 96, 96000]) {
      const left = road.segmentGeometry(boundary - 96, boundary);
      const right = road.segmentGeometry(boundary, boundary + 96);
      try {
        for (const attr of ['position', 'normal', 'uv']) {
          const end = row(left, 'last', attr);
          const start = row(right, 'first', attr);
          expect(end).toHaveLength(start.length);
          end.forEach((value, i) => expect(value).toBeCloseTo(start[i], 5));
        }
        expect(road.sample(boundary - 0.001).tangent.distanceTo(road.sample(boundary + 0.001).tangent)).toBeLessThan(0.0001);
      } finally { left.dispose(); right.dispose(); }
    }
  });

  it('keeps the driven road surface aligned with the analytic surface height', () => {
    const road = new RoadGenerator(42);
    for (const s of [-96, 0, 8, 96, 923]) {
      const center = road.sample(s);
      for (const lateral of [-3.4, 0, 3.4]) {
        expect(road.surfaceHeight(center.x + lateral, s)).toBeCloseTo(center.y, 5);
      }
    }
  });
});

describe('bounded reversible streaming', () => {
  it('releases chunks and physics colliders, then rebuilds the same visited forest', () => {
    const { manager, physics } = makeWorld();
    settle(manager, 0);
    const start = manager.chunks.get(0);
    expect(start).toBeDefined();
    const original = signature(start!.group);
    expect(manager.chunkCount).toBeGreaterThanOrEqual(5);
    expect(manager.chunkCount).toBeLessThanOrEqual(12);
    expect(physics.colliders.len()).toBe(manager.colliderCount);

    for (const s of [480, 960, 1440, 1920]) {
      settle(manager, s);
      expect(manager.chunkCount).toBeLessThanOrEqual(12);
      expect(physics.colliders.len()).toBe(manager.colliderCount);
    }
    expect(manager.chunks.has(0)).toBe(false);
    settle(manager, 0, -1);
    const returned = manager.chunks.get(0);
    expect(returned).toBeDefined();
    expect(signature(returned!.group)).toEqual(original);
    expect(manager.chunkCount).toBeLessThanOrEqual(12);
  });

  it('provides physical support on the asphalt and parking shoulder at shared segment edges', () => {
    const { manager, physics } = makeWorld();
    settle(manager, 0);
    physics.step(); // Refresh Rapier's broad phase after collider insertion.
    for (const s of [-96, 0, 9, 96]) {
      const sample = manager.road.sample(s);
      for (const lateral of [-3, 0, 3, 4.4]) {
        const ray = new RAPIER.Ray({ x: sample.x + lateral, y: sample.y + 5, z: s }, { x: 0, y: -1, z: 0 });
        const hit = physics.castRay(ray, 10, false);
        expect(hit).not.toBeNull();
        expect(5 - hit!.timeOfImpact).toBeCloseTo(0, 3);
      }
    }
  });

  it('rebases rendered geometry and collider positions by the same amount', () => {
    const { manager, physics } = makeWorld();
    settle(manager, 0);
    const chunk = manager.chunks.get(0)!;
    const beforeVisual = chunk.group.position.z;
    const beforePhysics = chunk.collider.translation().z;
    manager.rebase(1536);
    expect(chunk.group.position.z).toBeCloseTo(beforeVisual - 1536, 5);
    expect(chunk.collider.translation().z).toBeCloseTo(beforePhysics - 1536, 5);
    manager.update(0, 1, 1536);
    expect(physics.colliders.len()).toBe(manager.colliderCount);
  });

  it('disposes scene chunks and all owned colliders', () => {
    const { manager, physics, scene } = makeWorld();
    settle(manager, 0);
    manager.dispose();
    expect(manager.chunkCount).toBe(0);
    expect(manager.colliderCount).toBe(0);
    expect(physics.colliders.len()).toBe(0);
    expect(scene.children).toHaveLength(0);
  });
});
