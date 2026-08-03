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
        var band = ShipsAndTravelConfig.HazardFailureCostCurve.FirstOrDefault(
            entry => pointsBelow >= entry.MinPointsBelow && (entry.MaxPointsBelow is null || pointsBelow <= entry.MaxPointsBelow));
        if (band is null)
        {
            throw new InvalidOperationException($"no hazard failure cost band defined for {pointsBelow} points below threshold");
        }

        var creditsLost = Math.Round(ShipsAndTravelConfig.HazardBaseFailureCost * band.CostMultiplier);
        return new HazardEncounterResult { WindowIndex = windowIndex, Passed = false, CreditsLost = creditsLost };
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
