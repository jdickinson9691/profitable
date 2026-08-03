using System.Text.Json;
using Profitable.Core.Content;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using ProfitableCore.Tests.Simulation;

namespace ProfitableCore.Tests.Parity;

// Agent 50 (Unity Crew Parity Validation) --
// docs/agents/agent-50-unity-crew-parity-validation.md.
//
// Reads unity/parity/ts-parity-results.json's Sub-Phase C (Crew) sections
// and re-runs every case through the C# port, asserting exact equality --
// the same standard every prior parity agent in this migration has held.
public class CrewParityTests
{
    private static string FixturePath(string fileName) =>
        Path.Combine(AppContext.BaseDirectory, "Fixtures", fileName);

    private static readonly Lazy<LoadedContent> RealContent = new(() =>
        ContentLoader.LoadFromFiles(
            FixturePath("resources.json"),
            FixturePath("recipes.json"),
            FixturePath("refiningRecipes.json"),
            FixturePath("schematics.json"),
            FixturePath("planets.json")));

    private static Resource FindResource(string id) => RealContent.Value.Resources.First(r => r.Id == id);
    private static Recipe FindRecipe(string id) => RealContent.Value.Recipes.First(r => r.Id == id);

    private static ParityCorpus LoadCorpus()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Parity", "ts-parity-results.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<ParityCorpus>(json)
            ?? throw new InvalidOperationException("failed to deserialize ts-parity-results.json");
    }

    private static QualityMap ToQualityMap(Dictionary<string, int?> raw)
    {
        var map = new QualityMap();
        foreach (var quality in Qualities.All)
        {
            var key = Qualities.ToJsonName(quality);
            map[quality] = raw.TryGetValue(key, out var value) ? value : null;
        }
        return map;
    }

    private static void AssertQualitiesMatch(Dictionary<string, int?> expected, QualityMap actual)
    {
        foreach (var quality in Qualities.All)
        {
            var key = Qualities.ToJsonName(quality);
            var expectedValue = expected.TryGetValue(key, out var v) ? v : null;
            var actualValue = actual.TryGetValue(quality, out var av) ? av : null;
            Assert.True(expectedValue == actualValue, $"quality '{key}': expected {expectedValue?.ToString() ?? "null"}, got {actualValue?.ToString() ?? "null"}");
        }
    }

    private static void AssertCraftResultMatches(ExpectedCraftResult expected, CraftResult actual)
    {
        Assert.Equal(expected.Accepted, actual.Accepted);
        if (actual is CraftAccepted accepted)
        {
            Assert.True(expected.Accepted);
            AssertQualitiesMatch(expected.Qualities!, accepted.Qualities);
        }
        else
        {
            var rejected = Assert.IsType<CraftRejected>(actual);
            Assert.Equal(expected.Reason, rejected.Reason);
        }
    }

    private static ResourceInstance ToInstance(SerializedInstance serialized) => new()
    {
        Resource = FindResource(serialized.ResourceId),
        Quantity = serialized.Quantity,
        Qualities = ToQualityMap(serialized.Qualities),
    };

    private static Wallet ToWallet(SerializedWallet serialized) => new() { PlayerId = serialized.PlayerId, Credits = serialized.Credits };

    private static void AssertWalletMatches(SerializedWallet expected, Wallet actual)
    {
        Assert.Equal(expected.PlayerId, actual.PlayerId);
        Assert.Equal(expected.Credits, actual.Credits, precision: 10);
    }

    private static CrewCandidate ToCandidate(SerializedCrewCandidate serialized) => new()
    {
        Id = serialized.Id,
        Tier = Enum.Parse<TierColor>(serialized.Tier),
        Profession = serialized.Profession,
    };

    private static void AssertCandidateMatches(SerializedCrewCandidate expected, CrewCandidate actual)
    {
        Assert.Equal(expected.Id, actual.Id);
        Assert.Equal(expected.Tier, actual.Tier.ToString());
        Assert.Equal(expected.Profession, actual.Profession);
    }

    private static PlanetCrewPool ToPool(SerializedPlanetCrewPool serialized) => new()
    {
        PlanetId = serialized.PlanetId,
        AvailableHires = serialized.AvailableHires.Select(ToCandidate).ToList(),
        LastRefreshedAt = serialized.LastRefreshedAt,
    };

    private static void AssertPoolMatches(SerializedPlanetCrewPool expected, PlanetCrewPool actual)
    {
        Assert.Equal(expected.PlanetId, actual.PlanetId);
        Assert.Equal(expected.LastRefreshedAt, actual.LastRefreshedAt);
        Assert.Equal(expected.AvailableHires.Count, actual.AvailableHires.Count);
        for (var i = 0; i < expected.AvailableHires.Count; i++)
        {
            AssertCandidateMatches(expected.AvailableHires[i], actual.AvailableHires[i]);
        }
    }

    private static CrewCapacity ToCapacity(SerializedCrewCapacity serialized) => new()
    {
        PlayerId = serialized.PlayerId,
        BaseCapacity = serialized.BaseCapacity,
        PurchasedSlots = serialized.PurchasedSlots,
    };

    private static void AssertCapacityMatches(SerializedCrewCapacity expected, CrewCapacity actual)
    {
        Assert.Equal(expected.PlayerId, actual.PlayerId);
        Assert.Equal(expected.BaseCapacity, actual.BaseCapacity);
        Assert.Equal(expected.PurchasedSlots, actual.PurchasedSlots);
    }

    private static CrewStatus ParseStatus(string raw) => raw switch
    {
        "idle" => CrewStatus.Idle,
        "active" => CrewStatus.Active,
        _ => throw new InvalidOperationException($"unknown CrewStatus '{raw}'"),
    };

    private static CrewMember ToCrewMember(SerializedCrewMember serialized) => new()
    {
        Id = serialized.Id,
        HiredByPlayerId = serialized.HiredByPlayerId,
        Tier = Enum.Parse<TierColor>(serialized.Tier),
        Profession = serialized.Profession,
        Status = ParseStatus(serialized.Status),
        AssignedCraftId = serialized.AssignedCraftId,
        HiredAt = serialized.HiredAt,
        LastCheckedAt = serialized.LastCheckedAt,
        WageAmount = serialized.WageAmount,
        LastPaidAt = serialized.LastPaidAt,
        UnavailableUntil = serialized.UnavailableUntil,
        ShipRole = serialized.ShipRole is null ? null : Enum.Parse<ShipCrewRole>(serialized.ShipRole),
        AssignedShipId = serialized.AssignedShipId,
    };

    private static void AssertCrewMemberMatches(SerializedCrewMember expected, CrewMember actual)
    {
        Assert.Equal(expected.Id, actual.Id);
        Assert.Equal(expected.HiredByPlayerId, actual.HiredByPlayerId);
        Assert.Equal(expected.Tier, actual.Tier.ToString());
        Assert.Equal(expected.Profession, actual.Profession);
        Assert.Equal(expected.Status, actual.Status == CrewStatus.Idle ? "idle" : "active");
        Assert.Equal(expected.AssignedCraftId, actual.AssignedCraftId);
        Assert.Equal(expected.HiredAt, actual.HiredAt);
        Assert.Equal(expected.LastCheckedAt, actual.LastCheckedAt);
        Assert.Equal(expected.WageAmount, actual.WageAmount, precision: 10);
        Assert.Equal(expected.LastPaidAt, actual.LastPaidAt);
        Assert.Equal(expected.UnavailableUntil, actual.UnavailableUntil);
        Assert.Equal(expected.AssignedShipId, actual.AssignedShipId);
    }

    public static IEnumerable<object[]> HireCrewCases() =>
        LoadCorpus().HireCrewCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(HireCrewCases))]
    public void HireCrewMatchesTypeScript(HireCrewCase testCase)
    {
        var candidate = ToCandidate(testCase.Candidate);
        var pool = ToPool(testCase.Pool);
        var capacity = ToCapacity(testCase.Capacity);
        var existingCrew = testCase.ExistingCrew.Select(ToCrewMember).ToList();
        var wallet = ToWallet(testCase.Wallet);

        var result = HireCrewSimulation.HireCrew(candidate, pool, capacity, existingCrew, wallet, testCase.PlayerId, testCase.NowMs);

        Assert.Equal(testCase.ExpectedResult.Hired, result.Hired);
        if (result is HireSucceeded succeeded)
        {
            AssertCrewMemberMatches(testCase.ExpectedResult.CrewMember!, succeeded.CrewMember);
            AssertPoolMatches(testCase.ExpectedResult.UpdatedPool!, succeeded.UpdatedPool);
            AssertWalletMatches(testCase.ExpectedResult.UpdatedWallet!, succeeded.UpdatedWallet);
        }
        else
        {
            var rejected = Assert.IsType<HireRejected>(result);
            Assert.Equal(testCase.ExpectedResult.Reason, rejected.Reason);
        }
    }

    public static IEnumerable<object[]> DismissCrewCases() =>
        LoadCorpus().DismissCrewCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(DismissCrewCases))]
    public void DismissCrewMatchesTypeScript(DismissCrewCase testCase)
    {
        var result = DismissCrewSimulation.DismissCrew(ToCrewMember(testCase.CrewMember), testCase.PlayerId);
        Assert.Equal(testCase.ExpectedResult.Dismissed, result.Dismissed);
        Assert.Equal(testCase.ExpectedResult.Reason, result.Reason);
    }

    public static IEnumerable<object[]> PayUpkeepCases() =>
        LoadCorpus().PayUpkeepCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(PayUpkeepCases))]
    public void PayUpkeepMatchesTypeScript(PayUpkeepCase testCase)
    {
        var result = PayUpkeepSimulation.PayUpkeep(ToCrewMember(testCase.CrewMember), ToWallet(testCase.Wallet), testCase.NowMs);
        Assert.Equal(testCase.ExpectedResult.Status, result.Status);
        if (result is PaymentPaid paid)
        {
            AssertCrewMemberMatches(testCase.ExpectedResult.UpdatedCrewMember!, paid.UpdatedCrewMember);
            AssertWalletMatches(testCase.ExpectedResult.UpdatedWallet!, paid.UpdatedWallet);
        }
    }

    public static IEnumerable<object[]> CheckAttritionCases() =>
        LoadCorpus().CheckAttritionCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(CheckAttritionCases))]
    public void CheckAttritionMatchesTypeScript(CheckAttritionCase testCase)
    {
        var result = CheckAttritionSimulation.CheckAttrition(ToCrewMember(testCase.CrewMember), testCase.NowMs);
        Assert.Equal(testCase.ExpectedResult.Departed, result.Departed);
        Assert.Equal(testCase.ExpectedResult.Reason, result.Reason);
    }

    public static IEnumerable<object[]> PurchaseCapacityCases() =>
        LoadCorpus().PurchaseCapacityCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(PurchaseCapacityCases))]
    public void PurchaseCapacityMatchesTypeScript(PurchaseCapacityCase testCase)
    {
        var result = PurchaseCapacitySimulation.PurchaseCapacity(ToCapacity(testCase.Capacity), ToWallet(testCase.Wallet));
        Assert.Equal(testCase.ExpectedResult.Purchased, result.Purchased);
        if (result is PurchaseCapacitySucceeded succeeded)
        {
            AssertCapacityMatches(testCase.ExpectedResult.UpdatedCapacity!, succeeded.UpdatedCapacity);
            AssertWalletMatches(testCase.ExpectedResult.UpdatedWallet!, succeeded.UpdatedWallet);
        }
        else
        {
            var rejected = Assert.IsType<PurchaseCapacityRejected>(result);
            Assert.Equal(testCase.ExpectedResult.Reason, rejected.Reason);
        }
    }

    public static IEnumerable<object[]> RefreshCrewPoolCases() =>
        LoadCorpus().RefreshCrewPoolCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(RefreshCrewPoolCases))]
    public void RefreshCrewPoolMatchesTypeScript(RefreshCrewPoolCase testCase)
    {
        var pool = RefreshCrewPoolSimulation.RefreshCrewPool(testCase.PlanetId, testCase.Seed, testCase.NowMs);
        AssertPoolMatches(testCase.ExpectedResult, pool);
    }

    public static IEnumerable<object[]> AssignToCraftCases() =>
        LoadCorpus().AssignToCraftCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(AssignToCraftCases))]
    public void AssignToCraftMatchesTypeScript(AssignToCraftCase testCase)
    {
        var crewMember = ToCrewMember(testCase.CrewMember);
        var craftAction = new CraftAction
        {
            Id = testCase.CraftAction.Id,
            Inputs = testCase.CraftAction.Inputs.Select(ToInstance).ToList(),
            Recipe = FindRecipe(testCase.CraftAction.RecipeId),
            SchematicTier = Enum.Parse<TierColor>(testCase.CraftAction.SchematicTier),
        };
        var random = TestFixtures.QueueRandom(testCase.RandomSequence.ToArray());

        var result = AssignToCraftSimulation.AssignToCraft(crewMember, craftAction, random);

        Assert.Equal(testCase.ExpectedResult.Assigned, result.Assigned);
        if (result is AssignSucceeded succeeded)
        {
            AssertCrewMemberMatches(testCase.ExpectedResult.UpdatedCrewMember!, succeeded.UpdatedCrewMember);
            AssertCraftResultMatches(testCase.ExpectedResult.CraftResult!, succeeded.CraftResult);
        }
        else
        {
            var rejected = Assert.IsType<AssignRejected>(result);
            Assert.Equal(testCase.ExpectedResult.Reason, rejected.Reason);
        }
    }

    public static IEnumerable<object[]> ResolveBackgroundCraftingCases() =>
        LoadCorpus().ResolveBackgroundCraftingCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(ResolveBackgroundCraftingCases))]
    public void ResolveBackgroundCraftingMatchesTypeScript(ResolveBackgroundCraftingCase testCase)
    {
        var crewMember = ToCrewMember(testCase.CrewMember);
        var craftAction = new CraftAction
        {
            Id = "background-craft-1",
            Inputs = new List<ResourceInstance>
            {
                new() { Resource = FindResource("radiant-alloy-bar"), Quantity = 1, Qualities = new QualityMap { [Quality.Purity] = 60, [Quality.Density] = 60, [Quality.Potency] = 60, [Quality.Durability] = 60, [Quality.Rarity] = 60 } },
                new() { Resource = FindResource("hydrogen-gas"), Quantity = 1, Qualities = new QualityMap { [Quality.Purity] = 60, [Quality.Density] = 60, [Quality.Potency] = 60, [Quality.Durability] = null, [Quality.Rarity] = 60 } },
            },
            Recipe = FindRecipe("ion-forged-hull-plate"),
            SchematicTier = TierColor.Blue,
        };
        var random = TestFixtures.QueueRandom(testCase.RandomSequence.ToArray());
        var maxUnits = testCase.MaxUnits ?? double.PositiveInfinity;

        var result = testCase.BackgroundRateOmitted
            ? ResolveBackgroundCraftingSimulation.ResolveBackgroundCrafting(crewMember, craftAction, testCase.NowMs, random, maxUnits)
            : ResolveBackgroundCraftingSimulation.ResolveBackgroundCrafting(crewMember, craftAction, testCase.NowMs, testCase.BackgroundRate, random, maxUnits);

        Assert.Equal(testCase.ExpectedResult.Resolved, result.Resolved);
        if (result is BackgroundResolved resolved)
        {
            Assert.Equal(testCase.ExpectedResult.UnitsCompleted, resolved.UnitsCompleted);
            Assert.Equal(testCase.ExpectedResult.Results!.Count, resolved.Results.Count);
            for (var i = 0; i < resolved.Results.Count; i++)
            {
                AssertCraftResultMatches(testCase.ExpectedResult.Results[i], resolved.Results[i]);
            }
            AssertCrewMemberMatches(testCase.ExpectedResult.UpdatedCrewMember, resolved.UpdatedCrewMember);
        }
        else
        {
            var unavailable = Assert.IsType<BackgroundRateUnavailable>(result);
            Assert.Equal(testCase.ExpectedResult.Reason, unavailable.Reason);
            AssertCrewMemberMatches(testCase.ExpectedResult.UpdatedCrewMember, unavailable.UpdatedCrewMember);
        }
    }
}
