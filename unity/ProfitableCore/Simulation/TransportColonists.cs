using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/planets/transportColonists.ts. Requires the ship be docked at
// destinationPlanet -- without this, the ship parameter would have no
// enforced purpose. Colonists have no separate origin/supply -- abstracted
// as "arranged via credits" once docked, not carried from a source planet
// or limited pool (a deliberate simplification).
//
// Retroactive removal (2026-08-04): this used to also copy through
// CitadelLevel/OwnedByPlayerId on the updated entry -- both fields removed
// along with Citadels, see planet-ownership.md's own retroactive note.
// ColonistCount handling is unaffected.
public static class ColonistTransporter
{
    public static TransportColonistsResult TransportColonists(
        Ship ship,
        Planet destinationPlanet,
        int quantity,
        Wallet wallet,
        PlanetOwnershipEntry currentOwnershipEntry)
    {
        if (ship.CurrentPlanetId != destinationPlanet.Id)
        {
            return new TransportColonistsRejected { Reason = "ship must be docked at the destination planet to transport colonists" };
        }
        if (quantity <= 0)
        {
            return new TransportColonistsRejected { Reason = "quantity must be positive" };
        }

        var cost = quantity * PlanetOwnershipConstants.ColonistTransportCost;
        if (wallet.Credits < cost)
        {
            return new TransportColonistsRejected { Reason = $"insufficient funds: need {cost}, have {wallet.Credits}" };
        }

        return new TransportColonistsSucceeded
        {
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - cost },
            UpdatedOwnershipEntry = new PlanetOwnershipEntry
            {
                ColonistCount = currentOwnershipEntry.ColonistCount + quantity,
            },
        };
    }
}
