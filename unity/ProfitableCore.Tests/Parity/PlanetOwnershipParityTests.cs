using System.Text.Json;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Parity;

// Agent 60 (Unity Planet Ownership Parity Validation) --
// docs/agents/agent-60-unity-planet-ownership-parity-validation.md.
//
// Reads unity/parity/ts-parity-results.json's Sub-Phase E sections and
// re-runs every case through the C# port, asserting exact equality.
//
// Retroactive removal (2026-08-04): this file used to also cover
// PlanetClaimer.ClaimPlanet()/CitadelBuilder.BuildCitadel() -- both
// removed along with the whole Citadels sub-system, see
// planet-ownership.md's own retroactive note. Colonist-Driven Production
// (ColonistTransporter/PlanetOwnershipMerger) is unaffected.
public class PlanetOwnershipParityTests
{
    private static ParityCorpus LoadCorpus()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Parity", "ts-parity-results.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<ParityCorpus>(json)
            ?? throw new InvalidOperationException("failed to deserialize ts-parity-results.json");
    }

    private static ComponentCategory ParseCategory(string raw) => Enum.Parse<ComponentCategory>(raw, ignoreCase: true);

    private static ShipComponentSlots ToShipComponentSlots(SerializedShipComponentSlots s) => new()
    {
        Weapon = s.Weapon is null ? null : ToShipComponent(s.Weapon),
        Engine = s.Engine is null ? null : ToShipComponent(s.Engine),
        Shield = s.Shield is null ? null : ToShipComponent(s.Shield),
        CargoHold = s.CargoHold is null ? null : ToShipComponent(s.CargoHold),
    };

    private static ShipComponent ToShipComponent(SerializedShipComponent s)
    {
        var map = new QualityMap();
        foreach (var quality in Qualities.All)
        {
            var key = Qualities.ToJsonName(quality);
            map[quality] = s.Qualities.TryGetValue(key, out var v) ? v : null;
        }
        return new ShipComponent { Id = s.Id, Category = ParseCategory(s.Category), Qualities = map, Tier = Enum.Parse<TierColor>(s.Tier) };
    }

    private static Ship ToShip(SerializedShip s) => new()
    {
        Id = s.Id, Name = s.Name, OwnerId = s.OwnerId, Tier = Enum.Parse<TierColor>(s.Tier), CurrentPlanetId = s.CurrentPlanetId,
        FuelCapacity = s.FuelCapacity, CurrentFuel = s.CurrentFuel, Components = ToShipComponentSlots(s.Components), LastRepairedAt = s.LastRepairedAt,
    };

    private static Planet ToPlanetRef(SerializedPlanetRef s) => new() { Id = s.Id, ProducibleResourceIds = new List<string>() };

    private static PlanetOwnershipEntry ToEntry(SerializedPlanetOwnershipEntry s) => new()
    {
        ColonistCount = s.ColonistCount,
    };

    private static void AssertEntryMatches(SerializedPlanetOwnershipEntry expected, PlanetOwnershipEntry actual)
    {
        Assert.Equal(expected.ColonistCount, actual.ColonistCount);
    }

    public static IEnumerable<object[]> TransportColonistsCases() => LoadCorpus().TransportColonistsCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(TransportColonistsCases))]
    public void TransportColonistsMatchesTypeScript(TransportColonistsCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var planet = ToPlanetRef(testCase.Planet);
        var wallet = new Wallet { PlayerId = testCase.Wallet.PlayerId, Credits = testCase.Wallet.Credits };
        var entry = ToEntry(testCase.Entry);

        var result = ColonistTransporter.TransportColonists(ship, planet, testCase.Quantity, wallet, entry);

        Assert.Equal(testCase.ExpectedResult.Success, result.Success);
        if (result is TransportColonistsSucceeded succeeded)
        {
            Assert.Equal(testCase.ExpectedResult.UpdatedWallet!.Credits, succeeded.UpdatedWallet.Credits, precision: 6);
            AssertEntryMatches(testCase.ExpectedResult.UpdatedOwnershipEntry!, succeeded.UpdatedOwnershipEntry);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((TransportColonistsRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> MergePlanetOwnershipCases() => LoadCorpus().MergePlanetOwnershipCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(MergePlanetOwnershipCases))]
    public void MergePlanetOwnershipMatchesTypeScript(MergePlanetOwnershipCase testCase)
    {
        var planet = new Planet { Id = testCase.Planet.Id, Name = testCase.Planet.Name, ProducibleResourceIds = testCase.Planet.ProducibleResourceIds };
        var entry = testCase.Entry is null ? null : ToEntry(testCase.Entry);

        var merged = PlanetOwnershipMerger.MergePlanetOwnership(planet, entry);

        Assert.Equal(testCase.ExpectedResult.ColonistCount, merged.ColonistCount);
    }
}
