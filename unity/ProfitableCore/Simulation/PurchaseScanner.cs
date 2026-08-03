using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/purchaseScanner.ts. Mirrors PurchaseShip exactly.
public static class ScannerPurchaser
{
    public static PurchaseScannerResult PurchaseScanner(ScannerCandidate candidate, ScannerPool pool, Wallet wallet, string playerId)
    {
        if (!pool.AvailableScanners.Any(entry => entry.Id == candidate.Id))
        {
            return new PurchaseScannerRejected { Reason = "candidate is not in this planet's scanner pool" };
        }

        if (!ShipsAndTravelConfig.ScannerPurchaseCostByTier.TryGetValue(candidate.Tier, out var cost))
        {
            throw new InvalidOperationException($"no purchase cost defined for tier {candidate.Tier}");
        }
        if (wallet.Credits < cost)
        {
            return new PurchaseScannerRejected { Reason = $"insufficient funds: need {cost}, have {wallet.Credits}" };
        }

        var scanner = new Scanner { Id = candidate.Id, Tier = candidate.Tier, OwnerId = playerId };

        var updatedPool = new ScannerPool
        {
            PlanetId = pool.PlanetId,
            AvailableScanners = pool.AvailableScanners.Where(entry => entry.Id != candidate.Id).ToList(),
            LastRefreshedAt = pool.LastRefreshedAt,
        };

        return new PurchaseScannerSucceeded
        {
            Scanner = scanner,
            UpdatedPool = updatedPool,
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - cost },
        };
    }
}
