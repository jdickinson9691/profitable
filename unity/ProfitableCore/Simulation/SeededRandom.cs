using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/galaxy/seededRandom.ts. A small, self-contained deterministic
// PRNG (not cryptographic): a string seed is hashed to a 32-bit integer
// (djb2-style), then fed into mulberry32, a well-known minimal PRNG.
// Ported bit-for-bit, not re-derived as an "equivalent" algorithm -- every
// seed-reproducibility guarantee in this whole layer (galaxy/planet
// generation, resource cycles) depends on this exact sequence matching the
// TypeScript source for the same seed string.
//
// JavaScript's Math.imul(a, b) is a 32-bit signed integer multiply with
// wraparound -- C#'s `int * int` under `unchecked` produces the identical
// truncated-to-32-bits result, so no re-derivation is needed there.
// JavaScript's `>>>` (unsigned right shift) has no direct C# equivalent on
// `int` without casting through `uint` first -- URShift below does exactly
// that, avoiding any dependency on the C# 11 `>>>` operator (this project
// targets netstandard2.1).
public static class SeededRandom
{
    private static int URShift(int value, int shift) => (int)((uint)value >> shift);

    private static int HashSeed(string seed)
    {
        unchecked
        {
            var hash = 1779033703 ^ seed.Length;
            for (var i = 0; i < seed.Length; i++)
            {
                hash = (hash ^ seed[i]) * unchecked((int)3432918353);
                hash = (hash << 13) | URShift(hash, 19);
            }
            return hash;
        }
    }

    private static RandomFn Mulberry32(int seed)
    {
        var state = seed;
        return () =>
        {
            unchecked
            {
                state = state + 0x6d2b79f5;
                var t = (state ^ URShift(state, 15)) * (1 | state);
                t = (t + (t ^ URShift(t, 7)) * (61 | t)) ^ t;
                var result = t ^ URShift(t, 14);
                return (uint)result / 4294967296.0;
            }
        };
    }

    public static RandomFn Create(string seed) => Mulberry32(HashSeed(seed));

    // Used only when the caller supplies no seed at all -- not itself
    // seeded, this is the one place true non-deterministic randomness is
    // appropriate, to produce the seed everything downstream then derives
    // from deterministically. The TypeScript source formats this as
    // base-36 timestamp/random strings; C# has no built-in base-36
    // conversion, and none is needed -- nothing ever parses this string
    // back for meaning, it only needs to be unique, so a GUID-based format
    // is a safe, idiomatic substitution (a shape change with identical
    // meaning, not a parity-relevant value -- CreateSeededRandom()'s
    // determinism for a GIVEN seed string is what parity actually depends
    // on, never this function's own non-deterministic output).
    public static string GenerateSeed() =>
        $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds():x}-{Guid.NewGuid():N}";
}
