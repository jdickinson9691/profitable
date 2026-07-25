import type { RandomFn } from "../../src/data/types/random.ts";

// Yields the given values in order, then throws if called more times than
// values provided -- lets tests pin down the exact random() call sequence
// (e.g. variance roll first, then one refund roll per consumed unit)
// deterministically instead of asserting statistical ranges.
export function queueRandom(values: number[]): RandomFn {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`queueRandom exhausted after ${values.length} calls`);
    }
    return values[index++];
  };
}
