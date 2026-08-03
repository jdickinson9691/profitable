#nullable enable
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace Profitable.Unity.Content
{
    // Migration Phase 2 Sub-Phase A (Galaxy, Planet, Mining) Presentation/
    // Integration -- docs/agents/agent-41-unity-galaxy-planet-presentation.md.
    // Parallels GameContent.cs's own lazy-static shape but stays a separate
    // class: GameContent is scoped to the raw content catalog (Agent 35's
    // contract), this owns the generated galaxy built on top of it.
    //
    // Session-only, in-memory, no persistence -- the same deliberate scope
    // limit Inventory.cs already draws (full save-system integration is a
    // later sub-phase's job, not this one's). A fresh galaxy generates once
    // per process and is reused for the rest of the session; nothing here
    // claims to survive a restart the way src/presentation/galaxyState.ts's
    // real seed-persisted version does.
    public static class GalaxyState
    {
        // Matches src/presentation/galaxyState.ts's real alpha-scale
        // PLANET_COUNT -- already parity-tested at this exact size
        // (agent-40-unity-galaxy-planet-parity-validation.md's galaxyCases),
        // not an arbitrary smaller demo number.
        private const int PlanetCount = 50;

        // Fixed rather than randomly generated per session: this class has
        // no persistence, so a random seed would make the galaxy (and any
        // test asserting on it) different every process run. Reproducible
        // until a later sub-phase ports real seed persistence through
        // ISaveSystem.
        private const string Seed = "unity-mvp-galaxy";

        private static Galaxy? _galaxy;

        public static Galaxy Galaxy => _galaxy ??= Generate();

        // galaxy.Planets[0], overridden exactly as galaxyState.ts overrides
        // its own rawStartingPlanet:
        // - Discovered forced true. PlanetGenerator.Generate() always
        //   emits false ("picking/revealing a starting planet is a later
        //   agent's concern" -- agent-39's own comment); this is that
        //   agent.
        // - ColonistCount floored to the production minimum. A direct,
        //   in-memory analog of galaxyState.ts's ensureBootstrapColonization()
        //   floor exception, scoped down to skip the full persisted
        //   planetOwnershipState side-table, which is Sub-Phase E's own job
        //   to port. Without this override the Colonist-Driven Production
        //   gate (ported early as PlanetOwnershipConstants
        //   .MinimumColonistsToProduce) would block the MVP gather loop
        //   before Sub-Phase E's real ownership system exists.
        public static Planet StartingPlanet => Galaxy.Planets[0];

        // Migration Phase 2 Sub-Phase D (Ships & Travel) addition --
        // agent-56-unity-ships-travel-presentation.md. Mirrors the real
        // src/presentation/galaxyState.ts's own secondaryDiscoveredPlanet
        // exactly: "travel needs at least one real reachable destination
        // to demonstrate against... one planet further into the generated
        // list," forced Discovered=true the same way the starting planet
        // already is. Unlike the starting planet, no colonist floor is
        // applied here -- this planet exists only as a travel
        // destination, not a second gatherable location (that would be
        // Sub-Phase E's own colonization scope to extend).
        public static Planet SecondaryDestinationPlanet => Galaxy.Planets[1];

        private static Galaxy Generate()
        {
            var galaxy = GalaxyGenerator.Generate(PlanetCount, GameContent.Loaded.Resources, Seed);
            var startingPlanet = galaxy.Planets[0];
            startingPlanet.Discovered = true;
            startingPlanet.ColonistCount = PlanetOwnershipConstants.MinimumColonistsToProduce;
            galaxy.Planets[1].Discovered = true;
            return galaxy;
        }

        // Mirrors GameContent.ResetForTests()'s own hook -- a test that
        // wants a fresh galaxy after asserting on the static cache can
        // force one.
        public static void ResetForTests() => _galaxy = null;
    }
}
