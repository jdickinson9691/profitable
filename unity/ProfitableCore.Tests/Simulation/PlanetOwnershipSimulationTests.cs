using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for Migration Phase 2 Sub-Phase E's ported logic --
// agent-59-unity-planet-ownership-simulation-core.md. Complements
// Parity/PlanetOwnershipParityTests.cs (the stronger, real-content proof).
public class PlanetOwnershipSimulationTests
{
    private static Ship ShipFixture(string currentPlanetId = "planet-a") => new()
    {
        Id = "ship-1", Name = "Test Ship", OwnerId = "player-1", Tier = TierColor.White, CurrentPlanetId = currentPlanetId,
        FuelCapacity = 65, CurrentFuel = 65, Components = new ShipComponentSlots(),
    };

    private static Planet PlanetFixture(string id = "planet-a") => new()
    {
        Id = id, Name = id, ProducibleResourceIds = new List<string>(),
    };

    [Fact]
    public void TransportColonists_RejectsWhenShipNotDocked()
    {
        var ship = ShipFixture(currentPlanetId: "elsewhere");
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1000 };
        var entry = PlanetOwnershipEntry.Default();

        var result = ColonistTransporter.TransportColonists(ship, planet, 5, wallet, entry);

        Assert.IsType<TransportColonistsRejected>(result);
    }

    [Fact]
    public void TransportColonists_RejectsNonPositiveQuantity()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1000 };
        var result = ColonistTransporter.TransportColonists(ship, planet, 0, wallet, PlanetOwnershipEntry.Default());
        Assert.IsType<TransportColonistsRejected>(result);
    }

    [Fact]
    public void TransportColonists_RejectsInsufficientFunds()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1 };
        var result = ColonistTransporter.TransportColonists(ship, planet, 5, wallet, PlanetOwnershipEntry.Default());
        Assert.IsType<TransportColonistsRejected>(result);
    }

    [Fact]
    public void TransportColonists_SucceedsAndAccumulatesColonistCount()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1000 };
        var entry = new PlanetOwnershipEntry { ColonistCount = 3, CitadelLevel = 0, OwnedByPlayerId = null };

        var result = ColonistTransporter.TransportColonists(ship, planet, 5, wallet, entry);

        var succeeded = Assert.IsType<TransportColonistsSucceeded>(result);
        Assert.Equal(8, succeeded.UpdatedOwnershipEntry.ColonistCount);
        Assert.Equal(1000 - 5 * PlanetOwnershipConstants.ColonistTransportCost, succeeded.UpdatedWallet.Credits, precision: 6);
    }

    [Fact]
    public void ClaimPlanet_RejectsWhenShipNotDocked()
    {
        var ship = ShipFixture(currentPlanetId: "elsewhere");
        var planet = PlanetFixture();
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 0, OwnedByPlayerId = null };
        Assert.IsType<ClaimPlanetRejected>(PlanetClaimer.ClaimPlanet(ship, planet, "player-1", entry));
    }

    [Fact]
    public void ClaimPlanet_RejectsBelowColonistThreshold()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var entry = new PlanetOwnershipEntry { ColonistCount = PlanetOwnershipConstants.MinimumColonistsToProduce - 1, CitadelLevel = 0, OwnedByPlayerId = null };
        Assert.IsType<ClaimPlanetRejected>(PlanetClaimer.ClaimPlanet(ship, planet, "player-1", entry));
    }

    [Fact]
    public void ClaimPlanet_RejectsWhenAlreadyClaimed()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 0, OwnedByPlayerId = "someone-else" };
        Assert.IsType<ClaimPlanetRejected>(PlanetClaimer.ClaimPlanet(ship, planet, "player-1", entry));
    }

    [Fact]
    public void ClaimPlanet_SucceedsAtExactlyTheColonistThreshold()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var entry = new PlanetOwnershipEntry { ColonistCount = PlanetOwnershipConstants.MinimumColonistsToProduce, CitadelLevel = 0, OwnedByPlayerId = null };

        var result = PlanetClaimer.ClaimPlanet(ship, planet, "player-1", entry);

        var succeeded = Assert.IsType<ClaimPlanetSucceeded>(result);
        Assert.Equal("player-1", succeeded.UpdatedOwnershipEntry.OwnedByPlayerId);
    }

    [Fact]
    public void BuildCitadel_RejectsWhenNotClaimed()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 10000 };
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 0, OwnedByPlayerId = null };

        var result = CitadelBuilder.BuildCitadel(ship, planet, 1, wallet, 100, entry);

        Assert.IsType<BuildCitadelRejected>(result);
    }

    [Fact]
    public void BuildCitadel_RejectsLevelSkipping()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 10000 };
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 0, OwnedByPlayerId = "player-1" };

        // Attempting level 2 while at level 0 -- must build level 1 first.
        var result = CitadelBuilder.BuildCitadel(ship, planet, 2, wallet, 100, entry);

        Assert.IsType<BuildCitadelRejected>(result);
    }

    [Fact]
    public void BuildCitadel_Level1SucceedsWithNoMaterialRequirement()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 10000 };
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 0, OwnedByPlayerId = "player-1" };

        var result = CitadelBuilder.BuildCitadel(ship, planet, 1, wallet, materialQuantityAvailable: 0, entry);

        var succeeded = Assert.IsType<BuildCitadelSucceeded>(result);
        Assert.Equal(1, succeeded.UpdatedOwnershipEntry.CitadelLevel);
        Assert.Null(succeeded.MaterialResourceId);
        Assert.Equal(0, succeeded.MaterialQuantityConsumed);
    }

    [Fact]
    public void BuildCitadel_Level2RejectsInsufficientMaterial()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 10000 };
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 1, OwnedByPlayerId = "player-1" };

        var result = CitadelBuilder.BuildCitadel(ship, planet, 2, wallet, materialQuantityAvailable: 0, entry);

        Assert.IsType<BuildCitadelRejected>(result);
    }

    [Fact]
    public void BuildCitadel_Level2SucceedsAndReportsMaterialToConsume()
    {
        var ship = ShipFixture();
        var planet = PlanetFixture();
        var wallet = new Wallet { PlayerId = "player-1", Credits = 10000 };
        var entry = new PlanetOwnershipEntry { ColonistCount = 100, CitadelLevel = 1, OwnedByPlayerId = "player-1" };

        var result = CitadelBuilder.BuildCitadel(ship, planet, 2, wallet, materialQuantityAvailable: 5, entry);

        var succeeded = Assert.IsType<BuildCitadelSucceeded>(result);
        Assert.Equal(2, succeeded.UpdatedOwnershipEntry.CitadelLevel);
        Assert.Equal("iron-ingot", succeeded.MaterialResourceId);
        Assert.Equal(5, succeeded.MaterialQuantityConsumed);
    }

    [Fact]
    public void MergePlanetOwnership_UsesDefaultsWhenEntryIsNull()
    {
        var planet = PlanetFixture();
        var merged = PlanetOwnershipMerger.MergePlanetOwnership(planet, null);
        Assert.Equal(0, merged.ColonistCount);
        Assert.Equal(0, merged.CitadelLevel);
        Assert.Null(merged.OwnedByPlayerId);
    }

    [Fact]
    public void MergePlanetOwnership_AppliesTheGivenEntry()
    {
        var planet = PlanetFixture();
        var entry = new PlanetOwnershipEntry { ColonistCount = 42, CitadelLevel = 2, OwnedByPlayerId = "player-1" };
        var merged = PlanetOwnershipMerger.MergePlanetOwnership(planet, entry);
        Assert.Equal(42, merged.ColonistCount);
        Assert.Equal(2, merged.CitadelLevel);
        Assert.Equal("player-1", merged.OwnedByPlayerId);
    }
}
