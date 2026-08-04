using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/resolveEncounters.ts. Never touches Wallet or player
// inventory directly -- this function only *reports* what happened via
// each EncounterResult's own outcome data; applying those amounts to a
// real Wallet, or the rolled item to real inventory, is the caller's
// (Presentation's) job.
public static class EncounterResolver
{
    private const double MsPerHour = 60 * 60 * 1000;

    private static EncounterType PickEncounterType(RandomFn random)
    {
        var roll = random();
        var cumulative = 0.0;
        foreach (var type in ShipsAndTravelConfig.EncounterTypeOrder)
        {
            cumulative += ShipsAndTravelConfig.EncounterTypeWeights[type];
            if (roll < cumulative) return type;
        }
        return ShipsAndTravelConfig.EncounterTypeOrder[^1]; // floating-point fallback, weights sum to 1
    }

    private static EncounterResult ResolveTradeOpportunity(int windowIndex, RandomFn random)
    {
        var range = ShipsAndTravelConfig.EncounterTradeOpportunityMaxCredits - ShipsAndTravelConfig.EncounterTradeOpportunityMinCredits;
        var creditsGranted = Math.Round(ShipsAndTravelConfig.EncounterTradeOpportunityMinCredits + random() * range);
        return new TradeOpportunityEncounterResult { WindowIndex = windowIndex, CreditsGranted = creditsGranted };
    }

    // Never sets Discovered true on a new planet remotely -- that would
    // functionally reopen the closed "no scanner" decision through a
    // different door. This function only ever reads eligibleResources/
    // destinationPlanet, never writes to either.
    private static EncounterResult? ResolveDiscovery(int windowIndex, IReadOnlyList<Resource> eligibleResources, RandomFn random)
    {
        if (eligibleResources.Count == 0) return null;
        var resource = eligibleResources[(int)Math.Floor(random() * eligibleResources.Count)];
        var qualities = QualityRoller.RollQuality(resource, random);
        return new DiscoveryEncounterResult { WindowIndex = windowIndex, ResourceId = resource.Id, Qualities = qualities };
    }

    private static EncounterResult ResolveHazard(int windowIndex, Ship ship, RandomFn random)
    {
        if (!ShipsAndTravelConfig.HazardShipTierModifier.TryGetValue(ship.Tier, out var tierBonus))
        {
            throw new InvalidOperationException($"no hazard tier modifier defined for tier {ship.Tier}");
        }

        var roll = (int)Math.Floor(random() * 100) + 1;
        var effectiveRoll = roll + tierBonus;
        var passed = effectiveRoll >= ShipsAndTravelConfig.HazardPassThreshold;

        if (passed)
        {
            return new HazardEncounterResult { WindowIndex = windowIndex, Passed = true, CreditsLost = 0 };
        }

        var pointsBelow = ShipsAndTravelConfig.HazardPassThreshold - effectiveRoll;
        var band = FindHazardFailureCostBand(pointsBelow);
        if (band is null)
        {
            throw new InvalidOperationException($"no hazard failure cost band defined for {pointsBelow} points below threshold");
        }

        var creditsLost = Math.Round(ShipsAndTravelConfig.HazardBaseFailureCost * band.CostMultiplier);
        return new HazardEncounterResult { WindowIndex = windowIndex, Passed = false, CreditsLost = creditsLost };
    }

    // Bug fix (same shape as TierColorResolver.GetTierColor()'s/
    // PenaltyCurveLookup.GetPenaltyMultiplier()'s boundary fix), ported
    // verbatim from the matching src/ships/resolveEncounters.ts fix:
    // HazardFailureCostCurve's Min/MaxPointsBelow are integers (band
    // {1,10} then {11,20}, etc.), but pointsBelow is only an integer when
    // HazardShipTierModifier's bonus for the ship's tier happens to be a
    // whole number -- every tier's bonus is currently whole (0/5/10/15/
    // 20/25/30), but the dictionary is typed double, not int, so nothing
    // stops a future tuning pass from setting a fractional bonus. A value
    // like 10.2 points below satisfied neither `<= 10` nor `>= 11` under
    // the old `pointsBelow <= max` check and would throw, even though
    // it's a real, in-range effective value.
    //
    // Unlike PenaltyCurveLookup, there is no zero-width "no violation"
    // band to protect here -- ResolveHazard's own `passed` check above
    // already guarantees pointsBelow is strictly positive whenever this
    // lookup runs, so the first band has no previous band to inherit a
    // lower bound from and needs its own explicit floor of "greater than
    // 0" (not its declared integer MinPointsBelow) to close the same
    // below-band-0 fractional gap every other adjacent pair closes from
    // the high side via `< max + 1`.
    private static HazardFailureCostBand? FindHazardFailureCostBand(double pointsBelow)
    {
        var bands = ShipsAndTravelConfig.HazardFailureCostCurve;
        for (var index = 0; index < bands.Count; index++)
        {
            var entry = bands[index];
            bool matches;
            if (index == 0)
            {
                matches = pointsBelow > 0 && pointsBelow < entry.MaxPointsBelow!.Value + 1;
            }
            else
            {
                var previousBand = bands[index - 1];
                matches = pointsBelow > previousBand.MaxPointsBelow!.Value &&
                    (entry.MaxPointsBelow is null || pointsBelow < entry.MaxPointsBelow.Value + 1);
            }

            if (matches) return entry;
        }
        return null;
    }

    public static EncounterResolution ResolveEncounters(
        Voyage voyage,
        Ship ship,
        Planet destinationPlanet,
        IReadOnlyList<Resource> resources,
        RandomFn random)
    {
        // A retreat voyage never rolls for encounters of any kind -- a
        // simple early-return guard.
        if (voyage.IsRetreat == true) return new EncounterResolution();

        var durationHours = (voyage.ArrivesAt - voyage.DepartedAt) / MsPerHour;
        var windowCount = Math.Max(1, (int)Math.Ceiling(durationHours / ShipsAndTravelConfig.EncounterCheckWindowHours));

        var eligibleResources = resources.Where(r => destinationPlanet.ProducibleResourceIds.Contains(r.Id)).ToList();

        var encounters = new List<EncounterResult>();
        var pendingCombats = new List<CombatEncounter>();
        for (var windowIndex = 0; windowIndex < windowCount; windowIndex++)
        {
            if (random() >= ShipsAndTravelConfig.EncounterTriggerChance) continue;

            var type = PickEncounterType(random);
            if (type == EncounterType.TradeOpportunity)
            {
                encounters.Add(ResolveTradeOpportunity(windowIndex, random));
            }
            else if (type == EncounterType.Discovery)
            {
                var result = ResolveDiscovery(windowIndex, eligibleResources, random);
                if (result is not null) encounters.Add(result);
            }
            else if (type == EncounterType.Hazard)
            {
                encounters.Add(ResolveHazard(windowIndex, ship, random));
            }
            else
            {
                // A combat roll does NOT resolve an outcome here -- it
                // only records a pending CombatEncounter for the caller
                // to present as a decision.
                pendingCombats.Add(CombatInitiator.InitiateCombat($"{voyage.Id}-combat-w{windowIndex}", voyage.Id, CombatTriggerContext.Travel, windowIndex, random));
            }
        }

        return new EncounterResolution { Encounters = encounters, PendingCombats = pendingCombats };
    }
}
