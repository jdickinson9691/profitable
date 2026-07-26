import type { RandomFn } from "../data/types/random.ts";

// Phase 2 GDD §2.8 -- galaxy/planet generation is seeded by default,
// consistent with Agent 2's requirement that every random function be
// seedable/deterministic. This is a small, self-contained deterministic
// PRNG (not cryptographic) rather than a new dependency: a string seed is
// hashed to a 32-bit integer (djb2-style), then fed into mulberry32, a
// well-known minimal PRNG. Returns the same RandomFn shape used throughout
// the project (`() => number` in [0, 1)), so it plugs directly into
// rollQuality()/refine()/craft() without any of them knowing a seed was
// ever involved.
function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): RandomFn {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string): RandomFn {
  return mulberry32(hashSeed(seed));
}

// Used only when the caller supplies no seed at all (Phase 2 GDD §2.8: "if
// no seed is supplied, one is generated and stored"). Not itself seeded --
// this is the one place true Math.random() is appropriate, to produce the
// seed that everything downstream then derives from deterministically.
export function generateRandomSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
