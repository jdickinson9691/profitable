using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/purchaseShip.ts. Checks wallet sufficiency before
// deducting (a check PurchaseListing never added). No capacity check
// exists here, unlike HireCrew -- the design doc never decided a
// ship-ownership limit analogous to CrewCapacity, so none is enforced.
public static class ShipPurchaser
{
    public static PurchaseShipResult PurchaseShip(ShipCandidate candidate, ShipyardPool pool, Wallet wallet, string playerId)
    {
        if (!pool.AvailableShips.Any(entry => entry.Id == candidate.Id))
        {
            return new PurchaseShipRejected { Reason = "candidate is not in this planet's shipyard pool" };
        }

        if (!ShipsAndTravelConfig.ShipPurchaseCostByTier.TryGetValue(candidate.Tier, out var cost))
        {
            throw new InvalidOperationException($"no purchase cost defined for tier {candidate.Tier}");
        }
        if (wallet.Credits < cost)
        {
            return new PurchaseShipRejected { Reason = $"insufficient funds: need {cost}, have {wallet.Credits}" };
        }

        // A freshly-purchased ship starts with a full tank at its own
        // tier's capacity.
        var fuelCapacity = FuelCapacityDeriver.DeriveFuelCapacity(candidate.Tier);

        var ship = new Ship
        {
            Id = candidate.Id,
            Name = candidate.Name,
            OwnerId = playerId,
            Tier = candidate.Tier,
            CurrentPlanetId = pool.PlanetId,
            FuelCapacity = fuelCapacity,
            CurrentFuel = fuelCapacity,
            Components = candidate.Components,
        };

        var updatedPool = new ShipyardPool
        {
            PlanetId = pool.PlanetId,
            AvailableShips = pool.AvailableShips.Where(entry => entry.Id != candidate.Id).ToList(),
            LastRefreshedAt = pool.LastRefreshedAt,
        };

        return new PurchaseShipSucceeded
        {
            Ship = ship,
            UpdatedPool = updatedPool,
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - cost },
        };
    }
}
