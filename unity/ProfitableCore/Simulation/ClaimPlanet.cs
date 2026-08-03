using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/planets/claimPlanet.ts. Requires the claiming ship be docked
// at planet, same reasoning as TransportColonists. Single-player-only
// concern as designed; contested claims once Multiplayer exists are
// explicitly not resolved here.
public static class PlanetClaimer
{
    public static ClaimPlanetResult ClaimPlanet(Ship ship, Planet planet, string playerId, PlanetOwnershipEntry currentOwnershipEntry)
    {
        if (ship.CurrentPlanetId != planet.Id)
        {
            return new ClaimPlanetRejected { Reason = "ship must be docked at the planet to claim it" };
        }
        if (currentOwnershipEntry.ColonistCount < PlanetOwnershipConstants.MinimumColonistsToProduce)
        {
            return new ClaimPlanetRejected { Reason = "planet must be sufficiently colonized before it can be claimed" };
        }
        if (currentOwnershipEntry.OwnedByPlayerId is not null)
        {
            return new ClaimPlanetRejected { Reason = "planet is already claimed" };
        }

        return new ClaimPlanetSucceeded
        {
            UpdatedOwnershipEntry = new PlanetOwnershipEntry
            {
                ColonistCount = currentOwnershipEntry.ColonistCount,
                CitadelLevel = currentOwnershipEntry.CitadelLevel,
                OwnedByPlayerId = playerId,
            },
        };
    }
}
