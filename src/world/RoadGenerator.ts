import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

/** A global, analytic spline-like route. Sampling never depends on visited chunks. */
export class RoadGenerator {
  readonly width = 7;
  readonly step = 3;
  private readonly phase: number;
  constructor(readonly seed = 42) { this.phase = ((seed >>> 0) % 997) / 997 * Math.PI * 2; }

  sample(s: number) {
    const p = this.phase;
    const x = 26 * (Math.sin(s / 390 + p) - Math.sin(p))
      + 8 * (Math.sin(s / 143 + p * 1.7) - Math.sin(p * 1.7));
    const y = 1.3 * (Math.sin(s / 284 + p * .7) - Math.sin(p * .7))
      + .42 * (Math.sin(s / 103 + p) - Math.sin(p));
    const dx = 26 / 390 * Math.cos(s / 390 + p) + 8 / 143 * Math.cos(s / 143 + p * 1.7);
    const dy = 1.3 / 284 * Math.cos(s / 284 + p * .7) + .42 / 103 * Math.cos(s / 103 + p);
    return { x, y, tangent: new Vector3(dx, dy, 1).normalize() };
  }

  surfaceHeight(x: number, s: number) {
    const c = this.sample(s);
    const lateral = Math.abs(x - c.x);
    const edge = Math.max(0, lateral - 5.2);
    const blend = Math.min(1, edge / 13);
    return c.y + blend * (.35 * Math.sin(x * .11 + s * .025 + this.phase)
      + .22 * Math.sin(x * .27 - s * .043) + .5 * Math.sin(s * .008 + x * .025));
  }

  surfaceNormal(x: number, s: number) {
    const e = .02;
    return new Vector3(
      -(this.surfaceHeight(x + e, s) - this.surfaceHeight(x - e, s)) / (2 * e),
      1,
      -(this.surfaceHeight(x, s + e) - this.surfaceHeight(x, s - e)) / (2 * e),
    ).normalize();
  }

  /** Two vertices per cross section; UV station continues through every segment. */
  segmentGeometry(startS: number, endS: number, originZ = 0) {
    const steps = Math.max(1, Math.ceil((endS - startS) / this.step));
    const positions: number[] = [], normals: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const s = startS + (endS - startS) * i / steps;
      const c = this.sample(s);
      for (const side of [-1, 1]) {
        const x = c.x + side * this.width / 2;
        positions.push(x, c.y, s - originZ);
        const n = this.surfaceNormal(x, s);
        normals.push(n.x, n.y, n.z);
        uv.push(side < 0 ? 0 : this.width / 4, s / 4);
      }
      if (i < steps) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}
