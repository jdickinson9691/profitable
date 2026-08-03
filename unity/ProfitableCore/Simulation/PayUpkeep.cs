using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/payUpkeep.ts. A single wage payment per call, gated on
// whether a full interval has elapsed since LastPaidAt -- not a catch-up
// sum of however many intervals were missed. CheckAttrition (not this
// function) is what turns a run of missed payments into departure.
public static class PayUpkeepSimulation
{
    private const double MsPerHour = 60 * 60 * 1000;

    public static PaymentResult PayUpkeep(CrewMember crewMember, Wallet wallet, long currentTimeMs)
    {
        var elapsedHours = (currentTimeMs - crewMember.LastPaidAt) / MsPerHour;
        if (elapsedHours < CrewConfig.WagePaymentIntervalHours)
        {
            return new PaymentNotDue();
        }

        if (wallet.Credits < crewMember.WageAmount)
        {
            return new PaymentInsufficientFunds();
        }

        var updatedCrewMember = new CrewMember
        {
            Id = crewMember.Id,
            HiredByPlayerId = crewMember.HiredByPlayerId,
            Tier = crewMember.Tier,
            Profession = crewMember.Profession,
            Status = crewMember.Status,
            AssignedCraftId = crewMember.AssignedCraftId,
            HiredAt = crewMember.HiredAt,
            LastCheckedAt = crewMember.LastCheckedAt,
            WageAmount = crewMember.WageAmount,
            LastPaidAt = currentTimeMs,
            UnavailableUntil = crewMember.UnavailableUntil,
            ShipRole = crewMember.ShipRole,
            AssignedShipId = crewMember.AssignedShipId,
        };

        return new PaymentPaid
        {
            UpdatedCrewMember = updatedCrewMember,
            UpdatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits - crewMember.WageAmount },
        };
    }
}
