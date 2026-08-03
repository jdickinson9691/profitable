using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/galaxy/generateGalaxy.ts.
public static class GalaxyGenerator
{
    // Uses JsMath.RoundSigned, not a bare Math.Round -- positions span a
    // signed range (-PositionRange to +PositionRange), and JS's Math.round
    // rounds an exact .5 toward +Infinity regardless of sign, which differs
    // from both C#'s default banker's-rounding and from AwayFromZero on
    // negative values. See JsMath.RoundSigned's own comment.
    private static PlanetPosition GeneratePosition(RandomFn random) => new()
    {
        X = (int)JsMath.RoundSigned(random() * GalaxyGenerationConstants.PositionRange * 2 - GalaxyGenerationConstants.PositionRange),
        Y = (int)JsMath.RoundSigned(random() * GalaxyGenerationConstants.PositionRange * 2 - GalaxyGenerationConstants.PositionRange),
    };

    // A fixed, finite set of planets generated once (not a streaming/
    // infinite generator). If no seed is supplied, one is generated so the
    // caller can store it for reproducibility.
    public static Galaxy Generate(int planetCount, IReadOnlyList<Resource> resources, string? seed = null)
    {
        var gameSeed = seed ?? SeededRandom.GenerateSeed();
        // A separate random stream from any individual planet's own seed,
        // so generating positions never perturbs a specific planet's own
        // tier/type/subset/specialty rolls.
        var positionRandom = SeededRandom.Create($"{gameSeed}:positions");

        var planets = new List<Planet>();
        for (var index = 0; index < planetCount; index++)
        {
            var planetSeed = $"{gameSeed}:{index}";
            var position = GeneratePosition(positionRandom);
            planets.Add(PlanetGenerator.Generate(planetSeed, position, resources));
        }

        return new Galaxy { Seed = gameSeed, Planets = planets };
    }
}
