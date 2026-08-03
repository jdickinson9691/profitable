using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/planets/buildCitadel.ts. Requires the building ship be docked
// at planet, requires ownership, requires targetLevel == citadelLevel + 1
// (sequential, no level-skipping). Never touches Inventory directly --
// same boundary Crafter.Craft already holds; materialQuantityAvailable is
// pre-resolved by the caller, and a successful result reports what to
// consume, leaving the actual consumption to the caller.
public static class CitadelBuilder
{
    public static BuildCitadelResult BuildCitadel(
        Ship ship,
        Planet planet,
        int targetLevel,
        Wallet wallet,
        int materialQuantityAvailable,
        PlanetOwnershipEntry currentOwnershipEntry)
    {
        if (ship.CurrentPlanetId != planet.Id)
        {
            return new BuildCitadelRejected { Reason = "ship must be docked at the planet to build its Citadel" };
        }
        if (currentOwnershipEntry.OwnedByPlayerId is null)
        {
            return new BuildCitadelRejected { Reason = "planet must be claimed before a Citadel can be built" };
        }
        if (targetLevel != currentOwnershipEntry.CitadelLevel + 1)
        {
            return new BuildCitadelRejected { Reason = $"must build sequentially: expected level {currentOwnershipEntry.CitadelLevel + 1}, got {targetLevel}" };
        }

        if (!PlanetOwnershipConstants.CitadelLevelBenefits.TryGetValue(targetLevel, out var benefit))
        {
            throw new InvalidOperationException($"no CitadelLevelBenefits entry for level {targetLevel}");
        }

        var credits = benefit.ConstructionCostCredits;
        var material = benefit.ConstructionMaterial;
        if (wallet.Credits < credits)
        {
            return new BuildCitadelRejected { Reason = $"insufficient funds: need {credits}, have {wallet.Credits}" };
        }
        if (material is not null && materialQuantityAvailable < material.Quantity)
        {
            return new BuildCitadelRejected { Reason = $"insufficient {material.ResourceId}: need {material.Quantity}, have {materialQuantityAvailable}" };
        }

        return new BuildCitadelSucceeded
        {
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - credits },
            UpdatedOwnershipEntry = new PlanetOwnershipEntry
            {
                ColonistCount = currentOwnershipEntry.ColonistCount,
                CitadelLevel = targetLevel,
                OwnedByPlayerId = currentOwnershipEntry.OwnedByPlayerId,
            },
            MaterialResourceId = material?.ResourceId,
            MaterialQuantityConsumed = material?.Quantity ?? 0,
        };
    }
}
