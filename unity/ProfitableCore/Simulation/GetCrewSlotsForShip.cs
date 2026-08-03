using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/getCrewSlotsForShip.ts. Slot composition scales with
// the ship's own derived tier -- never a component-driven stat.
public static class ShipCrewSlotResolver
{
    public static CrewSlotsByTierEntry GetCrewSlotsForShip(Ship ship)
    {
        var tier = ShipTierDeriver.DeriveShipTier(ship);
        if (!ShipsAndTravelConfig.CrewSlotsByTier.TryGetValue(tier, out var entry))
        {
            throw new InvalidOperationException($"no crew slot allocation defined for tier {tier}");
        }
        return entry;
    }
}
