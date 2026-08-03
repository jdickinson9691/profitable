using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/resolveCombatChoice.ts. OriginPlanet/currentPlanet are
// the original voyage's origin/destination Planet objects respectively --
// by the time this is called, ResolveArrival has already delivered the
// ship to Voyage.DestinationPlanetId, so the retreat voyage's origin is
// the *current* location and its destination is the original voyage's
// origin (the "last safe planet") -- deliberately reversed from the
// original voyage's own origin/destination.
public static class CombatChoiceResolver
{
    private const double MsPerHour = 60 * 60 * 1000;

    private static CrewMember? FindAssignedCrew(IReadOnlyList<CrewMember> ownedCrew, Ship ship, ShipCrewRole? role) =>
        role is null ? null : ownedCrew.FirstOrDefault(member => member.AssignedShipId == ship.Id && member.ShipRole == role);

    // Both sides apply the existing percentage-based variance -- reuses
    // TierMidpoint and TierVarianceLookup, never a combat-specific
    // reimplementation of either.
    private static double RollCombatValue(TierColor tier, RandomFn random)
    {
        var variance = TierVarianceLookup.GetTierVariance(tier);
        var varianceRoll = variance.Negative + random() * (variance.Positive - variance.Negative);
        return ShipTierDeriver.TierMidpoint(tier) * (1 + varianceRoll);
    }

    public static CombatResolution ResolveCombatChoice(
        CombatEncounter combatEncounter,
        string choice, // "attack" or "flee"
        Voyage voyage,
        Ship ship,
        Planet originPlanet,
        Planet currentPlanet,
        IReadOnlyList<CrewMember> ownedCrew,
        long currentTimeMs,
        string retreatVoyageId,
        RandomFn random)
    {
        // Not a normal business outcome -- resolving an already-resolved
        // encounter, or one that was never detected, is a caller/
        // programming error.
        if (combatEncounter.Status != CombatStatus.Pending)
        {
            throw new InvalidOperationException($"combat encounter {combatEncounter.Id} is not pending (status: {combatEncounter.Status})");
        }

        // AssignedShipId doesn't change within this function (only
        // ship.Components does, on a loss), so this is resolved once and
        // reused by both the flee branch and the lose branch's own
        // retreat voyage below.
        var pilot = FindAssignedCrew(ownedCrew, ship, ShipCrewRole.Pilot);

        if (choice == "flee")
        {
            var resolvedEncounter = new CombatEncounter
            {
                Id = combatEncounter.Id, VoyageId = combatEncounter.VoyageId, TriggerContext = combatEncounter.TriggerContext,
                OpponentThreatTier = combatEncounter.OpponentThreatTier, Status = CombatStatus.Resolved, Outcome = CombatOutcome.Flee,
                WindowIndex = combatEncounter.WindowIndex,
            };
            // A retreat voyage never touches fuel/cargo -- only the
            // voyage itself is used here.
            var retreatVoyage = VoyageInitiator.InitiateVoyage(ship, currentPlanet, originPlanet, voyage.Cargo, currentTimeMs, retreatVoyageId, true, pilot).Voyage;
            return new CombatResolution { CombatEncounter = resolvedEncounter, UpdatedShip = ship, UpdatedCrewMember = null, RetreatVoyage = retreatVoyage };
        }

        // choice == "attack". No weapon installed is treated as Grey,
        // the same zero-components fallback DeriveShipTier already
        // established.
        var weapon = ship.Components.Weapon;
        var playerTier = weapon?.Tier ?? TierColor.Grey;

        // Order matters for determinism: player's roll first, then the
        // opponent's.
        var playerValue = RollCombatValue(playerTier, random);
        var opponentValue = RollCombatValue(combatEncounter.OpponentThreatTier, random);

        // "Higher value wins" -- ties favor the player.
        var won = playerValue >= opponentValue;

        if (won)
        {
            var resolvedEncounter = new CombatEncounter
            {
                Id = combatEncounter.Id, VoyageId = combatEncounter.VoyageId, TriggerContext = combatEncounter.TriggerContext,
                OpponentThreatTier = combatEncounter.OpponentThreatTier, Status = CombatStatus.Resolved, Outcome = CombatOutcome.Win,
                WindowIndex = combatEncounter.WindowIndex,
            };
            return new CombatResolution { CombatEncounter = resolvedEncounter, UpdatedShip = ship, UpdatedCrewMember = null, RetreatVoyage = null };
        }

        // An assigned Combat Engineer mitigates the cost of a loss
        // (never the win/lose roll itself) -- reduces both loss-outcome
        // constants by the same tier-scaled fraction.
        var combatEngineer = FindAssignedCrew(ownedCrew, ship, ShipCrewRole.CombatEngineer);
        var mitigationPercent = 0.0;
        if (combatEngineer is not null)
        {
            if (!ShipsAndTravelConfig.CombatEngineerMitigationByTier.TryGetValue(combatEngineer.Tier, out mitigationPercent))
            {
                throw new InvalidOperationException($"no combat engineer mitigation defined for tier {combatEngineer.Tier}");
            }
        }

        // Lose: weapon durability damage + ship tier recompute, one
        // random owned crew member benched (if any owned), and a retreat
        // voyage.
        var updatedShip = ship;
        if (weapon is not null)
        {
            var currentDurability = weapon.Qualities.TryGetValue(Quality.Durability, out var d) ? d : null;
            // Null stays null (never coerced to 0) -- a component with no
            // durability rating simply can't be damaged by this.
            if (currentDurability is not null)
            {
                var damagedDurability = (int)ClampHelper.Clamp(
                    Math.Round(currentDurability.Value * (1 - ShipsAndTravelConfig.CombatComponentDurabilityDamagePercent * (1 - mitigationPercent))),
                    QualityBounds.Min, QualityBounds.Max);

                var damagedQualities = new QualityMap();
                foreach (var q in Qualities.All) damagedQualities[q] = weapon.Qualities.TryGetValue(q, out var v) ? v : null;
                damagedQualities[Quality.Durability] = damagedDurability;

                var recomputedTier = AggregateTierResolver.ComputeAggregateTier(damagedQualities);
                if (recomputedTier is null)
                {
                    throw new InvalidOperationException($"combat damage left weapon {weapon.Id} with no ratable qualities");
                }

                var damagedWeapon = new ShipComponent { Id = weapon.Id, Category = weapon.Category, Qualities = damagedQualities, Tier = recomputedTier.Value };
                // Reuses AssembleShip's own recompute pattern directly --
                // installing the same category back into its own slot is
                // exactly what AssembleShip already does, tier recompute
                // included.
                updatedShip = ShipAssembler.AssembleShip(ship, damagedWeapon, ComponentCategory.Weapon);
            }
        }

        CrewMember? updatedCrewMember = null;
        if (ownedCrew.Count > 0)
        {
            var chosen = ownedCrew[(int)Math.Floor(random() * ownedCrew.Count)];
            updatedCrewMember = new CrewMember
            {
                Id = chosen.Id, HiredByPlayerId = chosen.HiredByPlayerId, Tier = chosen.Tier, Profession = chosen.Profession,
                Status = chosen.Status, AssignedCraftId = chosen.AssignedCraftId, HiredAt = chosen.HiredAt,
                LastCheckedAt = chosen.LastCheckedAt, WageAmount = chosen.WageAmount, LastPaidAt = chosen.LastPaidAt,
                UnavailableUntil = currentTimeMs + (long)(ShipsAndTravelConfig.CombatCrewUnavailableDurationHours * (1 - mitigationPercent) * MsPerHour),
                ShipRole = chosen.ShipRole, AssignedShipId = chosen.AssignedShipId,
            };
        }

        var loseResolvedEncounter = new CombatEncounter
        {
            Id = combatEncounter.Id, VoyageId = combatEncounter.VoyageId, TriggerContext = combatEncounter.TriggerContext,
            OpponentThreatTier = combatEncounter.OpponentThreatTier, Status = CombatStatus.Resolved, Outcome = CombatOutcome.Lose,
            WindowIndex = combatEncounter.WindowIndex,
        };
        var loseRetreatVoyage = VoyageInitiator.InitiateVoyage(updatedShip, currentPlanet, originPlanet, voyage.Cargo, currentTimeMs, retreatVoyageId, true, pilot).Voyage;

        return new CombatResolution
        {
            CombatEncounter = loseResolvedEncounter,
            UpdatedShip = updatedShip,
            UpdatedCrewMember = updatedCrewMember,
            RetreatVoyage = loseRetreatVoyage,
        };
    }
}
