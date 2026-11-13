import { BufferGeometry, Float32BufferAttribute } from 'three';
import { RoadGenerator } from './RoadGenerator';

export class TerrainGenerator {
  readonly columns = [-160, -85, -55, -32, -18, -10, -5.2, -3.5, 3.5, 5.2, 10, 18, 32, 55, 85, 160];
  constructor(readonly road: RoadGenerator) {}
  build(start: number, end: number) {
    const positions: number[] = [], normals: number[] = [], uv: number[] = [];
    const renderIndices: number[] = [], colliderIndices: number[] = [];
    const rows = Math.ceil((end - start) / this.road.step);
    const cols = this.columns.length;
    for (let i = 0; i <= rows; i++) {
      const s = start + (end - start) * i / rows;
      const c = this.road.sample(s);
      for (let j = 0; j < cols; j++) {
        const x = c.x + this.columns[j];
        const n = this.road.surfaceNormal(x, s);
        positions.push(x, this.road.surfaceHeight(x, s), s - start);
        normals.push(n.x, n.y, n.z);
        uv.push(x / 5, (s - start) / 5 + ((start / 5) % 1));
        if (i < rows && j < cols - 1) {
          const a = i * cols + j;
          const tri = [a, a + cols, a + 1, a + 1, a + cols, a + cols + 1];
          if (j !== 7) colliderIndices.push(...tri);
          if (j !== 7) renderIndices.push(...tri); // Road is a separate PBR surface, no Z-fighting.
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geometry.setIndex(renderIndices);
    geometry.computeBoundingSphere();
    return { geometry, vertices: new Float32Array(positions), indices: new Uint32Array(colliderIndices) };
  }
}
