import {
  BufferGeometry, Color, CylinderGeometry, DataTexture, DoubleSide, Group, IcosahedronGeometry,
  InstancedMesh, Matrix4, MeshStandardMaterial, PlaneGeometry, Quaternion, RepeatWrapping,
  RGBAFormat, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter, Texture, Vector3, Float32BufferAttribute,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { chunkSeed, seededRandom } from './BiomeProvider';
import { RoadGenerator } from './RoadGenerator';
import { CollisionManager } from './CollisionManager';

const UP = new Vector3(0, 1, 0);
function branch(a: Vector3, b: Vector3, base: number, tip: number) {
  const d = b.clone().sub(a);
  const geometry = new CylinderGeometry(tip, base, d.length(), 7, 1);
  geometry.applyMatrix4(new Matrix4().compose(a.clone().add(b).multiplyScalar(.5),
    new Quaternion().setFromUnitVectors(UP, d.normalize()), new Vector3(1, 1, 1)));
  return geometry;
}
function foliageTexture() {
  const n = 128, pixels = new Uint8Array(n * n * 4);
  const rand = seededRandom(905);
  const leaves = Array.from({ length: 27 }, () => ({
    x: .12 + rand() * .76, y: .08 + rand() * .84,
    a: rand() * Math.PI, w: .042 + rand() * .042, h: .09 + rand() * .052,
    tint: .65 + rand() * .35,
  }));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = (y * n + x) * 4;
    for (const l of leaves) {
      const dx = x / n - l.x, dy = y / n - l.y;
      const u = (dx * Math.cos(l.a) + dy * Math.sin(l.a)) / l.w;
      const v = (-dx * Math.sin(l.a) + dy * Math.cos(l.a)) / l.h;
      if (u * u + v * v < 1) {
        const vein = Math.abs(u) < .05 ? 1.16 : 1;
        const light = l.tint * vein * (.92 + rand() * .16);
        pixels[i] = 103 * light; pixels[i + 1] = 126 * light; pixels[i + 2] = 61 * light;
        pixels[i + 3] = 255;
      }
    }
  }
  const texture = new DataTexture(pixels, n, n, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function barkTexture() {
  const w = 64, h = 128, p = new Uint8Array(w * h * 4);
  const rand = seededRandom(11);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const v = .62 + .15 * Math.sin(x * 1.4 + Math.sin(y * .12)) + rand() * .22;
    p[i] = 88 * v; p[i + 1] = 76 * v; p[i + 2] = 59 * v; p[i + 3] = 255;
  }
  const texture = new DataTexture(p, w, h, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function treeGeometry(species: number) {
  const rand = seededRandom(430 + species);
  const branches: BufferGeometry[] = [], cards: BufferGeometry[] = [];
  const height = species === 2 ? 15 : species === 1 ? 11.8 : 12.8;
  const trunkRadius = species === 1 ? .19 : .27;
  branches.push(branch(new Vector3(), new Vector3(.16, height * .88, -.1), trunkRadius, .055));
  if (species === 2) {
    for (let j = 0; j < 7; j++) for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + j * .8;
      const radius = 3.5 * (1 - j / 9);
      const y = 4 + j * 1.3;
      const end = new Vector3(Math.sin(a) * radius, y - .5, Math.cos(a) * radius);
      branches.push(branch(new Vector3(0, y + .35, 0), end, .065, .012));
      for (let m = 0; m < 3; m++) {
        const g = new PlaneGeometry(2.4 * (1 - j / 12), 1.6);
        g.rotateX(-.4 + rand() * 1.2); g.rotateY(a + m * .65);
        g.translate(end.x * (.55 + m * .14), y + rand() * .3, end.z * (.55 + m * .14));
        cards.push(g);
      }
    }
  } else {
    for (let j = 0; j < 12; j++) {
      const angle = j * 2.399;
      const y = height * (.4 + j / 12 * .39);
      const radius = 2.5 + rand() * 1.15;
      const end = new Vector3(Math.sin(angle) * radius, y + 1.4, Math.cos(angle) * radius);
      branches.push(branch(new Vector3(0, y, 0), end, .09 * (1 - j / 18), .02));
      for (let k = 0; k < 8; k++) {
        const g = new PlaneGeometry(2.6 + rand(), 2.3 + rand());
        g.rotateX(rand() * Math.PI); g.rotateY(rand() * Math.PI); g.rotateZ(rand() * Math.PI);
        g.translate(end.x + (rand() - .5) * 2.2, end.y + (rand() - .5) * 2.5, end.z + (rand() - .5) * 2.2);
        cards.push(g);
      }
    }
  }
  const trunk = mergeGeometries(branches)!;
  const crown = mergeGeometries(cards)!;
  branches.forEach(g => g.dispose()); cards.forEach(g => g.dispose());
  return { trunk, crown };
}
function grassGeometry() {
  const geometries: BufferGeometry[] = [];
  for (let j = 0; j < 5; j++) {
    const h = .32 + (j % 3) * .12, angle = j * 2.399;
    const g = new BufferGeometry();
    const x = Math.sin(angle) * .16, z = Math.cos(angle) * .16;
    g.setAttribute('position', new Float32BufferAttribute([x - .025, 0, z, x + .025, 0, z, x + .08, h, z + .04], 3));
    g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2));
    g.computeVertexNormals(); geometries.push(g);
  }
  const merged = mergeGeometries(geometries)!;
  geometries.forEach(g => g.dispose()); return merged;
}

/** Original development foliage: branched woody geometry + alpha-tested leaf clusters. */
export class VegetationSystem {
  readonly trees = [treeGeometry(0), treeGeometry(1), treeGeometry(2)];
  readonly leafTexture = foliageTexture();
  readonly generatedBark: Texture | undefined;
  readonly barkMaterial: MeshStandardMaterial;
  readonly birchMaterial: MeshStandardMaterial;
  readonly leafMaterial = new MeshStandardMaterial({ map: this.leafTexture, roughness: .95,
    side: DoubleSide, alphaTest: .42, alphaToCoverage: true });
  readonly grassMaterial = new MeshStandardMaterial({ color: '#63694a', roughness: 1, side: DoubleSide });
  readonly stoneMaterial = new MeshStandardMaterial({ color: '#73766c', roughness: 1, flatShading: false });
  readonly grass = grassGeometry();
  readonly stone = new IcosahedronGeometry(1, 1);
  readonly bush: BufferGeometry;
  constructor(readonly seed: number, readonly quality: string, bark?: Texture) {
    this.generatedBark = bark ? undefined : barkTexture();
    this.barkMaterial = new MeshStandardMaterial({ map: bark ?? this.generatedBark, roughness: 1 });
    this.birchMaterial = new MeshStandardMaterial({ map: bark ?? this.generatedBark, color: '#e1dfcd', roughness: 1 });
    this.bush = this.trees[0].crown.clone();
    this.bush.scale(.37, .27, .37); this.bush.translate(0, -2.05, 0);
  }

  createChunk(index: number, start: number, road: RoadGenerator, originZ: number, collisions: CollisionManager) {
    const group = new Group(); group.name = 'vegetation';
    const rand = seededRandom(chunkSeed(this.seed, index));
    const count = this.quality === 'low' ? 44 : 84;
    const speciesInstances: { matrix: Matrix4; color: Color }[][] = [[], [], []];
    const m = new Matrix4(), q = new Quaternion(), scale = new Vector3(), position = new Vector3();
    for (let i = 0; i < count; i++) {
      const s = start + rand() * 96;
      const side = rand() < .5 ? -1 : 1;
      const offset = side * (7.8 + Math.pow(rand(), 1.25) * 60);
      // Keep the opening turnout clear, including the crowns.
      if (s > -14 && s < 32 && side > 0 && offset < 14) continue;
      const c = road.sample(s), x = c.x + offset;
      const y = road.surfaceHeight(x, s);
      const species = Math.floor(rand() * 3);
      const size = .72 + rand() * .54;
      q.setFromAxisAngle(UP, rand() * Math.PI * 2);
      scale.set(size * (.85 + rand() * .3), size, size);
      position.set(x, y - .08, s - start);
      m.compose(position, q, scale);
      speciesInstances[species].push({ matrix: m.clone(), color: new Color().setRGB(.78 + rand() * .22, .85 + rand() * .15, .67 + rand() * .22) });
      if (Math.abs(offset) < 20) collisions.trunk(x, y, s - originZ, species === 1 ? .17 * size : .25 * size);
    }
    for (let j = 0; j < 3; j++) {
      const instances = speciesInstances[j];
      for (const part of ['trunk', 'crown'] as const) {
        const mesh = new InstancedMesh(this.trees[j][part], part === 'trunk' ? j === 1 ? this.birchMaterial : this.barkMaterial : this.leafMaterial, instances.length);
        mesh.name = `tree-${j}-${part}`;
        for (let i = 0; i < instances.length; i++) {
          mesh.setMatrixAt(i, instances[i].matrix);
          if (part === 'crown') mesh.setColorAt(i, instances[i].color);
        }
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.computeBoundingSphere(); group.add(mesh);
      }
    }
    const addScatter = (geometry: BufferGeometry, material: MeshStandardMaterial, count: number, kind: string) => {
      const mesh = new InstancedMesh(geometry, material, count); mesh.name = kind;
      for (let i = 0; i < count; i++) {
        const s = start + rand() * 96, c = road.sample(s);
        const side = rand() < .5 ? -1 : 1;
        let offset = side * (4.3 + rand() * (kind === 'grass' ? 9 : 30));
        if (s > -14 && s < 32 && side > 0 && offset < 10) offset += 9;
        const x = c.x + offset, size = kind === 'rock' ? .15 + rand() * .65 : .65 + rand() * .8;
        position.set(x, road.surfaceHeight(x, s) - (kind === 'rock' ? .07 : .02), s - start);
        q.setFromAxisAngle(UP, rand() * Math.PI * 2);
        scale.set(size, kind === 'rock' ? size * .65 : size, size);
        mesh.setMatrixAt(i, m.compose(position, q, scale));
        mesh.setColorAt(i, new Color().setScalar(.75 + rand() * .3));
      }
      mesh.receiveShadow = true; mesh.castShadow = kind !== 'grass'; mesh.computeBoundingSphere(); group.add(mesh);
    };
    addScatter(this.grass, this.grassMaterial, this.quality === 'low' ? 170 : 400, 'grass');
    addScatter(this.bush, this.leafMaterial, this.quality === 'low' ? 12 : 22, 'bush');
    addScatter(this.stone, this.stoneMaterial, 12, 'rock');
    return group;
  }
  dispose() {
    for (const tree of this.trees) { tree.trunk.dispose(); tree.crown.dispose(); }
    this.bush.dispose(); this.grass.dispose(); this.stone.dispose();
    this.leafTexture.dispose(); this.generatedBark?.dispose();
    this.barkMaterial.dispose(); this.birchMaterial.dispose(); this.leafMaterial.dispose();
    this.grassMaterial.dispose(); this.stoneMaterial.dispose();
  }
}
