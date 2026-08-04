#nullable enable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Profitable.Core.Content;
using Profitable.Core.Schema;
using UnityEngine;

namespace Profitable.Unity.Content
{
    // Agent 35 (Unity MVP Presentation) -- docs/agents/agent-35-unity-mvp-presentation.md.
    //
    // The only call site in this agent's code that touches ContentLoader
    // or the raw content JSON files, mirroring Agent 5's own "content
    // accessed exclusively through loadContent()" rule (agent-05
    // -presentation.md). Loads once (static, lazy) and exposes the MVP
    // -scope lookups the panels need.
    public static class GameContent
    {
        private static LoadedContent? _loaded;
        private static HashSet<string>? _componentRecipeIds;

        public static LoadedContent Loaded => _loaded ??= Load();

        // Delta Rigelus -- the only location for MVP scope. Agent 5's own
        // contract: "no travel, no other planets, no modifiers."
        public static Planet StartingPlanet => Loaded.Planets[0];

        public static Resource IgneousOre => FindResource("igneous-ore");
        public static Resource HydrogenGas => FindResource("hydrogen-gas");
        public static Resource AutuniteCrystal => FindResource("autunite-crystal");
        public static Resource RadiantAlloyBar => FindResource("radiant-alloy-bar");

        public static RefiningRecipe RadiantAlloyBarRecipe => FindRefiningRecipe("radiant-alloy-bar");
        public static Recipe IonForgedHullPlateRecipe => FindRecipe("ion-forged-hull-plate");

        // Ship component recipes (the 16 linked via
        // content/componentRecipes.json, ShipAssemblyScene's exclusive
        // domain on the TypeScript side -- no Unity equivalent exists
        // yet, per this migration's own documented scope limit) are
        // excluded from the general crafting roster below, mirroring
        // src/presentation/scenes/CraftScene.ts's own generalRecipes()
        // exactly -- same reasoning, same exclusion set, just read from
        // the real content file via the already-ported ShipsContentLoader
        // instead of re-declaring the 16 ids by hand.
        public static IReadOnlyList<Recipe> GeneralCraftingRecipes =>
            Loaded.Recipes.Where(r => !ComponentRecipeIds.Contains(r.Id)).ToList();

        private static HashSet<string> ComponentRecipeIds => _componentRecipeIds ??= LoadComponentRecipeIds();

        private static Resource FindResource(string id)
        {
            foreach (var resource in Loaded.Resources)
            {
                if (resource.Id == id) return resource;
            }
            throw new System.InvalidOperationException($"GameContent: resource '{id}' not found in loaded content");
        }

        private static Recipe FindRecipe(string id)
        {
            foreach (var recipe in Loaded.Recipes)
            {
                if (recipe.Id == id) return recipe;
            }
            throw new System.InvalidOperationException($"GameContent: recipe '{id}' not found in loaded content");
        }

        private static RefiningRecipe FindRefiningRecipe(string id)
        {
            foreach (var recipe in Loaded.RefiningRecipes)
            {
                if (recipe.Id == id) return recipe;
            }
            throw new System.InvalidOperationException($"GameContent: refining recipe '{id}' not found in loaded content");
        }

        private static LoadedContent Load()
        {
            var contentDir = Path.Combine(Application.streamingAssetsPath, "Content");
            return ContentLoader.LoadFromFiles(
                Path.Combine(contentDir, "resources.json"),
                Path.Combine(contentDir, "recipes.json"),
                Path.Combine(contentDir, "refiningRecipes.json"),
                Path.Combine(contentDir, "schematics.json"),
                Path.Combine(contentDir, "planets.json"));
        }

        private static HashSet<string> LoadComponentRecipeIds()
        {
            var contentDir = Path.Combine(Application.streamingAssetsPath, "Content");
            var loaded = ShipsContentLoader.LoadFromFile(Path.Combine(contentDir, "componentRecipes.json"));
            return loaded.ComponentRecipes.Select(c => c.RecipeId).ToHashSet();
        }

        // EditMode tests run outside Play mode, where Application
        // .streamingAssetsPath still resolves correctly (it's a project
        // -relative path in the Editor either way) -- but a test that
        // wants a fresh load (e.g. after asserting on a static cache)
        // can force one via this reset hook.
        public static void ResetForTests()
        {
            _loaded = null;
            _componentRecipeIds = null;
        }
    }
}
