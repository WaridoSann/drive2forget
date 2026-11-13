import RAPIER from '@dimforge/rapier3d-compat';
import {
  BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshStandardMaterial,
  Scene, Texture,
} from 'three';
import { RoadGenerator } from './RoadGenerator';
import { TerrainGenerator } from './TerrainGenerator';
import { VegetationSystem } from './VegetationSystem';
import { CollisionManager } from './CollisionManager';
import { ForestBiome, BiomeProvider } from './BiomeProvider';

type PBRTextures = { map: Texture; normalMap: Texture; roughnessMap: Texture };
export type WorldAssets = { asphalt: PBRTextures; ground: PBRTextures; bark?: Texture };
export type WorldChunk = {
  index: number;
  group: Group;
  collider: RAPIER.Collider;
  collisions: CollisionManager;
  dispose(): void;
};

function markingGeometry(road: RoadGenerator, start: number, end: number) {
  const pos: number[] = [], indices: number[] = [];
  const addStrip = (a: number, b: number, offset: number, width: number) => {
    const steps = Math.max(1, Math.ceil((b - a) / 3));
    const base = pos.length / 3;
    for (let i = 0; i <= steps; i++) {
      const s = a + (b - a) * i / steps, c = road.sample(s);
      pos.push(c.x + offset - width / 2, c.y + .008, s - start,
        c.x + offset + width / 2, c.y + .008, s - start);
      if (i < steps) {
        const j = base + i * 2;
        indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
      }
    }
  };
  addStrip(start, end, -3.16, .09); addStrip(start, end, 3.16, .09);
  for (let station = Math.floor(start / 9) * 9; station < end; station += 9) {
    const a = Math.max(start, station), b = Math.min(end, station + 3);
    if (b > a) addStrip(a, b, 0, .1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

/** Bounded deterministic streaming; stationary and reverse travel share the same route. */
export class WorldManager {
  readonly chunkSize = 96;
  readonly road: RoadGenerator;
  readonly terrain: TerrainGenerator;
  readonly vegetation: VegetationSystem;
  readonly biome: BiomeProvider = new ForestBiome();
  readonly chunks = new Map<number, WorldChunk>();
  private originZ = 0;
  private readonly asphaltMaterial: MeshStandardMaterial;
  private readonly groundMaterial: MeshStandardMaterial;
  private readonly markingMaterial = new MeshStandardMaterial({ color: '#e9e5cd', roughness: .93 });

  constructor(private readonly scene: Scene, private readonly physics: RAPIER.World,
    assets: WorldAssets, readonly seed = 42, readonly quality = 'high') {
    this.road = new RoadGenerator(seed);
    this.terrain = new TerrainGenerator(this.road);
    this.vegetation = new VegetationSystem(seed, quality, assets.bark);
    this.asphaltMaterial = new MeshStandardMaterial({ ...assets.asphalt, roughness: .96 });
    this.asphaltMaterial.normalScale.set(.5, .5);
    this.groundMaterial = new MeshStandardMaterial({ ...assets.ground, roughness: 1 });
    this.groundMaterial.normalScale.set(.65, .65);
    for (let i = -2; i <= 3; i++) this.generate(i);
  }
  get chunkCount() { return this.chunks.size; }
  get colliderCount() {
    let count = 0;
    for (const chunk of this.chunks.values()) count += chunk.collisions.colliders.length;
    return count;
  }
  get triangles() {
    let count = 0;
    for (const chunk of this.chunks.values()) chunk.group.traverse(object => {
      if (object instanceof Mesh) {
        const n = (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
        count += n * (object instanceof InstancedMesh ? object.count : 1);
      }
    });
    return count;
  }

  private generate(index: number) {
    const start = index * this.chunkSize, end = start + this.chunkSize;
    const group = new Group(); group.name = `forest-chunk-${index}`;
    group.position.z = start - this.originZ;
    const collisions = new CollisionManager(this.physics);
    const terrain = this.terrain.build(start, end);
    const terrainMesh = new Mesh(terrain.geometry, this.groundMaterial);
    terrainMesh.name = 'terrain'; terrainMesh.receiveShadow = true; group.add(terrainMesh);
    const collider = collisions.terrain(terrain.vertices, terrain.indices, start - this.originZ);
    const roadGeometry = this.road.segmentGeometry(start, end, start);
    // A whole-tile offset prevents large UV floats after many thousands of chunks.
    const roadUV = roadGeometry.getAttribute('uv');
    for (let i = 0; i < roadUV.count; i++) roadUV.setY(i, roadUV.getY(i) - Math.floor(start / 4));
    const roadMesh = new Mesh(roadGeometry, this.asphaltMaterial);
    roadMesh.name = 'road'; roadMesh.receiveShadow = true; group.add(roadMesh);
    collisions.terrain(new Float32Array(roadGeometry.attributes.position.array),
      new Uint32Array(roadGeometry.index!.array), start - this.originZ, 1.08);
    const marks = markingGeometry(this.road, start, end);
    const lineMesh = new Mesh(marks, this.markingMaterial);
    lineMesh.name = 'road-markings'; lineMesh.receiveShadow = true; group.add(lineMesh);
    group.add(this.vegetation.createChunk(index, start, this.road, this.originZ, collisions));
    this.scene.add(group);
    const chunk: WorldChunk = { index, group, collider, collisions, dispose: () => {
      this.scene.remove(group);
      terrain.geometry.dispose(); roadGeometry.dispose(); marks.dispose();
      group.traverse(object => { if (object instanceof InstancedMesh) object.dispose(); });
      collisions.dispose();
      group.clear();
    } };
    this.chunks.set(index, chunk);
  }

  update(globalZ: number, direction: number, originZ: number) {
    if (Math.abs(originZ - this.originZ) > .001) this.rebase(originZ - this.originZ);
    const center = Math.floor(globalZ / this.chunkSize);
    const behind = direction < -.2 ? 6 : 2, ahead = direction < -.2 ? 2 : 6;
    const min = center - behind, max = center + ahead;
    for (const [index, chunk] of this.chunks) {
      if (index < min || index > max) { chunk.dispose(); this.chunks.delete(index); }
    }
    // Prioritise contact under the driver, then the travel direction; one chunk per frame.
    const wanted: number[] = [center];
    for (let distance = 1; distance <= 6; distance++) {
      const first = direction < -.2 ? center - distance : center + distance;
      const second = direction < -.2 ? center + distance : center - distance;
      if (first >= min && first <= max) wanted.push(first);
      if (second >= min && second <= max) wanted.push(second);
    }
    const missing = wanted.find(index => !this.chunks.has(index));
    if (missing !== undefined) this.generate(missing);
  }
  rebase(deltaZ: number) {
    this.originZ += deltaZ;
    for (const chunk of this.chunks.values()) {
      chunk.group.position.z -= deltaZ;
      chunk.collisions.rebase(deltaZ);
    }
  }
  dispose() {
    for (const chunk of this.chunks.values()) chunk.dispose();
    this.chunks.clear();
    this.vegetation.dispose();
    this.asphaltMaterial.dispose(); this.groundMaterial.dispose(); this.markingMaterial.dispose();
  }
}
