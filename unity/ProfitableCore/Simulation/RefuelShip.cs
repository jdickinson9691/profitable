using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/refuelShip.ts. Checks funds, checks capacity (rejects
// an over-fill, never silently clamps), deducts credits, adds fuel.
//
// DockedPlanet (Citadels amendment): the Level 2+ refuel-discount
// benefit. Only applies when the ship's owner also owns the planet -- a
// citadel benefits its owner, not any docked ship.
public static class ShipRefueler
{
    public static RefuelShipResult RefuelShip(Ship ship, Wallet wallet, double amount, Planet? dockedPlanet = null)
    {
        if (amount <= 0)
        {
            return new RefuelShipRejected { Reason = "amount must be positive" };
        }

        var citadelLevel = (dockedPlanet is not null && dockedPlanet.OwnedByPlayerId == ship.OwnerId) ? (dockedPlanet.CitadelLevel ?? 0) : 0;
        var discountPercent = PlanetOwnershipConstants.CitadelLevelBenefits.TryGetValue(citadelLevel, out var benefit) ? benefit.RefuelDiscountPercent : 0;
        var cost = Math.Round(amount * ShipsAndTravelConfig.RefuelCostPerUnit * (1 - discountPercent));
        if (wallet.Credits < cost)
        {
            return new RefuelShipRejected { Reason = $"insufficient funds: need {cost}, have {wallet.Credits}" };
        }

        if (ship.CurrentFuel + amount > ship.FuelCapacity)
        {
            return new RefuelShipRejected { Reason = $"would exceed fuel capacity: {ship.CurrentFuel} + {amount} > {ship.FuelCapacity}" };
        }

        var updatedShip = new Ship
        {
            Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier,
            CurrentPlanetId = ship.CurrentPlanetId, FuelCapacity = ship.FuelCapacity,
            CurrentFuel = ship.CurrentFuel + amount, Components = ship.Components, LastRepairedAt = ship.LastRepairedAt,
        };

        return new RefuelShipSucceeded
        {
            UpdatedShip = updatedShip,
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - cost },
        };
    }
}
