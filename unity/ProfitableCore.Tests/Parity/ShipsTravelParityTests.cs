using System.Text.Json;
using Profitable.Core.Content;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using ProfitableCore.Tests.Simulation;

namespace ProfitableCore.Tests.Parity;

// Agent 55 (Unity Ships & Travel Parity Validation) --
// docs/agents/agent-55-unity-ships-travel-parity-validation.md.
//
// Reads unity/parity/ts-parity-results.json's Sub-Phase D sections and
// re-runs every case through the C# port, asserting exact equality --
// the same standard every prior parity agent in this migration has held.
public class ShipsTravelParityTests
{
    private static string FixturePath(string fileName) =>
        Path.Combine(AppContext.BaseDirectory, "Fixtures", fileName);

    private static readonly Lazy<List<Resource>> RealResources = new(() =>
        ContentLoader.LoadFromFiles(
            FixturePath("resources.json"), FixturePath("recipes.json"), FixturePath("refiningRecipes.json"),
            FixturePath("schematics.json"), FixturePath("planets.json")).Resources);

    private static Resource FindResource(string id) => RealResources.Value.First(r => r.Id == id);

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

    // ComponentCategory's real JSON values are camelCase ("weapon",
    // "cargoHold") -- case-insensitive parse matches the real content,
    // same reasoning ShipsContentLoader's own parse already documents.
    private static ComponentCategory ParseCategory(string raw) => Enum.Parse<ComponentCategory>(raw, ignoreCase: true);

    private static ShipCrewRole ParseShipCrewRole(string raw) => raw switch
    {
        "Pilot" => ShipCrewRole.Pilot,
        "Combat Engineer" => ShipCrewRole.CombatEngineer,
        "Science Officer" => ShipCrewRole.ScienceOfficer,
        "Systems Engineer" => ShipCrewRole.SystemsEngineer,
        "Crafter" => ShipCrewRole.Crafter,
        _ => throw new InvalidOperationException($"unknown ShipCrewRole '{raw}'"),
    };

    private static CombatTriggerContext ParseTriggerContext(string raw) => raw switch
    {
        "travel" => CombatTriggerContext.Travel,
        "arrival" => CombatTriggerContext.Arrival,
        _ => throw new InvalidOperationException($"unknown CombatTriggerContext '{raw}'"),
    };

    private static CombatStatus ParseCombatStatus(string raw) => raw switch
    {
        "pending" => CombatStatus.Pending,
        "resolved" => CombatStatus.Resolved,
        _ => throw new InvalidOperationException($"unknown CombatStatus '{raw}'"),
    };

    private static CombatOutcome? ParseCombatOutcome(string? raw) => raw switch
    {
        null => null,
        "win" => CombatOutcome.Win,
        "lose" => CombatOutcome.Lose,
        "flee" => CombatOutcome.Flee,
        _ => throw new InvalidOperationException($"unknown CombatOutcome '{raw}'"),
    };

    private static CrewStatus ParseCrewStatus(string raw) => raw switch
    {
        "idle" => CrewStatus.Idle,
        "active" => CrewStatus.Active,
        _ => throw new InvalidOperationException($"unknown CrewStatus '{raw}'"),
    };

    private static CrewMember ToCrewMember(SerializedCrewMember s) => new()
    {
        Id = s.Id, HiredByPlayerId = s.HiredByPlayerId, Tier = Enum.Parse<TierColor>(s.Tier), Profession = s.Profession,
        Status = ParseCrewStatus(s.Status), AssignedCraftId = s.AssignedCraftId, HiredAt = s.HiredAt,
        LastCheckedAt = s.LastCheckedAt, WageAmount = s.WageAmount, LastPaidAt = s.LastPaidAt,
        UnavailableUntil = s.UnavailableUntil, ShipRole = s.ShipRole is null ? null : ParseShipCrewRole(s.ShipRole),
        AssignedShipId = s.AssignedShipId,
    };

    private static void AssertCrewMemberMatches(SerializedCrewMember expected, CrewMember actual)
    {
        Assert.Equal(expected.Id, actual.Id);
        Assert.Equal(expected.Tier, actual.Tier.ToString());
        Assert.Equal(expected.Profession, actual.Profession);
        Assert.Equal(expected.Status, actual.Status == CrewStatus.Idle ? "idle" : "active");
        Assert.Equal(expected.WageAmount, actual.WageAmount, precision: 6);
        Assert.Equal(expected.LastPaidAt, actual.LastPaidAt);
        Assert.Equal(expected.UnavailableUntil, actual.UnavailableUntil);
        Assert.Equal(expected.ShipRole, actual.ShipRole is null ? null : actual.ShipRole switch
        {
            ShipCrewRole.Pilot => "Pilot", ShipCrewRole.CombatEngineer => "Combat Engineer",
            ShipCrewRole.ScienceOfficer => "Science Officer", ShipCrewRole.SystemsEngineer => "Systems Engineer",
            ShipCrewRole.Crafter => "Crafter", _ => throw new InvalidOperationException(),
        });
        Assert.Equal(expected.AssignedShipId, actual.AssignedShipId);
    }

    private static ShipComponent ToShipComponent(SerializedShipComponent s) => new()
    {
        Id = s.Id, Category = ParseCategory(s.Category), Qualities = ToQualityMap(s.Qualities), Tier = Enum.Parse<TierColor>(s.Tier),
    };

    private static ShipComponentSlots ToShipComponentSlots(SerializedShipComponentSlots s) => new()
    {
        Weapon = s.Weapon is null ? null : ToShipComponent(s.Weapon),
        Engine = s.Engine is null ? null : ToShipComponent(s.Engine),
        Shield = s.Shield is null ? null : ToShipComponent(s.Shield),
        CargoHold = s.CargoHold is null ? null : ToShipComponent(s.CargoHold),
    };

    private static Ship ToShip(SerializedShip s) => new()
    {
        Id = s.Id, Name = s.Name, OwnerId = s.OwnerId, Tier = Enum.Parse<TierColor>(s.Tier), CurrentPlanetId = s.CurrentPlanetId,
        FuelCapacity = s.FuelCapacity, CurrentFuel = s.CurrentFuel, Components = ToShipComponentSlots(s.Components), LastRepairedAt = s.LastRepairedAt,
    };

    private static void AssertShipMatches(SerializedShip expected, Ship actual)
    {
        Assert.Equal(expected.Id, actual.Id);
        Assert.Equal(expected.Tier, actual.Tier.ToString());
        Assert.Equal(expected.CurrentPlanetId, actual.CurrentPlanetId);
        Assert.Equal(expected.FuelCapacity, actual.FuelCapacity, precision: 6);
        Assert.Equal(expected.CurrentFuel, actual.CurrentFuel, precision: 6);
        Assert.Equal(expected.LastRepairedAt, actual.LastRepairedAt);
        AssertComponentSlotsMatch(expected.Components, actual.Components);
    }

    private static void AssertComponentSlotsMatch(SerializedShipComponentSlots expected, ShipComponentSlots actual)
    {
        AssertComponentMatches(expected.Weapon, actual.Weapon);
        AssertComponentMatches(expected.Engine, actual.Engine);
        AssertComponentMatches(expected.Shield, actual.Shield);
        AssertComponentMatches(expected.CargoHold, actual.CargoHold);
    }

    private static void AssertComponentMatches(SerializedShipComponent? expected, ShipComponent? actual)
    {
        if (expected is null) { Assert.Null(actual); return; }
        Assert.NotNull(actual);
        Assert.Equal(expected.Tier, actual!.Tier.ToString());
        AssertQualitiesMatch(expected.Qualities, actual.Qualities);
    }

    private static Planet ToPlanetRef(SerializedPlanetRef s) => new()
    {
        Id = s.Id,
        Position = s.Position is null ? null : new PlanetPosition { X = s.Position.X, Y = s.Position.Y },
        Discovered = s.Discovered,
        ProducibleResourceIds = new List<string>(),
    };

    private static Planet ToPlanetRefWithResources(SerializedPlanetRefWithResources s) => new()
    {
        Id = s.Id, ProducibleResourceIds = s.ProducibleResourceIds,
    };

    private static Voyage ToVoyage(SerializedVoyage s) => new()
    {
        Id = s.Id, ShipId = s.ShipId, OriginPlanetId = s.OriginPlanetId, DestinationPlanetId = s.DestinationPlanetId,
        DepartedAt = s.DepartedAt, ArrivesAt = s.ArrivesAt,
        Cargo = s.Cargo.Select(c => new VoyageCargoItem { ItemId = c.ItemId, Quantity = c.Quantity }).ToList(),
        IsRetreat = s.IsRetreat,
    };

    private static void AssertVoyageMatches(SerializedVoyage expected, Voyage actual)
    {
        Assert.Equal(expected.Id, actual.Id);
        Assert.Equal(expected.ShipId, actual.ShipId);
        Assert.Equal(expected.OriginPlanetId, actual.OriginPlanetId);
        Assert.Equal(expected.DestinationPlanetId, actual.DestinationPlanetId);
        Assert.Equal(expected.DepartedAt, actual.DepartedAt);
        Assert.Equal(expected.ArrivesAt, actual.ArrivesAt, precision: 6);
        Assert.Equal(expected.IsRetreat, actual.IsRetreat);
    }

    public static IEnumerable<object[]> CalculateDistanceCases() => LoadCorpus().CalculateDistanceCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(CalculateDistanceCases))]
    public void CalculateDistanceMatchesTypeScript(CalculateDistanceCase testCase)
    {
        var a = new PlanetPosition { X = testCase.A.X, Y = testCase.A.Y };
        var b = new PlanetPosition { X = testCase.B.X, Y = testCase.B.Y };
        Assert.Equal(testCase.ExpectedDistance, DistanceCalculator.CalculateDistance(a, b), precision: 10);
    }

    public static IEnumerable<object[]> CalculateTravelTimeCases() => LoadCorpus().CalculateTravelTimeCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(CalculateTravelTimeCases))]
    public void CalculateTravelTimeMatchesTypeScript(CalculateTravelTimeCase testCase)
    {
        var origin = ToPlanetRef(testCase.Origin);
        var destination = ToPlanetRef(testCase.Destination);
        var ship = ToShip(testCase.Ship);
        var pilot = testCase.Pilot is null ? null : ToCrewMember(testCase.Pilot);

        var travelTimeMs = TravelTimeCalculator.CalculateTravelTime(origin, destination, ship, pilot);

        Assert.Equal(testCase.ExpectedTravelTimeMs, travelTimeMs, precision: 6);
    }

    public static IEnumerable<object[]> CalculateFuelCostCases() => LoadCorpus().CalculateFuelCostCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(CalculateFuelCostCases))]
    public void CalculateFuelCostMatchesTypeScript(CalculateFuelCostCase testCase)
    {
        var origin = ToPlanetRef(testCase.Origin);
        var destination = ToPlanetRef(testCase.Destination);
        Assert.Equal(testCase.ExpectedFuelCost, FuelCostCalculator.CalculateFuelCost(origin, destination), precision: 10);
    }

    public static IEnumerable<object[]> DeriveFuelCapacityCases() => LoadCorpus().DeriveFuelCapacityCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(DeriveFuelCapacityCases))]
    public void DeriveFuelCapacityMatchesTypeScript(DeriveFuelCapacityCase testCase)
    {
        var tier = Enum.Parse<TierColor>(testCase.Tier);
        Assert.Equal(testCase.ExpectedCapacity, FuelCapacityDeriver.DeriveFuelCapacity(tier), precision: 10);
    }

    public static IEnumerable<object[]> DeriveShipTierCases() => LoadCorpus().DeriveShipTierCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(DeriveShipTierCases))]
    public void DeriveShipTierMatchesTypeScript(DeriveShipTierCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        Assert.Equal(testCase.ExpectedTier, ShipTierDeriver.DeriveShipTier(ship).ToString());
    }

    public static IEnumerable<object[]> TierMidpointCases() => LoadCorpus().TierMidpointCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(TierMidpointCases))]
    public void TierMidpointMatchesTypeScript(TierMidpointCase testCase)
    {
        var tier = Enum.Parse<TierColor>(testCase.Tier);
        Assert.Equal(testCase.ExpectedMidpoint, ShipTierDeriver.TierMidpoint(tier), precision: 10);
    }

    public static IEnumerable<object[]> AssembleShipCases() => LoadCorpus().AssembleShipCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(AssembleShipCases))]
    public void AssembleShipMatchesTypeScript(AssembleShipCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var component = ToShipComponent(testCase.Component);
        var slot = ParseCategory(testCase.Slot);

        var result = ShipAssembler.AssembleShip(ship, component, slot);

        AssertShipMatches(testCase.ExpectedShip, result);
    }

    public static IEnumerable<object[]> InitiateVoyageCases() => LoadCorpus().InitiateVoyageCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(InitiateVoyageCases))]
    public void InitiateVoyageMatchesTypeScript(InitiateVoyageCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var origin = ToPlanetRef(testCase.Origin);
        var destination = ToPlanetRef(testCase.Destination);
        var cargo = testCase.Cargo.Select(c => new VoyageCargoItem { ItemId = c.ItemId, Quantity = c.Quantity }).ToList();
        var pilot = testCase.Pilot is null ? null : ToCrewMember(testCase.Pilot);

        var result = VoyageInitiator.InitiateVoyage(ship, origin, destination, cargo, testCase.NowMs, testCase.Id, testCase.IsRetreat, pilot);

        AssertVoyageMatches(testCase.ExpectedResult.Voyage, result.Voyage);
        AssertShipMatches(testCase.ExpectedResult.UpdatedShip, result.UpdatedShip);
    }

    public static IEnumerable<object[]> ResolveArrivalCases() => LoadCorpus().ResolveArrivalCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(ResolveArrivalCases))]
    public void ResolveArrivalMatchesTypeScript(ResolveArrivalCase testCase)
    {
        var voyage = ToVoyage(testCase.Voyage);
        var ship = ToShip(testCase.Ship);
        Planet? destinationPlanet = testCase.DestinationPlanet is null ? null : ToPlanetRefWithResources(testCase.DestinationPlanet);
        var resources = testCase.HasResources ? RealResources.Value : null;
        var random = TestFixtures.QueueRandom(testCase.RandomSequence.ToArray());

        var result = ArrivalResolver.ResolveArrival(voyage, ship, testCase.NowMs, destinationPlanet, resources, random);

        Assert.Equal(testCase.ExpectedResult.Resolved, result.Resolved);
        if (result is ArrivalResolved resolved)
        {
            AssertShipMatches(testCase.ExpectedResult.UpdatedShip!, resolved.UpdatedShip);
            Assert.Equal(testCase.ExpectedResult.DestinationPlanetId, resolved.DestinationPlanetId);
            Assert.Equal(testCase.ExpectedResult.Encounters!.Count, resolved.Encounters.Count);
            Assert.Equal(testCase.ExpectedResult.PendingCombats!.Count, resolved.PendingCombats.Count);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((ArrivalNotYetDue)result).Reason);
        }
    }

    public static IEnumerable<object[]> PurchaseShipCases() => LoadCorpus().PurchaseShipCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(PurchaseShipCases))]
    public void PurchaseShipMatchesTypeScript(PurchaseShipCase testCase)
    {
        var candidate = new ShipCandidate { Id = testCase.Candidate.Id, Name = testCase.Candidate.Name, Tier = Enum.Parse<TierColor>(testCase.Candidate.Tier), Components = ToShipComponentSlots(testCase.Candidate.Components) };
        // Reconstruct the pool's AvailableShips from the serialized pool
        // itself (correctly empty for the "rejected-not-in-pool" case),
        // not a hardcoded [candidate] -- the TS harness already recorded
        // whichever pool contents actually produced ExpectedResult.
        var pool = new ShipyardPool
        {
            PlanetId = testCase.Pool.PlanetId,
            AvailableShips = testCase.Pool.AvailableShips.Select(c => new ShipCandidate { Id = c.Id, Name = c.Name, Tier = Enum.Parse<TierColor>(c.Tier), Components = ToShipComponentSlots(c.Components) }).ToList(),
            LastRefreshedAt = testCase.Pool.LastRefreshedAt,
        };
        var wallet = new Wallet { PlayerId = testCase.Wallet.PlayerId, Credits = testCase.Wallet.Credits };

        var result = ShipPurchaser.PurchaseShip(candidate, pool, wallet, testCase.Wallet.PlayerId);

        Assert.Equal(testCase.ExpectedResult.Purchased, result.Purchased);
        if (result is PurchaseShipSucceeded succeeded)
        {
            AssertShipMatches(testCase.ExpectedResult.Ship!, succeeded.Ship);
            Assert.Empty(succeeded.UpdatedPool.AvailableShips);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((PurchaseShipRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> PurchaseScannerCases() => LoadCorpus().PurchaseScannerCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(PurchaseScannerCases))]
    public void PurchaseScannerMatchesTypeScript(PurchaseScannerCase testCase)
    {
        var candidate = new ScannerCandidate { Id = testCase.Candidate.Id, Tier = Enum.Parse<TierColor>(testCase.Candidate.Tier) };
        var pool = new ScannerPool { PlanetId = testCase.Pool.PlanetId, AvailableScanners = new List<ScannerCandidate> { candidate }, LastRefreshedAt = testCase.Pool.LastRefreshedAt };
        var wallet = new Wallet { PlayerId = testCase.Wallet.PlayerId, Credits = testCase.Wallet.Credits };

        var result = ScannerPurchaser.PurchaseScanner(candidate, pool, wallet, testCase.Wallet.PlayerId);

        Assert.Equal(testCase.ExpectedResult.Purchased, result.Purchased);
        if (result is PurchaseScannerSucceeded succeeded)
        {
            Assert.Equal(testCase.ExpectedResult.Scanner!.Tier, succeeded.Scanner.Tier.ToString());
            Assert.Empty(succeeded.UpdatedPool.AvailableScanners);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((PurchaseScannerRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> RefreshShipyardPoolCases() => LoadCorpus().RefreshShipyardPoolCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(RefreshShipyardPoolCases))]
    public void RefreshShipyardPoolMatchesTypeScript(RefreshShipyardPoolCase testCase)
    {
        var pool = ShipyardPoolRefresher.RefreshShipyardPool(testCase.PlanetId, testCase.Seed, testCase.NowMs);
        Assert.Equal(testCase.ExpectedResult.AvailableShips.Count, pool.AvailableShips.Count);
        for (var i = 0; i < pool.AvailableShips.Count; i++)
        {
            Assert.Equal(testCase.ExpectedResult.AvailableShips[i].Id, pool.AvailableShips[i].Id);
            Assert.Equal(testCase.ExpectedResult.AvailableShips[i].Tier, pool.AvailableShips[i].Tier.ToString());
        }
    }

    public static IEnumerable<object[]> RefreshScannerPoolCases() => LoadCorpus().RefreshScannerPoolCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(RefreshScannerPoolCases))]
    public void RefreshScannerPoolMatchesTypeScript(RefreshScannerPoolCase testCase)
    {
        var pool = ScannerPoolRefresher.RefreshScannerPool(testCase.PlanetId, testCase.Seed, testCase.NowMs);
        Assert.Equal(testCase.ExpectedResult.AvailableScanners.Count, pool.AvailableScanners.Count);
        for (var i = 0; i < pool.AvailableScanners.Count; i++)
        {
            Assert.Equal(testCase.ExpectedResult.AvailableScanners[i].Id, pool.AvailableScanners[i].Id);
            Assert.Equal(testCase.ExpectedResult.AvailableScanners[i].Tier, pool.AvailableScanners[i].Tier.ToString());
        }
    }

    public static IEnumerable<object[]> RefuelShipCases() => LoadCorpus().RefuelShipCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(RefuelShipCases))]
    public void RefuelShipMatchesTypeScript(RefuelShipCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var wallet = new Wallet { PlayerId = testCase.Wallet.PlayerId, Credits = testCase.Wallet.Credits };
        Planet? dockedPlanet = testCase.DockedPlanet is null ? null : new Planet
        {
            Id = testCase.DockedPlanet.Id, Name = testCase.DockedPlanet.Name, ProducibleResourceIds = new List<string>(),
            OwnedByPlayerId = testCase.DockedPlanet.OwnedByPlayerId, CitadelLevel = testCase.DockedPlanet.CitadelLevel,
        };

        var result = ShipRefueler.RefuelShip(ship, wallet, testCase.Amount, dockedPlanet);

        Assert.Equal(testCase.ExpectedResult.Refueled, result.Refueled);
        if (result is RefuelShipSucceeded succeeded)
        {
            AssertShipMatches(testCase.ExpectedResult.UpdatedShip!, succeeded.UpdatedShip);
            Assert.Equal(testCase.ExpectedResult.UpdatedWallet!.Credits, succeeded.UpdatedWallet.Credits, precision: 6);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((RefuelShipRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> GetCrewSlotsForShipCases() => LoadCorpus().GetCrewSlotsForShipCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(GetCrewSlotsForShipCases))]
    public void GetCrewSlotsForShipMatchesTypeScript(GetCrewSlotsForShipCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var result = ShipCrewSlotResolver.GetCrewSlotsForShip(ship);

        Assert.Equal(testCase.ExpectedResult.Pilot, result.Pilot);
        Assert.Equal(testCase.ExpectedResult.CombatEngineerOrScienceOfficer, result.CombatEngineerOrScienceOfficer);
        Assert.Equal(testCase.ExpectedResult.SystemsEngineer, result.SystemsEngineer);
        Assert.Equal(testCase.ExpectedResult.Crafter, result.Crafter);
    }

    public static IEnumerable<object[]> AssignToShipRoleCases() => LoadCorpus().AssignToShipRoleCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(AssignToShipRoleCases))]
    public void AssignToShipRoleMatchesTypeScript(AssignToShipRoleCase testCase)
    {
        var crewMember = ToCrewMember(testCase.CrewMember);
        var ship = ToShip(testCase.Ship);
        var role = ParseShipCrewRole(testCase.Role);
        var roster = testCase.CurrentRoster.Select(ToCrewMember).ToList();

        var result = ShipRoleAssigner.AssignToShipRole(crewMember, ship, role, roster);

        Assert.Equal(testCase.ExpectedResult.Assigned, result.Assigned);
        if (result is AssignShipRoleSucceeded succeeded)
        {
            AssertCrewMemberMatches(testCase.ExpectedResult.UpdatedCrewMember!, succeeded.UpdatedCrewMember);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((AssignShipRoleRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> UnassignFromShipRoleCases() => LoadCorpus().UnassignFromShipRoleCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(UnassignFromShipRoleCases))]
    public void UnassignFromShipRoleMatchesTypeScript(UnassignFromShipRoleCase testCase)
    {
        var crewMember = ToCrewMember(testCase.CrewMember);
        var result = ShipRoleUnassigner.UnassignFromShipRole(crewMember);

        Assert.Equal(testCase.ExpectedResult.Unassigned, result.Unassigned);
        if (result is UnassignShipRoleSucceeded succeeded)
        {
            AssertCrewMemberMatches(testCase.ExpectedResult.UpdatedCrewMember!, succeeded.UpdatedCrewMember);
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((UnassignShipRoleRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> ResolveComponentRepairCases() => LoadCorpus().ResolveComponentRepairCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(ResolveComponentRepairCases))]
    public void ResolveComponentRepairMatchesTypeScript(ResolveComponentRepairCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var ownedCrew = testCase.OwnedCrew.Select(ToCrewMember).ToList();
        Voyage? activeVoyage = testCase.ActiveVoyage is null ? null : ToVoyage(testCase.ActiveVoyage);
        Planet? dockedPlanet = testCase.DockedPlanet is null ? null : new Planet
        {
            Id = testCase.DockedPlanet.Id, Name = testCase.DockedPlanet.Name, ProducibleResourceIds = new List<string>(),
            OwnedByPlayerId = testCase.DockedPlanet.OwnedByPlayerId, CitadelLevel = testCase.DockedPlanet.CitadelLevel,
        };

        var result = ComponentRepairResolver.ResolveComponentRepair(ship, ownedCrew, activeVoyage, dockedPlanet, testCase.NowMs);

        AssertShipMatches(testCase.ExpectedResult, result);
    }

    public static IEnumerable<object[]> PerformScanCases() => LoadCorpus().PerformScanCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(PerformScanCases))]
    public void PerformScanMatchesTypeScript(PerformScanCase testCase)
    {
        var ship = ToShip(testCase.Ship);
        var dockedPlanet = new Planet
        {
            Id = testCase.DockedPlanet.Id, Name = testCase.DockedPlanet.Name, ProducibleResourceIds = new List<string>(),
            Position = testCase.DockedPlanet.Position is null ? null : new PlanetPosition { X = testCase.DockedPlanet.Position.X, Y = testCase.DockedPlanet.Position.Y },
            Discovered = testCase.DockedPlanet.Discovered,
        };
        var ownedScanners = testCase.OwnedScanners.Select(s => new Scanner { Id = s.Id, Tier = Enum.Parse<TierColor>(s.Tier), OwnerId = s.OwnerId }).ToList();
        var allPlanets = testCase.AllPlanets.Select(ToPlanetRef).ToList();

        var result = ScanPerformer.PerformScan(ship, dockedPlanet, ownedScanners, allPlanets);

        Assert.Equal(testCase.ExpectedResult.Scanned, result.Scanned);
        if (result is ScanSucceeded succeeded)
        {
            Assert.Equal(testCase.ExpectedResult.NewlyDiscovered!.Select(p => p.Id).OrderBy(id => id), succeeded.NewlyDiscovered.Select(p => p.Id).OrderBy(id => id));
        }
        else
        {
            Assert.Equal(testCase.ExpectedResult.Reason, ((ScanRejected)result).Reason);
        }
    }

    public static IEnumerable<object[]> InitiateCombatCases() => LoadCorpus().InitiateCombatCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(InitiateCombatCases))]
    public void InitiateCombatMatchesTypeScript(InitiateCombatCase testCase)
    {
        var random = TestFixtures.QueueRandom(testCase.RandomSequence.ToArray());
        var result = CombatInitiator.InitiateCombat(testCase.Id, testCase.VoyageId, ParseTriggerContext(testCase.TriggerContext), testCase.WindowIndex, random);

        Assert.Equal(testCase.ExpectedResult.OpponentThreatTier, result.OpponentThreatTier.ToString());
        Assert.Equal(ParseCombatStatus(testCase.ExpectedResult.Status), result.Status);
        Assert.Equal(testCase.ExpectedResult.WindowIndex, result.WindowIndex);
    }

    public static IEnumerable<object[]> ResolveEncountersCases() => LoadCorpus().ResolveEncountersCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(ResolveEncountersCases))]
    public void ResolveEncountersMatchesTypeScript(ResolveEncountersCase testCase)
    {
        var voyage = ToVoyage(testCase.Voyage);
        var ship = ToShip(testCase.Ship);
        var destinationPlanet = ToPlanetRefWithResources(testCase.DestinationPlanet);
        var random = TestFixtures.QueueRandom(testCase.RandomSequence.ToArray());

        var result = EncounterResolver.ResolveEncounters(voyage, ship, destinationPlanet, RealResources.Value, random);

        Assert.Equal(testCase.ExpectedResult.Encounters.Count, result.Encounters.Count);
        Assert.Equal(testCase.ExpectedResult.PendingCombats.Count, result.PendingCombats.Count);
        for (var i = 0; i < result.Encounters.Count; i++)
        {
            Assert.Equal(testCase.ExpectedResult.Encounters[i].Type, result.Encounters[i].Type.ToString(), ignoreCase: true);
        }
    }

    public static IEnumerable<object[]> ResolveCombatChoiceCases() => LoadCorpus().ResolveCombatChoiceCases.Select(c => new object[] { c });

    [Theory]
    [MemberData(nameof(ResolveCombatChoiceCases))]
    public void ResolveCombatChoiceMatchesTypeScript(ResolveCombatChoiceCase testCase)
    {
        var encounter = new CombatEncounter
        {
            Id = testCase.Encounter.Id, VoyageId = testCase.Encounter.VoyageId, TriggerContext = ParseTriggerContext(testCase.Encounter.TriggerContext),
            OpponentThreatTier = Enum.Parse<TierColor>(testCase.Encounter.OpponentThreatTier), Status = ParseCombatStatus(testCase.Encounter.Status),
            Outcome = ParseCombatOutcome(testCase.Encounter.Outcome), WindowIndex = testCase.Encounter.WindowIndex,
        };
        var ship = ToShip(testCase.Ship);
        var ownedCrew = testCase.OwnedCrew.Select(ToCrewMember).ToList();
        var voyage = new Voyage { Id = testCase.Encounter.VoyageId, ShipId = ship.Id, Cargo = new List<VoyageCargoItem>() };
        var originPlanet = ToPlanetRef(testCase.OriginPlanet);
        var currentPlanet = ToPlanetRef(testCase.CurrentPlanet);
        var random = TestFixtures.QueueRandom(testCase.RandomSequence.ToArray());

        var result = CombatChoiceResolver.ResolveCombatChoice(encounter, testCase.Choice, voyage, ship, originPlanet, currentPlanet, ownedCrew, testCase.NowMs, testCase.RetreatVoyageId, random);

        Assert.Equal(ParseCombatOutcome(testCase.ExpectedResult.CombatEncounter.Outcome), result.CombatEncounter.Outcome);
        if (testCase.ExpectedResult.RetreatVoyage is not null)
        {
            Assert.NotNull(result.RetreatVoyage);
            AssertVoyageMatches(testCase.ExpectedResult.RetreatVoyage, result.RetreatVoyage!);
        }
        else
        {
            Assert.Null(result.RetreatVoyage);
        }
    }
}
