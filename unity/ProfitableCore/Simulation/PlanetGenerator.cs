using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/galaxy/generatePlanet.ts.
public static class PlanetGenerator
{
    private static readonly IReadOnlyList<PlanetType> PlanetTypes = new[]
    {
        PlanetType.Terrestrial, PlanetType.SuperEarth, PlanetType.Neptunian, PlanetType.GasGiant,
    };

    // Random 1-100 through the existing tier breakpoint table via
    // GetTierColor(), never reimplemented.
    public static TierColor RollPlanetTier(RandomFn random)
    {
        var roll = (int)Math.Floor(random() * 100) + 1;
        return TierColorResolver.GetTierColor(roll);
    }

    // "Exact distribution isn't specified... uniform random is the default
    // unless told otherwise."
    public static PlanetType ChoosePlanetType(RandomFn random)
    {
        var index = (int)Math.Floor(random() * PlanetTypes.Count);
        return PlanetTypes[index];
    }

    // Resource-subset selection and the fixed-quality roll both live in
    // PlanetResourceCycle.GenerateResourcesForCycle, called here with
    // cycleIndex 0 for this planet's initial snapshot -- one shared
    // implementation with the live reset-cycle read path, never two copies
    // of the same formula. Tier/type still roll here, on the original seed
    // stream, exactly as before; only the resource subset's own random draw
    // uses its own independently-seeded stream.
    public static Planet Generate(string seed, PlanetPosition position, IReadOnlyList<Resource> resources)
    {
        var random = SeededRandom.Create(seed);

        var tier = RollPlanetTier(random);
        var planetType = ChoosePlanetType(random);
        var id = $"planet-{seed}";

        var cycle = PlanetResourceCycle.GenerateResourcesForCycle(id, tier, planetType, resources, 0);

        return new Planet
        {
            Id = id,
            Name = $"Planet-{seed}", // real name generation deferred, matching the TS source
            PlanetType = planetType,
            Tier = tier,
            Position = position,
            ProducibleResourceIds = cycle.ProducibleResourceIds,
            SpecialtyResourceId = cycle.SpecialtyResourceId,
            ResourceQualities = cycle.ResourceQualities,
            Discovered = false, // starting-planet override is a later agent's job (Sub-Phase A Presentation/Integration)
        };
    }
}
