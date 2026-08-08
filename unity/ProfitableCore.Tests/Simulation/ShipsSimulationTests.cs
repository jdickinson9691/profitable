using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for Migration Phase 2 Sub-Phase D's ported logic --
// agent-54-unity-ships-travel-simulation-core.md. Complements
// Parity/ShipsTravelParityTests.cs (the stronger, real-content proof);
// these cover the error/rejection/edge paths that corpus doesn't
// exhaustively cover, mirroring the TypeScript suite's own targeted cases.
//
// Retroactive removal (2026-08-04): this file used to also cover
// RefuelShip's Citadel discount and ResolveComponentRepair's
// dockedPlanet-contract-violation throw -- both removed along with the
// whole Citadels sub-system, see planet-ownership.md's own retroactive
// note.
public class ShipsSimulationTests
{
    private static QualityMap Uniform(int value) => new()
    {
        [Quality.Purity] = value,
        [Quality.Density] = value,
        [Quality.Potency] = value,
        [Quality.Durability] = value,
        [Quality.Rarity] = value,
    };

    private static ShipComponent Component(ComponentCategory category, TierColor tier, int value) => new()
    {
        Id = $"component-{category}", Category = category, Qualities = Uniform(value), Tier = tier,
    };

    private static Ship ShipFixture(TierColor tier = TierColor.White, double fuelCapacity = 65, double currentFuel = 65, string ownerId = "player-1", string currentPlanetId = "planet-a") => new()
    {
        Id = "ship-1", Name = "Test Ship", OwnerId = ownerId, Tier = tier, CurrentPlanetId = currentPlanetId,
        FuelCapacity = fuelCapacity, CurrentFuel = currentFuel,
        Components = new ShipComponentSlots
        {
            Weapon = Component(ComponentCategory.Weapon, tier, 50),
            Engine = Component(ComponentCategory.Engine, tier, 50),
            Shield = Component(ComponentCategory.Shield, tier, 50),
            CargoHold = Component(ComponentCategory.CargoHold, tier, 50),
        },
    };

    private static Planet PlanetFixture(string id, int x, int y, bool discovered = true) => new()
    {
        Id = id, Name = id, ProducibleResourceIds = new List<string>(), Position = new PlanetPosition { X = x, Y = y }, Discovered = discovered,
    };

    private static CrewMember CrewFixture(string id, TierColor tier, ShipCrewRole? role = null, string? assignedShipId = null, string? profession = null) => new()
    {
        Id = id, HiredByPlayerId = "player-1", Tier = tier, Profession = profession, Status = CrewStatus.Idle,
        HiredAt = 0, LastCheckedAt = 0, WageAmount = 10, LastPaidAt = 0, ShipRole = role, AssignedShipId = assignedShipId,
    };

    [Fact]
    public void CalculateTravelTime_ThrowsWhenOriginHasNoPosition()
    {
        var origin = new Planet { Id = "a", Name = "a", ProducibleResourceIds = new List<string>() };
        var destination = PlanetFixture("b", 100, 100);
        Assert.Throws<InvalidOperationException>(() => TravelTimeCalculator.CalculateTravelTime(origin, destination, ShipFixture()));
    }

    [Fact]
    public void CalculateFuelCost_ThrowsWhenDestinationHasNoPosition()
    {
        var origin = PlanetFixture("a", 0, 0);
        var destination = new Planet { Id = "b", Name = "b", ProducibleResourceIds = new List<string>() };
        Assert.Throws<InvalidOperationException>(() => FuelCostCalculator.CalculateFuelCost(origin, destination));
    }

    [Fact]
    public void DeriveShipTier_ReturnsGreyForZeroComponents()
    {
        var ship = new Ship { Id = "s", Name = "s", OwnerId = "p", Tier = TierColor.Gold, CurrentPlanetId = "a", Components = new ShipComponentSlots() };
        Assert.Equal(TierColor.Grey, ShipTierDeriver.DeriveShipTier(ship));
    }

    [Fact]
    public void AssembleShip_ThrowsOnCategoryMismatch()
    {
        var ship = ShipFixture();
        var wrongSlotComponent = Component(ComponentCategory.Engine, TierColor.Gold, 99);
        Assert.Throws<InvalidOperationException>(() => ShipAssembler.AssembleShip(ship, wrongSlotComponent, ComponentCategory.Weapon));
    }

    [Fact]
    public void AssembleShip_ClampsCurrentFuelWhenCapacityShrinks()
    {
        // Start Gold-tier (fuel capacity 190) full, then install a Grey
        // weapon dragging the ship's derived tier down to something with
        // a smaller capacity -- CurrentFuel must clamp down, never appear
        // to gain fuel from a shrunken tank.
        var ship = new Ship
        {
            Id = "s", Name = "s", OwnerId = "p", Tier = TierColor.Gold, CurrentPlanetId = "a",
            FuelCapacity = 190, CurrentFuel = 190,
            Components = new ShipComponentSlots
            {
                Weapon = Component(ComponentCategory.Weapon, TierColor.Gold, 99),
                Engine = Component(ComponentCategory.Engine, TierColor.Gold, 99),
                Shield = Component(ComponentCategory.Shield, TierColor.Gold, 99),
                CargoHold = Component(ComponentCategory.CargoHold, TierColor.Gold, 99),
            },
        };
        var greyWeapon = Component(ComponentCategory.Weapon, TierColor.Grey, 1);

        var updated = ShipAssembler.AssembleShip(ship, greyWeapon, ComponentCategory.Weapon);

        Assert.True(updated.FuelCapacity < 190);
        Assert.Equal(updated.FuelCapacity, updated.CurrentFuel);
    }

    [Fact]
    public void InitiateVoyage_ThrowsOnInsufficientFuel()
    {
        var ship = ShipFixture(currentFuel: 1);
        var origin = PlanetFixture("a", 0, 0);
        var destination = PlanetFixture("b", 1000, 1000);
        Assert.Throws<InvalidOperationException>(() =>
            VoyageInitiator.InitiateVoyage(ship, origin, destination, new List<VoyageCargoItem>(), 0, "voyage-1"));
    }

    [Fact]
    public void InitiateVoyage_ThrowsWhenCargoExceedsCapacity()
    {
        var ship = ShipFixture(fuelCapacity: 1000, currentFuel: 1000);
        var origin = PlanetFixture("a", 0, 0);
        var destination = PlanetFixture("b", 10, 10);
        var cargo = new List<VoyageCargoItem> { new() { ItemId = "igneous-ore", Quantity = 9999 } };
        Assert.Throws<InvalidOperationException>(() =>
            VoyageInitiator.InitiateVoyage(ship, origin, destination, cargo, 0, "voyage-1"));
    }

    [Fact]
    public void InitiateVoyage_RetreatSkipsFuelAndCargoChecks()
    {
        var ship = ShipFixture(currentFuel: 0); // would fail a normal voyage
        var origin = PlanetFixture("a", 0, 0);
        var destination = PlanetFixture("b", 1000, 1000);
        var cargo = new List<VoyageCargoItem> { new() { ItemId = "igneous-ore", Quantity = 9999 } }; // would exceed capacity

        var result = VoyageInitiator.InitiateVoyage(ship, origin, destination, cargo, 0, "retreat-1", isRetreat: true);

        Assert.True(result.Voyage.IsRetreat);
        Assert.Equal(ship.CurrentFuel, result.UpdatedShip.CurrentFuel); // unchanged
    }

    [Fact]
    public void PurchaseShip_RejectsInsufficientFunds()
    {
        var candidate = new ShipCandidate { Id = "c1", Name = "Ship-c1", Tier = TierColor.Gold, Components = new ShipComponentSlots() };
        var pool = new ShipyardPool { PlanetId = "a", AvailableShips = new List<ShipCandidate> { candidate } };
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1 };

        var result = ShipPurchaser.PurchaseShip(candidate, pool, wallet, "player-1");

        Assert.IsType<PurchaseShipRejected>(result);
    }

    [Fact]
    public void PurchaseShip_SucceedsAndStartsWithAFullTank()
    {
        var candidate = new ShipCandidate { Id = "c1", Name = "Ship-c1", Tier = TierColor.Blue, Components = new ShipComponentSlots() };
        var pool = new ShipyardPool { PlanetId = "planet-a", AvailableShips = new List<ShipCandidate> { candidate } };
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1_000_000 };

        var result = ShipPurchaser.PurchaseShip(candidate, pool, wallet, "player-1");

        var succeeded = Assert.IsType<PurchaseShipSucceeded>(result);
        Assert.Equal(succeeded.Ship.FuelCapacity, succeeded.Ship.CurrentFuel);
        Assert.Equal("planet-a", succeeded.Ship.CurrentPlanetId);
        Assert.Empty(succeeded.UpdatedPool.AvailableShips);
    }

    [Fact]
    public void RefuelShip_RejectsNonPositiveAmount()
    {
        var ship = ShipFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1000 };
        Assert.IsType<RefuelShipRejected>(ShipRefueler.RefuelShip(ship, wallet, 0));
    }

    [Fact]
    public void RefuelShip_RejectsWhenExceedingCapacity()
    {
        var ship = ShipFixture(fuelCapacity: 65, currentFuel: 60);
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1000 };
        Assert.IsType<RefuelShipRejected>(ShipRefueler.RefuelShip(ship, wallet, 10));
    }

    [Fact]
    public void AssignToShipRole_RejectsCrafterWithoutProfession()
    {
        var ship = ShipFixture(tier: TierColor.Gold);
        var member = CrewFixture("c1", TierColor.Gold, profession: null);
        var result = ShipRoleAssigner.AssignToShipRole(member, ship, ShipCrewRole.Crafter, new List<CrewMember>());
        Assert.IsType<AssignShipRoleRejected>(result);
    }

    [Fact]
    public void AssignToShipRole_RejectsWhenSlotIsFull()
    {
        // Grey tier: pilot slot capacity is 1.
        var ship = ShipFixture(tier: TierColor.Grey);
        var existingPilot = CrewFixture("existing-pilot", TierColor.Grey, ShipCrewRole.Pilot, ship.Id);
        var candidate = CrewFixture("candidate", TierColor.Grey);

        var result = ShipRoleAssigner.AssignToShipRole(candidate, ship, ShipCrewRole.Pilot, new List<CrewMember> { existingPilot });

        Assert.IsType<AssignShipRoleRejected>(result);
    }

    [Fact]
    public void AssignToShipRole_CombatEngineerAndScienceOfficerShareOneCombinedPoolAtGreyTier()
    {
        var ship = ShipFixture(tier: TierColor.Grey); // combined pool capacity 1
        var existingScienceOfficer = CrewFixture("existing", TierColor.Grey, ShipCrewRole.ScienceOfficer, ship.Id);
        var candidate = CrewFixture("candidate", TierColor.Grey);

        // Combat Engineer competes for the SAME pool as the already-
        // assigned Science Officer -- must be rejected, not treated as
        // an independent capacity.
        var result = ShipRoleAssigner.AssignToShipRole(candidate, ship, ShipCrewRole.CombatEngineer, new List<CrewMember> { existingScienceOfficer });

        Assert.IsType<AssignShipRoleRejected>(result);
    }

    [Fact]
    public void UnassignFromShipRole_RejectsWhenNothingToUnassign()
    {
        var member = CrewFixture("c1", TierColor.White);
        Assert.IsType<UnassignShipRoleRejected>(ShipRoleUnassigner.UnassignFromShipRole(member));
    }

    [Fact]
    public void UnassignFromShipRole_ClearsRoleAndShipId()
    {
        var member = CrewFixture("c1", TierColor.White, ShipCrewRole.Pilot, "ship-1");
        var result = (UnassignShipRoleSucceeded)ShipRoleUnassigner.UnassignFromShipRole(member);
        Assert.Null(result.UpdatedCrewMember.ShipRole);
        Assert.Null(result.UpdatedCrewMember.AssignedShipId);
    }

    [Fact]
    public void ResolveComponentRepair_RepairsDurabilityWithAssignedSystemsEngineer()
    {
        var ship = new Ship
        {
            Id = "s", Name = "s", OwnerId = "player-1", Tier = TierColor.White, CurrentPlanetId = "a",
            FuelCapacity = 65, CurrentFuel = 65, LastRepairedAt = 0,
            Components = new ShipComponentSlots { Weapon = Component(ComponentCategory.Weapon, TierColor.White, 50) },
        };
        var systemsEngineer = CrewFixture("se1", TierColor.Gold, ShipCrewRole.SystemsEngineer, ship.Id); // rate 3/hr at Gold

        var repaired = ComponentRepairResolver.ResolveComponentRepair(ship, new List<CrewMember> { systemsEngineer }, null, 10 * 60 * 60 * 1000);

        var repairedDurability = repaired.Components.Weapon!.Qualities[Quality.Durability];
        Assert.True(repairedDurability > 50, $"expected durability to increase above 50, got {repairedDurability}");
    }

    [Fact]
    public void PerformScan_RejectsWhenShipNotDockedAtGivenPlanet()
    {
        var ship = ShipFixture(currentPlanetId: "planet-a");
        var otherPlanet = PlanetFixture("planet-b", 0, 0);
        var result = ScanPerformer.PerformScan(ship, otherPlanet, new List<Scanner>(), new List<Planet>());
        Assert.IsType<ScanRejected>(result);
    }

    [Fact]
    public void PerformScan_RejectsWhenNoScannerOwned()
    {
        var ship = ShipFixture(currentPlanetId: "planet-a");
        var dockedPlanet = PlanetFixture("planet-a", 0, 0);
        var result = ScanPerformer.PerformScan(ship, dockedPlanet, new List<Scanner>(), new List<Planet>());
        Assert.IsType<ScanRejected>(result);
    }

    [Fact]
    public void PerformScan_DiscoversPlanetsWithinEffectiveRadius()
    {
        var ship = ShipFixture(currentPlanetId: "planet-a");
        var dockedPlanet = PlanetFixture("planet-a", 0, 0);
        var scanner = new Scanner { Id = "sc1", Tier = TierColor.Grey, OwnerId = "player-1" }; // base 120 + 0 bonus = 120 radius
        var nearPlanet = PlanetFixture("near", 50, 0, discovered: false);
        var farPlanet = PlanetFixture("far", 5000, 0, discovered: false);

        var result = (ScanSucceeded)ScanPerformer.PerformScan(ship, dockedPlanet, new List<Scanner> { scanner }, new List<Planet> { nearPlanet, farPlanet });

        Assert.Contains(result.NewlyDiscovered, p => p.Id == "near");
        Assert.DoesNotContain(result.NewlyDiscovered, p => p.Id == "far");
    }

    [Fact]
    public void ResolveArrival_RejectsBeforeArrivalTime()
    {
        var voyage = new Voyage { Id = "v1", ShipId = "s1", ArrivesAt = 1000 };
        var ship = ShipFixture();
        var result = ArrivalResolver.ResolveArrival(voyage, ship, 500);
        Assert.False(result.Resolved);
    }

    [Fact]
    public void ResolveCombatChoice_ThrowsWhenEncounterIsNotPending()
    {
        var encounter = new CombatEncounter { Id = "ce1", Status = CombatStatus.Resolved, Outcome = CombatOutcome.Win };
        var ship = ShipFixture();
        var voyage = new Voyage { Id = "v1", Cargo = new List<VoyageCargoItem>() };
        var origin = PlanetFixture("a", 0, 0);
        var current = PlanetFixture("b", 100, 100);

        Assert.Throws<InvalidOperationException>(() =>
            CombatChoiceResolver.ResolveCombatChoice(encounter, "attack", voyage, ship, origin, current, new List<CrewMember>(), 0, "retreat-1", TestFixtures.QueueRandom(0.5, 0.5)));
    }

    [Fact]
    public void ResolveCombatChoice_FleeProducesARetreatVoyageAndNoShipChange()
    {
        var encounter = new CombatEncounter { Id = "ce1", VoyageId = "v1", TriggerContext = CombatTriggerContext.Travel, OpponentThreatTier = TierColor.Gold, Status = CombatStatus.Pending, WindowIndex = 0 };
        var ship = ShipFixture();
        var voyage = new Voyage { Id = "v1", Cargo = new List<VoyageCargoItem>() };
        var origin = PlanetFixture("a", 0, 0);
        var current = PlanetFixture("b", 100, 100);

        var result = CombatChoiceResolver.ResolveCombatChoice(encounter, "flee", voyage, ship, origin, current, new List<CrewMember>(), 0, "retreat-1", TestFixtures.QueueRandom());

        Assert.Equal(CombatOutcome.Flee, result.CombatEncounter.Outcome);
        Assert.NotNull(result.RetreatVoyage);
        Assert.Equal("b", result.RetreatVoyage!.OriginPlanetId);
        Assert.Equal("a", result.RetreatVoyage.DestinationPlanetId);
        Assert.Same(ship, result.UpdatedShip);
    }

    [Fact]
    public void ResolveCombatChoice_WinLeavesShipAndCrewUntouched()
    {
        var encounter = new CombatEncounter { Id = "ce1", VoyageId = "v1", TriggerContext = CombatTriggerContext.Travel, OpponentThreatTier = TierColor.Grey, Status = CombatStatus.Pending, WindowIndex = 0 };
        var ship = ShipFixture(tier: TierColor.Gold); // heavily favor the player
        var voyage = new Voyage { Id = "v1", Cargo = new List<VoyageCargoItem>() };
        var origin = PlanetFixture("a", 0, 0);
        var current = PlanetFixture("b", 100, 100);

        // playerValue uses Gold tier + minimal variance; opponentValue
        // uses Grey tier -- Gold's midpoint (98.5) with even a negative
        // variance roll stays far above Grey's midpoint (20.5) with even
        // its best positive roll, so this is a deterministic win
        // regardless of the exact roll values.
        var result = CombatChoiceResolver.ResolveCombatChoice(encounter, "attack", voyage, ship, origin, current, new List<CrewMember>(), 0, "retreat-1", TestFixtures.QueueRandom(0.5, 0.5));

        Assert.Equal(CombatOutcome.Win, result.CombatEncounter.Outcome);
        Assert.Same(ship, result.UpdatedShip);
        Assert.Null(result.UpdatedCrewMember);
        Assert.Null(result.RetreatVoyage);
    }

    // Bug fix regression (same shape as PenaltyCurveLookupTests'
    // HandlesFractionalGapCases), mirroring
    // tests/ships/resolveEncounters.test.ts's own new fractional-gap
    // test case-for-case: HazardFailureCostCurve's bands are integer
    // {Min,Max} pairs, but pointsBelow = HazardPassThreshold -
    // effectiveRoll is only guaranteed an integer when
    // HazardShipTierModifier's bonus for the ship's tier is whole --
    // every configured tier's bonus is currently whole, but the
    // dictionary is typed double, so a future tuning pass could
    // reintroduce the exact TierColorResolver/PenaltyCurveLookup gap
    // here. Temporarily overrides one tier's bonus to a fractional
    // value (restored in `finally`, since it's shared mutable static
    // state) to reproduce that scenario directly.
    [Theory]
    [InlineData(TierColor.White, 0.5, 49, 0.5, 1.0)]
    [InlineData(TierColor.Gold, 30.8, 9, 10.2, 1.0)]
    [InlineData(TierColor.Green, 10.5, 19, 20.5, 2.0)]
    [InlineData(TierColor.Blue, 15.5, 4, 30.5, 4.0)]
    [InlineData(TierColor.Purple, 8.5, 1, 40.5, 7.0)]
    public void ResolveEncounters_HazardFailureCostCurveHasNoFractionalGap(
        TierColor tier, double rollBonus, int rawRoll, double expectedPointsBelow, double expectedMultiplier)
    {
        var original = ShipsAndTravelConfig.HazardShipTierModifier[tier];
        ShipsAndTravelConfig.HazardShipTierModifier[tier] = rollBonus;
        try
        {
            var ship = ShipFixture(tier: tier);
            var voyage = new Voyage { Id = "v1", ShipId = ship.Id, DepartedAt = 0, ArrivesAt = 60 * 60 * 1000, Cargo = new List<VoyageCargoItem>() };
            var destinationPlanet = PlanetFixture("dest", 0, 0);
            var x = (rawRoll - 1) / 100.0;
            var random = TestFixtures.QueueRandom(0.1, 0.9, x);

            var resolution = EncounterResolver.ResolveEncounters(voyage, ship, destinationPlanet, new List<Resource>(), random);

            var hazard = Assert.IsType<HazardEncounterResult>(Assert.Single(resolution.Encounters));
            Assert.False(hazard.Passed);
            Assert.True(
                Math.Abs(ShipsAndTravelConfig.HazardPassThreshold - (rawRoll + rollBonus) - expectedPointsBelow) < 1e-9,
                "test setup arithmetic itself is wrong");
            Assert.Equal(Math.Round(ShipsAndTravelConfig.HazardBaseFailureCost * expectedMultiplier), hazard.CreditsLost);
        }
        finally
        {
            ShipsAndTravelConfig.HazardShipTierModifier[tier] = original;
        }
    }
}
