using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/hireCrew.ts. Takes the actual pool/capacity/wallet/
// existing-crew data directly rather than IDs into an implicit store --
// same pure-function reasoning already applied to PurchaseListing/
// GetGlobalPrice. Also checks wallet sufficiency before deducting, which
// PurchaseListing never did (a known, separately-documented gap there).
public static class HireCrewSimulation
{
    public static HireResult HireCrew(
        CrewCandidate candidate,
        PlanetCrewPool pool,
        CrewCapacity capacity,
        IReadOnlyList<CrewMember> existingCrew,
        Wallet wallet,
        string playerId,
        long nowMs)
    {
        if (!pool.AvailableHires.Any(entry => entry.Id == candidate.Id))
        {
            return new HireRejected { Reason = "candidate is not in this planet's crew pool" };
        }

        var maxCrew = capacity.BaseCapacity + capacity.PurchasedSlots;
        if (existingCrew.Count >= maxCrew)
        {
            return new HireRejected { Reason = $"at crew capacity ({existingCrew.Count}/{maxCrew})" };
        }

        if (!CrewConfig.CrewHireCostByTier.TryGetValue(candidate.Tier, out var cost))
        {
            throw new InvalidOperationException($"no hire cost defined for tier {candidate.Tier}");
        }
        if (wallet.Credits < cost)
        {
            return new HireRejected { Reason = $"insufficient funds: need {cost}, have {wallet.Credits}" };
        }

        if (!CrewConfig.CrewWageByTier.TryGetValue(candidate.Tier, out var wageAmount))
        {
            throw new InvalidOperationException($"no wage defined for tier {candidate.Tier}");
        }

        var crewMember = new CrewMember
        {
            Id = candidate.Id,
            HiredByPlayerId = playerId,
            Tier = candidate.Tier,
            Profession = candidate.Profession,
            Status = CrewStatus.Idle,
            AssignedCraftId = null,
            HiredAt = nowMs,
            LastCheckedAt = nowMs,
            WageAmount = wageAmount,
            LastPaidAt = nowMs,
        };

        var updatedPool = new PlanetCrewPool
        {
            PlanetId = pool.PlanetId,
            AvailableHires = pool.AvailableHires.Where(entry => entry.Id != candidate.Id).ToList(),
            LastRefreshedAt = pool.LastRefreshedAt,
        };

        return new HireSucceeded
        {
            CrewMember = crewMember,
            UpdatedPool = updatedPool,
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - cost },
        };
    }
}
