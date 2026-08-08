using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/refuelShip.ts. Checks funds, checks capacity (rejects
// an over-fill, never silently clamps), deducts credits, adds fuel.
//
// Retroactive removal (2026-08-04): the optional DockedPlanet parameter
// and its Level 2+ Citadel refuel-discount logic are removed along with
// Citadels -- see planet-ownership.md's own retroactive note. Reverted to
// this method's original, pre-Citadels signature.
public static class ShipRefueler
{
    public static RefuelShipResult RefuelShip(Ship ship, Wallet wallet, double amount)
    {
        if (amount <= 0)
        {
            return new RefuelShipRejected { Reason = "amount must be positive" };
        }

        var cost = Math.Round(amount * ShipsAndTravelConfig.RefuelCostPerUnit);
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
