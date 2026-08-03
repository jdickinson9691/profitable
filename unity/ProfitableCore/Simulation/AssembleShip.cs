using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/assembleShip.ts. A component whose own category
// doesn't match the target slot is a caller/programming error (unlike a
// rejected hire or an insufficient-funds purchase) -- not something a
// returned rejection value needs to represent, so this throws rather
// than extending the return type to a Result union the contract never
// asked for.
public static class ShipAssembler
{
    public static Ship AssembleShip(Ship ship, ShipComponent component, ComponentCategory slot)
    {
        if (component.Category != slot)
        {
            throw new InvalidOperationException($"cannot install a \"{component.Category}\" component into the \"{slot}\" slot");
        }

        var updatedComponents = ship.Components.With(slot, component);

        // Tier must never be stale relative to installed components --
        // recomputed on every assembly change, never read off the
        // previous ship.Tier value.
        var updated = new Ship
        {
            Id = ship.Id,
            Name = ship.Name,
            OwnerId = ship.OwnerId,
            Tier = ship.Tier,
            CurrentPlanetId = ship.CurrentPlanetId,
            FuelCapacity = ship.FuelCapacity,
            CurrentFuel = ship.CurrentFuel,
            Components = updatedComponents,
            LastRepairedAt = ship.LastRepairedAt,
        };

        var tier = ShipTierDeriver.DeriveShipTier(updated);

        // FuelCapacity recomputes at the same moment Tier does -- never
        // left stale. CurrentFuel is clamped down if the new capacity is
        // smaller (never lost fuel simply appears, but an over-full tank
        // relative to a shrunken capacity can't persist either), left
        // unchanged otherwise.
        var fuelCapacity = FuelCapacityDeriver.DeriveFuelCapacity(tier);
        var currentFuel = Math.Min(updated.CurrentFuel, fuelCapacity);

        return new Ship
        {
            Id = updated.Id,
            Name = updated.Name,
            OwnerId = updated.OwnerId,
            Tier = tier,
            CurrentPlanetId = updated.CurrentPlanetId,
            FuelCapacity = fuelCapacity,
            CurrentFuel = currentFuel,
            Components = updated.Components,
            LastRepairedAt = updated.LastRepairedAt,
        };
    }
}
