using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for Migration Phase 2 Sub-Phase E's ported logic --
// agent-59-unity-planet-ownership-simulation-core.md. Complements
// Parity/PlanetOwnershipParityTests.cs (the stronger, real-content proof).
//
// Retroactive removal (2026-08-04): this file used to also cover
// PlanetClaimer.ClaimPlanet()/CitadelBuilder.BuildCitadel() -- both
// removed along with the whole Citadels sub-system, see
// planet-ownership.md's own retroactive note. Colonist-Driven Production
// (ColonistTransporter/PlanetOwnershipMerger) is unaffected.
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
        var entry = new PlanetOwnershipEntry { ColonistCount = 3 };

        var result = ColonistTransporter.TransportColonists(ship, planet, 5, wallet, entry);

        var succeeded = Assert.IsType<TransportColonistsSucceeded>(result);
        Assert.Equal(8, succeeded.UpdatedOwnershipEntry.ColonistCount);
        Assert.Equal(1000 - 5 * PlanetOwnershipConstants.ColonistTransportCost, succeeded.UpdatedWallet.Credits, precision: 6);
    }

    [Fact]
    public void MergePlanetOwnership_UsesDefaultsWhenEntryIsNull()
    {
        var planet = PlanetFixture();
        var merged = PlanetOwnershipMerger.MergePlanetOwnership(planet, null);
        Assert.Equal(0, merged.ColonistCount);
    }

    [Fact]
    public void MergePlanetOwnership_AppliesTheGivenEntry()
    {
        var planet = PlanetFixture();
        var entry = new PlanetOwnershipEntry { ColonistCount = 42 };
        var merged = PlanetOwnershipMerger.MergePlanetOwnership(planet, entry);
        Assert.Equal(42, merged.ColonistCount);
    }
}
