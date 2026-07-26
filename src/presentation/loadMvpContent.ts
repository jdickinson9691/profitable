import { loadContent } from "../simulation/loadContent.ts";
import type { LoadedContent } from "../simulation/loadContent.ts";

// The one place Presentation touches Agent 6's raw JSON -- imported
// statically (bundled by Vite) and handed straight to loadContent()
// without any manual parsing/interpretation of its shape. Everywhere else
// in src/presentation only ever sees the typed LoadedContent this returns.
import resources from "../../content/resources.json" with { type: "json" };
import recipes from "../../content/recipes.json" with { type: "json" };
import refiningRecipes from "../../content/refiningRecipes.json" with { type: "json" };
import schematics from "../../content/schematics.json" with { type: "json" };
import planets from "../../content/planets.json" with { type: "json" };

let cached: LoadedContent | null = null;

export function loadMvpContent(): LoadedContent {
  if (!cached) {
    cached = loadContent({ resources, recipes, refiningRecipes, schematics, planets });
  }
  return cached;
}
