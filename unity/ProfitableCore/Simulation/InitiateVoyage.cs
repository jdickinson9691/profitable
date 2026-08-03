using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/initiateVoyage.ts. ArrivesAt is computed once here, at
// departure time, and never recomputed -- a later change to the ship's
// tier must not retroactively change an already-initiated voyage's
// arrival time.
//
// Ship Fuel / Cargo Hold Capacity: two hard-rejection preconditions
// (throw), both skipped entirely for a retreat voyage (IsRetreat true) --
// a forced retreat must never fail for fuel or cargo reasons.
public static class VoyageInitiator
{
    public static InitiateVoyageResult InitiateVoyage(
        Ship ship,
        Planet originPlanet,
        Planet destinationPlanet,
        List<VoyageCargoItem> cargo,
        long currentTimeMs,
        string id,
        bool isRetreat = false,
        CrewMember? pilot = null)
    {
        var updatedShip = ship;

        if (!isRetreat)
        {
            var fuelCost = FuelCostCalculator.CalculateFuelCost(originPlanet, destinationPlanet);
            if (ship.CurrentFuel < fuelCost)
            {
                throw new InvalidOperationException($"InitiateVoyage: insufficient fuel: need {fuelCost}, have {ship.CurrentFuel}");
            }

            var cargoQuantity = cargo.Sum(item => item.Quantity);
            var cargoHoldTier = ship.Components.CargoHold?.Tier ?? TierColor.Grey;
            if (!ShipsAndTravelConfig.CargoHoldCapacityByTier.TryGetValue(cargoHoldTier, out var cargoCapacity))
            {
                throw new InvalidOperationException($"no cargo hold capacity defined for tier {cargoHoldTier}");
            }
            if (cargoQuantity > cargoCapacity)
            {
                throw new InvalidOperationException($"InitiateVoyage: cargo quantity {cargoQuantity} exceeds cargo hold capacity {cargoCapacity}");
            }

            updatedShip = new Ship
            {
                Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier,
                CurrentPlanetId = ship.CurrentPlanetId, FuelCapacity = ship.FuelCapacity,
                CurrentFuel = ship.CurrentFuel - fuelCost, Components = ship.Components, LastRepairedAt = ship.LastRepairedAt,
            };
        }

        var travelTimeMs = TravelTimeCalculator.CalculateTravelTime(originPlanet, destinationPlanet, ship, pilot);

        var voyage = new Voyage
        {
            Id = id,
            ShipId = ship.Id,
            OriginPlanetId = originPlanet.Id,
            DestinationPlanetId = destinationPlanet.Id,
            DepartedAt = currentTimeMs,
            ArrivesAt = currentTimeMs + travelTimeMs,
            Cargo = cargo,
            IsRetreat = isRetreat ? true : null,
        };

        return new InitiateVoyageResult { Voyage = voyage, UpdatedShip = updatedShip };
    }
}
