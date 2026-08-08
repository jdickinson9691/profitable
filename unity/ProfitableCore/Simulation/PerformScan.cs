using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/performScan.ts. "Docked at dockedPlanet" is read off
// Ship.CurrentPlanetId. ScienceOfficer is a new, optional trailing
// parameter -- only stacks on top of an already-owned scanner's own
// bonus (the pre-amendment "no scanner owned" rejection is untouched).
public static class ScanPerformer
{
    // "If multiple owned scanners, use only the highest-tier one -- do
    // not sum bonuses." ScannerTierRadiusBonus is strictly increasing by
    // tier, so "highest tier" and "largest radiusBonus" are the same
    // thing -- taking the max bonus directly implements the rule.
    private static double? HighestOwnedRadiusBonus(IReadOnlyList<Scanner> ownedScanners)
    {
        if (ownedScanners.Count == 0) return null;

        var best = double.NegativeInfinity;
        foreach (var scanner in ownedScanners)
        {
            if (!ShipsAndTravelConfig.ScannerTierRadiusBonus.TryGetValue(scanner.Tier, out var bonus))
            {
                throw new InvalidOperationException($"no radius bonus defined for tier {scanner.Tier}");
            }
            if (bonus > best) best = bonus;
        }
        return best;
    }

    public static PerformScanResult PerformScan(
        Ship ship,
        Planet dockedPlanet,
        IReadOnlyList<Scanner> ownedScanners,
        IReadOnlyList<Planet> allPlanets,
        CrewMember? scienceOfficer = null)
    {
        if (ship.CurrentPlanetId != dockedPlanet.Id)
        {
            return new ScanRejected { Reason = "ship is not docked at the given planet" };
        }
        if (dockedPlanet.Discovered != true)
        {
            return new ScanRejected { Reason = "docked planet is not yet discovered" };
        }
        if (dockedPlanet.Position is null)
        {
            throw new InvalidOperationException("PerformScan: docked planet must have a generated position");
        }

        var radiusBonus = HighestOwnedRadiusBonus(ownedScanners);
        if (radiusBonus is null)
        {
            return new ScanRejected { Reason = "no scanner owned" };
        }

        var scienceOfficerBonus = 0.0;
        if (scienceOfficer is not null)
        {
            if (!ShipsAndTravelConfig.ScienceOfficerRadiusBonusByTier.TryGetValue(scienceOfficer.Tier, out scienceOfficerBonus))
            {
                throw new InvalidOperationException($"no science officer radius bonus defined for tier {scienceOfficer.Tier}");
            }
        }

        var effectiveRadius = ShipsAndTravelConfig.ScannerBaseScanRadius + radiusBonus.Value + scienceOfficerBonus;

        var newlyDiscovered = new List<Planet>();
        foreach (var planet in allPlanets)
        {
            if (planet.Discovered == true) continue;
            // Planets without a generated position can't be measured
            // against a radius -- skipped, not thrown, since a
            // galaxy-wide scan legitimately iterates over every planet.
            if (planet.Position is null) continue;

            var distance = DistanceCalculator.CalculateDistance(dockedPlanet.Position, planet.Position);
            if (distance <= effectiveRadius)
            {
                newlyDiscovered.Add(new Planet
                {
                    Id = planet.Id, Name = planet.Name, ProducibleResourceIds = planet.ProducibleResourceIds,
                    PlanetType = planet.PlanetType, Tier = planet.Tier, Position = planet.Position,
                    SpecialtyResourceId = planet.SpecialtyResourceId, Discovered = true,
                    ResourceQualities = planet.ResourceQualities, ColonistCount = planet.ColonistCount,
                });
            }
        }

        return new ScanSucceeded { NewlyDiscovered = newlyDiscovered };
    }
}
