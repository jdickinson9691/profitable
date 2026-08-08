using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/resolveComponentRepair.ts. Same "derive from elapsed
// hours since a stored timestamp, capped, no background job" shape
// ResolveBackgroundCrafting already established, applied to Ship
// .LastRepairedAt. ActiveVoyage is an explicit, required parameter --
// Ship.CurrentPlanetId alone can't distinguish "docked here" from
// "mid-voyage, origin still shown", so the caller resolves and passes
// which state currently applies.
//
// Two independent rate sources, summed into one combined per-category
// rate: Systems Engineer's unconditional rate, and Crafter's
// traveling-only, category-matched rate.
//
// Retroactive removal (2026-08-04): the DockedPlanet parameter and its
// Citadel-driven repair-rate contribution (citadelRate, Level 2/3
// benefits) are removed along with Citadels -- see planet-ownership.md's
// own retroactive note for the full account, including the documented
// Unity consequence (Check Repair becomes a no-op until Ship Crew Roles
// UI exists in Unity, since Unity has no other repair source). Systems
// Engineer and Crafter repair are both unaffected.
public static class ComponentRepairResolver
{
    private const double MsPerHour = 60 * 60 * 1000;

    // Crafter (Weaponsmith/Engineer/Shield Technician/Cargo Specialist)
    // only -- Artisan has no repair effect. Reuses the existing
    // profession strings directly, one-to-one with the matching
    // ShipComponent category.
    private static readonly Dictionary<string, ComponentCategory> ProfessionRepairCategory = new()
    {
        ["Weaponsmith"] = ComponentCategory.Weapon,
        ["Engineer"] = ComponentCategory.Engine,
        ["Shield Technician"] = ComponentCategory.Shield,
        ["Cargo Specialist"] = ComponentCategory.CargoHold,
    };

    private static CrewMember? FindAssignedCrew(IReadOnlyList<CrewMember> ownedCrew, Ship ship, ShipCrewRole role) =>
        ownedCrew.FirstOrDefault(member => member.AssignedShipId == ship.Id && member.ShipRole == role);

    public static Ship ResolveComponentRepair(Ship ship, IReadOnlyList<CrewMember> ownedCrew, Voyage? activeVoyage, long currentTimeMs)
    {
        // Missing LastRepairedAt (never repaired before) reads as zero
        // elapsed time on this first call -- no free retroactive catch-up.
        var rawElapsedHours = (currentTimeMs - (ship.LastRepairedAt ?? currentTimeMs)) / MsPerHour;
        var cappedElapsedHours = Math.Min(Math.Max(rawElapsedHours, 0), ShipsAndTravelConfig.RepairElapsedTimeCapHours);

        var systemsEngineer = FindAssignedCrew(ownedCrew, ship, ShipCrewRole.SystemsEngineer);
        var systemsEngineerRate = 0.0;
        if (systemsEngineer is not null)
        {
            if (!ShipsAndTravelConfig.SystemsEngineerRepairRateByTier.TryGetValue(systemsEngineer.Tier, out systemsEngineerRate))
            {
                throw new InvalidOperationException($"no Systems Engineer repair rate defined for tier {systemsEngineer.Tier}");
            }
        }

        // "While traveling" -- never resolved at all while docked,
        // regardless of profession/tier.
        var crafter = activeVoyage is not null ? FindAssignedCrew(ownedCrew, ship, ShipCrewRole.Crafter) : null;
        ComponentCategory? crafterCategory = crafter?.Profession is not null && ProfessionRepairCategory.TryGetValue(crafter.Profession, out var cat) ? cat : null;
        var crafterRate = 0.0;
        if (crafter is not null && crafterCategory is not null)
        {
            if (!ShipsAndTravelConfig.CrafterRepairRateByTier.TryGetValue(crafter.Tier, out crafterRate))
            {
                throw new InvalidOperationException($"no Crafter repair rate defined for tier {crafter.Tier}");
            }
        }

        var updatedComponents = new ShipComponentSlots { Weapon = ship.Components.Weapon, Engine = ship.Components.Engine, Shield = ship.Components.Shield, CargoHold = ship.Components.CargoHold };
        foreach (var category in new[] { ComponentCategory.Weapon, ComponentCategory.Engine, ComponentCategory.Shield, ComponentCategory.CargoHold })
        {
            var component = updatedComponents.Get(category);
            // Null stays null, never coerced to 0.
            if (component is null || !component.Qualities.TryGetValue(Quality.Durability, out var durability) || durability is null) continue;

            var rate = systemsEngineerRate + (category == crafterCategory ? crafterRate : 0);
            if (rate <= 0) continue;

            var repairedDurability = (int)ClampHelper.Clamp(Math.Round(durability.Value + rate * cappedElapsedHours), QualityBounds.Min, QualityBounds.Max);
            if (repairedDurability == durability.Value) continue;

            var updatedQualities = new QualityMap();
            foreach (var q in Qualities.All) updatedQualities[q] = component.Qualities.TryGetValue(q, out var v) ? v : null;
            updatedQualities[Quality.Durability] = repairedDurability;

            var recomputedTier = AggregateTierResolver.ComputeAggregateTier(updatedQualities);
            if (recomputedTier is null)
            {
                // Structurally shouldn't happen -- every ShipComponent in
                // this codebase is generated with all 5 qualities
                // populated, never all-null.
                throw new InvalidOperationException($"component repair left {category} with no ratable qualities");
            }

            var repairedComponent = new ShipComponent { Id = component.Id, Category = component.Category, Qualities = updatedQualities, Tier = recomputedTier.Value };
            updatedComponents = updatedComponents.With(category, repairedComponent);
        }

        var updatedShip = new Ship
        {
            Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier,
            CurrentPlanetId = ship.CurrentPlanetId, FuelCapacity = ship.FuelCapacity, CurrentFuel = ship.CurrentFuel,
            Components = updatedComponents, LastRepairedAt = currentTimeMs,
        };

        return new Ship
        {
            Id = updatedShip.Id, Name = updatedShip.Name, OwnerId = updatedShip.OwnerId,
            Tier = ShipTierDeriver.DeriveShipTier(updatedShip), CurrentPlanetId = updatedShip.CurrentPlanetId,
            FuelCapacity = updatedShip.FuelCapacity, CurrentFuel = updatedShip.CurrentFuel,
            Components = updatedShip.Components, LastRepairedAt = updatedShip.LastRepairedAt,
        };
    }
}
