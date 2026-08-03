using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for Migration Phase 2 Sub-Phase A's ported logic --
// agent-39-unity-galaxy-planet-simulation-core.md. Complements
// Parity/GalaxyPlanetParityTests.cs (the stronger, real-content proof);
// these cover specific edge cases constructed by hand, mirroring the
// TypeScript suite's own targeted cases rather than relying solely on
// whatever the parity corpus happened to generate.
public class GalaxyPlanetSimulationTests
{
    private static Resource Resource(string id, string category, int? itemTier = null) => new()
    {
        Id = id,
        Name = id,
        Category = category,
        ItemTier = itemTier,
        ApplicableQualities = Qualities.All.ToDictionary(q => q, _ => true),
    };

    [Fact]
    public void SeededRandom_SameSeedProducesIdenticalSequence()
    {
        var a = SeededRandom.Create("determinism-check");
        var b = SeededRandom.Create("determinism-check");
        for (var i = 0; i < 20; i++)
        {
            Assert.Equal(a(), b());
        }
    }

    [Fact]
    public void GalaxyGenerator_SameSeedProducesIdenticalGalaxy()
    {
        // Needs at least one eligible resource per broad category (Solid/
        // Gas/Crystal) so every possible rolled PlanetType has something
        // to draw from -- a narrower fixture would intermittently throw
        // depending on which PlanetType the seed happens to roll.
        var resources = new List<Resource>
        {
            Resource("igneous-ore", "Solid", 1),
            Resource("hydrogen-gas", "Gas", 1),
            Resource("autunite-crystal", "Crystal", 1),
        };
        var galaxyA = GalaxyGenerator.Generate(5, resources, "regression-check-seed");
        var galaxyB = GalaxyGenerator.Generate(5, resources, "regression-check-seed");

        Assert.Equal(galaxyA.Planets.Count, galaxyB.Planets.Count);
        for (var i = 0; i < galaxyA.Planets.Count; i++)
        {
            Assert.Equal(galaxyA.Planets[i].Id, galaxyB.Planets[i].Id);
            Assert.Equal(galaxyA.Planets[i].Tier, galaxyB.Planets[i].Tier);
            Assert.Equal(galaxyA.Planets[i].Position!.X, galaxyB.Planets[i].Position!.X);
            Assert.Equal(galaxyA.Planets[i].Position!.Y, galaxyB.Planets[i].Position!.Y);
        }
    }

    [Fact]
    public void ResourceSubsetSelector_GetEligibleResources_ExcludesItemTierAboveOne()
    {
        // The real bug-fix case: a refined/crafted resource whose own
        // id-as-category string happens to contain a broad category
        // substring must still be excluded via the ItemTier requirement.
        var resources = new List<Resource>
        {
            Resource("raw-crystal-ore", "Crystal", 1),
            Resource("master-crystal-array", "master-crystal-array", 3), // self-referential category, ItemTier 3
        };
        var eligible = ResourceSubsetSelector.GetEligibleResources(PlanetType.Terrestrial, resources);
        Assert.Single(eligible);
        Assert.Equal("raw-crystal-ore", eligible[0].Id);
    }

    [Fact]
    public void ResourceSubsetSelector_GetEligibleResources_MissingItemTierDefaultsToOne()
    {
        var resources = new List<Resource> { Resource("igneous-ore", "Solid", itemTier: null) };
        var eligible = ResourceSubsetSelector.GetEligibleResources(PlanetType.Terrestrial, resources);
        Assert.Single(eligible);
    }

    [Fact]
    public void ResourceSubsetSelector_ComputeSubsetCount_AppliesTheMaxOneFloor()
    {
        // Grey tier: 0.2 * 1 eligible = 0.2, ceil = 1, max(1, 1) = 1 -- the
        // floor matters when eligibleCount is small enough that percentage
        // * count would otherwise round to 0.
        Assert.Equal(1, ResourceSubsetSelector.ComputeSubsetCount(TierColor.Grey, 1));
    }

    [Fact]
    public void ResourceSubsetSelector_SelectResourceSubset_GreyTierNeverGetsASpecialty()
    {
        var resources = Enumerable.Range(0, 5).Select(i => Resource($"r{i}", "Solid", 1)).ToList<Resource>();
        var random = SeededRandom.Create("grey-no-specialty");
        var selection = ResourceSubsetSelector.SelectResourceSubset(resources, TierColor.Grey, 3, random);
        Assert.Null(selection.SpecialtyResourceId);
        Assert.Equal(3, selection.ProducibleResourceIds.Count);
    }

    [Fact]
    public void ResourceSubsetSelector_SelectResourceSubset_WhiteTierAndAboveReservesASpecialtySlot()
    {
        var resources = Enumerable.Range(0, 5).Select(i => Resource($"r{i}", "Solid", 1)).ToList<Resource>();
        var random = SeededRandom.Create("white-has-specialty");
        var selection = ResourceSubsetSelector.SelectResourceSubset(resources, TierColor.White, 3, random);
        Assert.NotNull(selection.SpecialtyResourceId);
        // The specialty slot doesn't inflate the count.
        Assert.Equal(3, selection.ProducibleResourceIds.Count);
        Assert.Contains(selection.SpecialtyResourceId, selection.ProducibleResourceIds);
    }

    [Fact]
    public void PlanetQualityRoller_NoModifierWhenTierIsNull()
    {
        var resource = Resource("igneous-ore", "Solid", 1);
        var random = SeededRandom.Create("no-tier-modifier");
        var roll = PlanetQualityRoller.RollQualityOnPlanet(resource, null, null, random);
        // Every value stays within the base 1-100 range unmodified --
        // can't assert an exact value without duplicating RollQuality's
        // own roll, but every value must be in-range.
        foreach (var quality in Qualities.All)
        {
            Assert.InRange(roll[quality]!.Value, 1, 100);
        }
    }

    [Fact]
    public void PlanetQualityRoller_SpecialtyModifierStacksWithTierModifier()
    {
        var resource = Resource("igneous-ore", "Solid", 1);
        // Same seed for both calls -- the only difference is whether this
        // resource is the planet's specialty, isolating the specialty
        // modifier's own additive effect.
        var withoutSpecialty = PlanetQualityRoller.RollQualityOnPlanet(resource, TierColor.Green, null, SeededRandom.Create("specialty-stack"));
        var withSpecialty = PlanetQualityRoller.RollQualityOnPlanet(resource, TierColor.Green, "igneous-ore", SeededRandom.Create("specialty-stack"));

        foreach (var quality in Qualities.All)
        {
            var baseValue = withoutSpecialty[quality]!.Value;
            var specialtyValue = withSpecialty[quality]!.Value;
            // Specialty adds +15, clamped at 100 -- either the full +15
            // difference, or clamped to exactly 100 if the base value was
            // already close to the ceiling.
            Assert.True(specialtyValue == Math.Min(100, baseValue + 15), $"{quality}: base={baseValue}, specialty={specialtyValue}");
        }
    }

    [Fact]
    public void AggregateTierResolver_ReturnsNullWhenEveryQualityIsNull()
    {
        var qualities = new QualityMap();
        foreach (var q in Qualities.All) qualities[q] = null;
        Assert.Null(AggregateTierResolver.ComputeAggregateTier(qualities));
    }

    [Fact]
    public void AggregateTierResolver_AveragesOnlyNonNullQualities()
    {
        var qualities = new QualityMap { [Quality.Purity] = 80, [Quality.Density] = 80, [Quality.Potency] = null, [Quality.Durability] = null, [Quality.Rarity] = null };
        // Average of {80, 80} = 80 -> Blue tier (per the real breakpoint table).
        var tier = AggregateTierResolver.ComputeAggregateTier(qualities);
        Assert.Equal(TierColorResolver.GetTierColor(80), tier);
    }

    [Fact]
    public void PlanetResourceCycle_GetCurrentPlanetResources_ColonistGateBlocksBelowThreshold()
    {
        var resources = new List<Resource> { Resource("igneous-ore", "Solid", 1) };
        var planet = new Planet
        {
            Id = "gate-test",
            Name = "Gate Test",
            ProducibleResourceIds = new List<string>(),
            Tier = TierColor.Grey,
            PlanetType = PlanetType.Terrestrial,
            ColonistCount = 0,
        };
        var result = PlanetResourceCycle.GetCurrentPlanetResources(planet, resources, 0);
        Assert.Empty(result.ProducibleResourceIds);
        Assert.Null(result.SpecialtyResourceId);
        Assert.Empty(result.ResourceQualities);
    }

    [Fact]
    public void PlanetResourceCycle_GetCurrentPlanetResources_ThrowsWhenColonizedButMissingTierOrPlanetType()
    {
        var resources = new List<Resource> { Resource("igneous-ore", "Solid", 1) };
        var planet = new Planet
        {
            Id = "missing-tier-test",
            Name = "Missing Tier Test",
            ProducibleResourceIds = new List<string>(),
            ColonistCount = 100, // above threshold, so the throw path is actually reached
        };
        Assert.Throws<InvalidOperationException>(() => PlanetResourceCycle.GetCurrentPlanetResources(planet, resources, 0));
    }

    [Fact]
    public void PlanetResourceCycle_GenerateResourcesForCycle_ThrowsWhenNoEligibleResourcesExist()
    {
        var resources = new List<Resource> { Resource("hydrogen-gas", "Gas", 1) }; // no Solid/Crystal for Terrestrial
        Assert.Throws<InvalidOperationException>(() =>
            PlanetResourceCycle.GenerateResourcesForCycle("empty-pool-test", TierColor.Grey, PlanetType.Terrestrial, resources, 0));
    }
}
