using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/purchaseCapacity.ts. The Nth purchased slot (0-indexed
// by CrewCapacity.PurchasedSlots) costs
// CrewCapacityExpansionBaseCost * CrewCapacityExpansionCostMultiplier^N,
// matching CrewConfig's own documented curve.
public static class PurchaseCapacitySimulation
{
    public static PurchaseCapacityResult PurchaseCapacity(CrewCapacity capacity, Wallet wallet)
    {
        var cost = CrewConfig.CrewCapacityExpansionBaseCost *
                   Math.Pow(CrewConfig.CrewCapacityExpansionCostMultiplier, capacity.PurchasedSlots);

        if (wallet.Credits < cost)
        {
            return new PurchaseCapacityRejected { Reason = $"insufficient funds: need {Math.Ceiling(cost)}, have {wallet.Credits}" };
        }

        return new PurchaseCapacitySucceeded
        {
            UpdatedCapacity = new CrewCapacity
            {
                PlayerId = capacity.PlayerId,
                BaseCapacity = capacity.BaseCapacity,
                PurchasedSlots = capacity.PurchasedSlots + 1,
            },
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - cost },
        };
    }
}
