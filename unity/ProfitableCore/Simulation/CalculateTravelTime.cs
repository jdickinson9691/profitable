using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/calculateTravelTime.ts. Returns milliseconds, not
// hours -- every timestamp in this codebase (Listing.ExpiresAt,
// CrewMember.LastPaidAt, Voyage.ArrivesAt) is epoch-ms, so returning ms
// here keeps InitiateVoyage's ArrivesAt = currentTime + travelTimeMs
// correct with no unit conversion at the call site.
public static class TravelTimeCalculator
{
    private const double MsPerHour = 60 * 60 * 1000;

    // Pilot is an optional trailing parameter -- the caller is trusted to
    // have already resolved which crew member (if any) is actually
    // assigned as this ship's Pilot; this function does not re-validate
    // ShipRole/AssignedShipId itself. Stacks multiplicatively with
    // ShipTierSpeedModifier.
    public static double CalculateTravelTime(Planet originPlanet, Planet destinationPlanet, Ship ship, CrewMember? pilot = null)
    {
        if (originPlanet.Position is null || destinationPlanet.Position is null)
        {
            // Only Phase-2-generated planets carry a position. Travel
            // structurally requires real coordinates on both ends -- not
            // a normal business rejection, so this throws.
            throw new InvalidOperationException("CalculateTravelTime: both planets must have a generated position");
        }

        var distance = DistanceCalculator.CalculateDistance(originPlanet.Position, destinationPlanet.Position);
        var baseTravelTimeHours = distance * ShipsAndTravelConfig.DistanceToTravelHoursPerUnit;

        if (!ShipsAndTravelConfig.ShipTierSpeedModifier.TryGetValue(ship.Tier, out var speedModifier))
        {
            throw new InvalidOperationException($"no speed modifier defined for tier {ship.Tier}");
        }

        var pilotMultiplier = 1.0;
        if (pilot is not null)
        {
            if (!ShipsAndTravelConfig.PilotSpeedBonusByTier.TryGetValue(pilot.Tier, out var bonus))
            {
                throw new InvalidOperationException($"no pilot speed bonus defined for tier {pilot.Tier}");
            }
            pilotMultiplier = bonus;
        }

        return baseTravelTimeHours * speedModifier * pilotMultiplier * MsPerHour;
    }
}
