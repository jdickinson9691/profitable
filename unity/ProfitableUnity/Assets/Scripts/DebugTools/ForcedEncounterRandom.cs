using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Unity.DebugTools
{
    // Ports src/presentation/debugForcedRandom.ts's buildForcedEncounterRandom().
    // Debug-only testing shortcut -- NOT a difficulty change, and not a
    // simulation-logic change: ArrivalResolver.ResolveArrival()/
    // EncounterResolver.ResolveEncounters() are untouched. Builds a
    // RandomFn that guarantees the very first encounter-check window
    // triggers (its 1st call) and rolls into `type` (its 2nd call,
    // landing at the midpoint of that type's slice of
    // ShipsAndTravelConfig.EncounterTypeWeights' cumulative range) -- the
    // same two random() calls a natural roll would make to produce that
    // outcome. Every call after the 2nd falls through to real
    // System.Random, so the forced encounter's own inner details (credits
    // granted, which resource, hazard pass roll, opponent threat tier)
    // still roll through the genuine formula, exactly as a
    // naturally-triggered encounter would -- only "does an encounter
    // happen, and which type" is forced, never its content.
    //
    // Reuses ShipsAndTravelConfig.EncounterTypeOrder directly (the same
    // list EncounterResolver's own cumulative-weight roll iterates)
    // rather than re-declaring the order locally the way the TypeScript
    // source has to across its own module boundary -- removes the "must
    // stay in sync with resolveEncounters.ts's TYPE_ORDER" drift risk
    // that file's own comment warns about.
    public static class ForcedEncounterRandom
    {
        private static readonly System.Random SharedRandom = new();

        public static RandomFn Build(EncounterType type)
        {
            var callIndex = 0;
            return () =>
            {
                callIndex++;
                if (callIndex == 1) return 0; // trigger-chance check: always passes
                if (callIndex == 2)
                {
                    double cumulative = 0;
                    foreach (var candidate in ShipsAndTravelConfig.EncounterTypeOrder)
                    {
                        var weight = ShipsAndTravelConfig.EncounterTypeWeights[candidate];
                        if (candidate == type) return cumulative + weight / 2;
                        cumulative += weight;
                    }
                    return cumulative; // unreachable for a valid EncounterType
                }
                return SharedRandom.NextDouble();
            };
        }
    }
}
