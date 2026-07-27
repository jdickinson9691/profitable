import { Ajv } from "ajv";

import type { ComponentRecipe } from "../data/types/componentRecipe.ts";

import componentCategorySchema from "../data/schemas/componentCategory.schema.json" with { type: "json" };
import componentRecipeSchema from "../data/schemas/componentRecipe.schema.json" with { type: "json" };

// Necessary completion: Agent 22's contract forbids reading Agent 23's raw
// content JSON directly ("must not read... Agent 23's raw content JSON
// directly") but nothing in Agent 20's own contract named a loading path
// -- same category of gap that produced loadContent.ts (MVP) and
// loadTradingContent.ts (Phase 3) mid-build. Mirrors loadTradingContent.ts's
// exact shape: data-in, validated typed-data-out, no file I/O.
//
// componentRecipes is the only section here -- the component *recipes*
// themselves (weapon-component, engine-component, etc.) are ordinary
// Recipe entries in content/recipes.json, loaded through the existing
// loadContent() pipeline unchanged, since Recipe itself needed no
// modification (see componentRecipe.ts's own comment). Only the new
// recipeId -> ComponentCategory link data needs a Phase-5-specific path.
const ajv = new Ajv({ allErrors: true });
for (const schema of [componentCategorySchema, componentRecipeSchema]) {
  ajv.addSchema(schema);
}

export interface RawShipsContentConfig {
  componentRecipes: unknown[];
}

export interface LoadedShipsContent {
  componentRecipes: ComponentRecipe[];
}

function isRawShipsContentConfig(value: unknown): value is RawShipsContentConfig {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as Record<string, unknown>).componentRecipes);
}

export function loadShipsContent(rawConfig: unknown): LoadedShipsContent {
  if (!isRawShipsContentConfig(rawConfig)) {
    throw new Error("loadShipsContent: expected an object with a componentRecipes array");
  }

  const validate = ajv.getSchema("componentRecipe.schema.json");
  if (!validate) {
    throw new Error("loadShipsContent: no schema registered for componentRecipe.schema.json");
  }

  const problems: string[] = [];
  rawConfig.componentRecipes.forEach((item, index) => {
    if (!validate(item)) {
      const detail = (validate.errors ?? [])
        .map((error) => `${error.instancePath || "(root)"} ${error.message}`)
        .join("; ");
      problems.push(`componentRecipes[${index}]: ${detail}`);
    }
  });

  if (problems.length > 0) {
    throw new Error(`loadShipsContent: invalid config:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }

  return { componentRecipes: rawConfig.componentRecipes as ComponentRecipe[] };
}
