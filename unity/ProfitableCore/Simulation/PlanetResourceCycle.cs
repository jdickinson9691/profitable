using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/galaxy/planetResourceCycle.ts.
public static class PlanetResourceCycle
{
    private const long MsPerHour = 60 * 60 * 1000;

    // Reuses GetCurrentSeason()'s exact technique (src/trading/season.ts,
    // not yet ported -- Sub-Phase B): a seeded phase offset derived from
    // the planet's own id (so planets don't all reset in lockstep),
    // floor-divided into a cycle index. Zero persisted state -- a pure
    // function of (planetId, now).
    public static int GetCycleIndex(string planetId, long nowMs)
    {
        var random = SeededRandom.Create($"{planetId}:resource-cycle-phase");
        var offsetHours = (long)Math.Floor(random() * PlanetResourceCycleConstants.PlanetResourceResetIntervalHours);
        var offsetMs = offsetHours * MsPerHour;
        var intervalMs = (long)PlanetResourceCycleConstants.PlanetResourceResetIntervalHours * MsPerHour;
        return (int)Math.Floor((nowMs + offsetMs) / (double)intervalMs);
    }

    public sealed class ResourcesForCycle
    {
        public List<string> ProducibleResourceIds { get; init; } = new();
        public string? SpecialtyResourceId { get; init; }
        public Dictionary<string, QualityMap> ResourceQualities { get; init; } = new();
    }

    // Factors the subset-selection logic plus the fixed-quality-rolling
    // step into one shared, cycle-parameterized function -- PlanetGenerator
    // calls this with cycleIndex 0 for a planet's initial snapshot, and
    // GetCurrentPlanetResources (below) calls it again with whatever cycle
    // is currently live. One implementation either way, never two copies.
    // Tier, type, and position are NOT re-rolled here -- rolled once on the
    // base seed stream by PlanetGenerator and passed in, permanent for the
    // planet's whole lifetime.
    public static ResourcesForCycle GenerateResourcesForCycle(
        string seed,
        TierColor tier,
        PlanetType planetType,
        IReadOnlyList<Resource> resources,
        int cycleIndex)
    {
        var random = SeededRandom.Create($"{seed}:resources:{cycleIndex}");
        var eligibleResources = ResourceSubsetSelector.GetEligibleResources(planetType, resources);
        if (eligibleResources.Count == 0)
        {
            throw new InvalidOperationException($"no eligible resources for planet type {planetType} in the given catalog");
        }
        var count = ResourceSubsetSelector.ComputeSubsetCount(tier, eligibleResources.Count);
        var selection = ResourceSubsetSelector.SelectResourceSubset(eligibleResources, tier, count, random);

        var resourceQualities = new Dictionary<string, QualityMap>();
        foreach (var id in selection.ProducibleResourceIds)
        {
            var resource = resources.FirstOrDefault(r => r.Id == id);
            if (resource is null) continue;
            resourceQualities[id] = PlanetQualityRoller.RollQualityOnPlanet(resource, tier, selection.SpecialtyResourceId, random);
        }

        return new ResourcesForCycle
        {
            ProducibleResourceIds = selection.ProducibleResourceIds,
            SpecialtyResourceId = selection.SpecialtyResourceId,
            ResourceQualities = resourceQualities,
        };
    }

    // Starting-planet tutorial guarantee. Direct, closed-form override --
    // never a retry-until-valid loop. Reapplied every cycle, including
    // every reset: idempotent, never a one-time bootstrap that could drift
    // away after a reset. Takes its own independent random stream rather
    // than continuing GenerateResourcesForCycle's already-closed-over one.
    private static ResourcesForCycle ApplyTutorialGuarantee(
        ResourcesForCycle baseResources,
        IReadOnlyList<Resource> resources,
        TierColor tier,
        RandomFn random)
    {
        var producibleResourceIds = new List<string>(baseResources.ProducibleResourceIds);
        var resourceQualities = new Dictionary<string, QualityMap>(baseResources.ResourceQualities);

        foreach (var guaranteedId in PlanetResourceCycleConstants.TutorialGuaranteedResourceIds)
        {
            var resource = resources.FirstOrDefault(r => r.Id == guaranteedId);
            if (resource is null) continue; // not in the catalog at all -- nothing to guarantee

            if (!producibleResourceIds.Contains(guaranteedId))
            {
                // Bypasses the normal subset draw for just this slot --
                // added on top of whatever the natural roll produced,
                // never displacing another resource to make room.
                producibleResourceIds.Add(guaranteedId);
                resourceQualities[guaranteedId] = PlanetQualityRoller.RollQualityOnPlanet(
                    resource, tier, baseResources.SpecialtyResourceId, random);
            }

            var roll = resourceQualities[guaranteedId];
            var aggregateTier = AggregateTierResolver.ComputeAggregateTier(roll);
            if (aggregateTier != TierColor.Grey && aggregateTier != TierColor.White)
            {
                var clamped = new QualityMap();
                foreach (var quality in Qualities.All)
                {
                    var value = roll.TryGetValue(quality, out var v) ? v : null;
                    clamped[quality] = value is null ? (int?)null : PlanetResourceCycleConstants.TutorialGuaranteeQualityClamp;
                }
                resourceQualities[guaranteedId] = clamped;
            }
        }

        return new ResourcesForCycle
        {
            ProducibleResourceIds = producibleResourceIds,
            SpecialtyResourceId = baseResources.SpecialtyResourceId,
            ResourceQualities = resourceQualities,
        };
    }

    // The live read path every gameplay caller switches to using INSTEAD OF
    // reading Planet's static fields directly -- those fields on a cached
    // Planet object remain the cycle-0 snapshot only.
    //
    // Colonist-Driven Production (Sub-Phase E, planet-ownership.md): the
    // first check, before anything else runs. Planet.ColonistCount is null
    // for a raw, unmerged Planet -- treated as 0, same as an explicit 0, so
    // an unmerged Planet always reads as ungatherable rather than silently
    // bypassing the gate.
    public static ResourcesForCycle GetCurrentPlanetResources(
        Planet planet,
        IReadOnlyList<Resource> resources,
        long nowMs,
        bool isStartingPlanet = false)
    {
        if ((planet.ColonistCount ?? 0) < PlanetOwnershipConstants.MinimumColonistsToProduce)
        {
            return new ResourcesForCycle();
        }

        if (planet.Tier is null || planet.PlanetType is null)
        {
            throw new InvalidOperationException($"GetCurrentPlanetResources: planet {planet.Id} is missing Tier/PlanetType");
        }

        var cycleIndex = GetCycleIndex(planet.Id, nowMs);
        var baseResources = GenerateResourcesForCycle(planet.Id, planet.Tier.Value, planet.PlanetType.Value, resources, cycleIndex);

        if (!isStartingPlanet)
        {
            return baseResources;
        }

        var random = SeededRandom.Create($"{planet.Id}:resources:{cycleIndex}:tutorial-guarantee");
        return ApplyTutorialGuarantee(baseResources, resources, planet.Tier.Value, random);
    }
}
