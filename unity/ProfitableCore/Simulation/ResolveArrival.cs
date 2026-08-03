using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/resolveArrival.ts. Only resolves once currentTime >=
// Voyage.ArrivesAt -- never allows early resolution. Does not itself
// activate any Listing for in-transit sale cargo.
//
// DestinationPlanet/resources are optional trailing parameters --
// additive only. Every caller that omits them gets Encounters/
// PendingCombats both empty, same as every pre-Travel-Encounters call
// site.
public static class ArrivalResolver
{
    private static readonly Random SharedRandom = new();
    private static double DefaultRandom() => SharedRandom.NextDouble();

    public static ArrivalResult ResolveArrival(
        Voyage voyage,
        Ship ship,
        long currentTimeMs,
        Planet? destinationPlanet = null,
        IReadOnlyList<Resource>? resources = null,
        RandomFn? random = null)
    {
        random ??= DefaultRandom;

        if (currentTimeMs < voyage.ArrivesAt)
        {
            return new ArrivalNotYetDue { Reason = $"voyage has not yet arrived (arrives at {voyage.ArrivesAt})" };
        }

        var updatedShip = new Ship
        {
            Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier,
            CurrentPlanetId = voyage.DestinationPlanetId, FuelCapacity = ship.FuelCapacity,
            CurrentFuel = ship.CurrentFuel, Components = ship.Components, LastRepairedAt = ship.LastRepairedAt,
        };

        var encounters = new List<EncounterResult>();
        var pendingCombats = new List<CombatEncounter>();

        if (destinationPlanet is not null && resources is not null)
        {
            var resolution = EncounterResolver.ResolveEncounters(voyage, ship, destinationPlanet, resources, random);
            encounters = resolution.Encounters;
            pendingCombats.AddRange(resolution.PendingCombats);

            // A separate check from the window-roll mechanism above.
            // Deliberately NOT suppressed by Voyage.IsRetreat -- the
            // Combat GDD scopes that flag to ResolveEncounters
            // specifically; the arrival check is a separate mechanism
            // this function rolls directly.
            if (random() < ShipsAndTravelConfig.ArrivalCombatCheckChance)
            {
                pendingCombats.Add(CombatInitiator.InitiateCombat($"{voyage.Id}-combat-arrival", voyage.Id, CombatTriggerContext.Arrival, null, random));
            }
        }

        return new ArrivalResolved
        {
            UpdatedShip = updatedShip,
            DestinationPlanetId = voyage.DestinationPlanetId,
            Cargo = voyage.Cargo,
            Encounters = encounters,
            PendingCombats = pendingCombats,
        };
    }
}
