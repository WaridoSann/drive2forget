export interface BiomeProvider {
  readonly id: string;
  readonly treeDensity: number;
  readonly treeSpecies: readonly string[];
  readonly grassDensity: number;
}
export class ForestBiome implements BiomeProvider {
  readonly id = 'european-forest';
  readonly treeDensity = .9;
  readonly treeSpecies = ['beech', 'birch', 'pine'] as const;
  readonly grassDensity = 4;
}
/** A per-chunk generator means a U-turn reproduces exactly the same scenery. */
export function seededRandom(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let n = t;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
export function chunkSeed(seed: number, index: number) {
  return Math.imul((index ^ seed) >>> 0, 0x45d9f3b) ^ 0x2c9277b5;
}
