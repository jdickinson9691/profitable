using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/refreshShipyardPool.ts. Every quality on every one of
// the 4 components is set to the exact same rolled value, so each
// component's own tier and the ship's derived aggregate tier both land
// exactly on the target -- deterministic and simple.
public static class ShipyardPoolRefresher
{
    private static int RollShipTargetValue(RandomFn random) => (int)Math.Floor(random() * 100) + 1;

    private static QualityMap GenerateMatchingQualities(int value) => new()
    {
        [Quality.Purity] = value,
        [Quality.Density] = value,
        [Quality.Potency] = value,
        [Quality.Durability] = value,
        [Quality.Rarity] = value,
    };

    public static ShipyardPool RefreshShipyardPool(string planetId, string? seed, long nowMs)
    {
        var poolSeed = seed ?? SeededRandom.GenerateSeed();
        var random = SeededRandom.Create($"{poolSeed}:shipyard-pool");

        var availableShips = new List<ShipCandidate>();
        for (var i = 0; i < ShipsAndTravelConfig.ShipyardPoolSizePerPlanet; i++)
        {
            var targetValue = RollShipTargetValue(random);
            var tier = TierColorResolver.GetTierColor(targetValue);
            var qualities = GenerateMatchingQualities(targetValue);
            var idPrefix = $"ship-candidate-{poolSeed}-{i}";

            availableShips.Add(new ShipCandidate
            {
                Id = idPrefix,
                Name = $"Ship-{poolSeed}-{i}",
                Tier = tier,
                Components = new ShipComponentSlots
                {
                    Weapon = new ShipComponent { Id = $"{idPrefix}-weapon", Category = ComponentCategory.Weapon, Qualities = qualities, Tier = tier },
                    Engine = new ShipComponent { Id = $"{idPrefix}-engine", Category = ComponentCategory.Engine, Qualities = qualities, Tier = tier },
                    Shield = new ShipComponent { Id = $"{idPrefix}-shield", Category = ComponentCategory.Shield, Qualities = qualities, Tier = tier },
                    CargoHold = new ShipComponent { Id = $"{idPrefix}-cargoHold", Category = ComponentCategory.CargoHold, Qualities = qualities, Tier = tier },
                },
            });
        }

        return new ShipyardPool { PlanetId = planetId, AvailableShips = availableShips, LastRefreshedAt = nowMs };
    }
}
