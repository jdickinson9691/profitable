import { Ajv } from "ajv";

import type { Resource } from "../data/types/resource.ts";
import type { Recipe } from "../data/types/recipe.ts";
import type { RefiningRecipe } from "../data/types/refiningRecipe.ts";
import type { Schematic } from "../data/types/schematicEntity.ts";
import type { Planet } from "../data/types/planet.ts";

import qualitySchema from "../data/schemas/quality.schema.json" with { type: "json" };
import tierColorSchema from "../data/schemas/tierColor.schema.json" with { type: "json" };
import resourceSchema from "../data/schemas/resource.schema.json" with { type: "json" };
import recipeSchema from "../data/schemas/recipe.schema.json" with { type: "json" };
import refiningRecipeSchema from "../data/schemas/refiningRecipe.schema.json" with { type: "json" };
import schematicSchema from "../data/schemas/schematic.schema.json" with { type: "json" };
import planetSchema from "../data/schemas/planet.schema.json" with { type: "json" };
import planetTypeSchema from "../data/schemas/planetType.schema.json" with { type: "json" };

// Compiled once at module load (a static import, not file I/O performed by
// loadContent() itself) -- consistent with this function's data-in,
// typed-data-out contract.
const ajv = new Ajv({ allErrors: true });
for (const schema of [
  qualitySchema,
  tierColorSchema,
  resourceSchema,
  recipeSchema,
  refiningRecipeSchema,
  schematicSchema,
  planetSchema,
  planetTypeSchema,
]) {
  ajv.addSchema(schema);
}

// Not part of Agent 1's originally-named 6 types -- `refiningRecipes` is
// included alongside `recipes` because Agent 6 produces refining-recipe
// content and RefiningRecipe (added to close that earlier gap) needs
// somewhere to load into. Every section is an array, including `planets`
// (MVP only ever populates it with Delta Rigelus), so multi-planet content
// post-MVP doesn't need a shape change here.
export interface RawContentConfig {
  resources: unknown[];
  recipes: unknown[];
  refiningRecipes: unknown[];
  schematics: unknown[];
  planets: unknown[];
}

export interface LoadedContent {
  resources: Resource[];
  recipes: Recipe[];
  refiningRecipes: RefiningRecipe[];
  schematics: Schematic[];
  planets: Planet[];
}

interface ContentSection {
  key: keyof RawContentConfig;
  schemaId: string;
}

const SECTIONS: ContentSection[] = [
  { key: "resources", schemaId: "resource.schema.json" },
  { key: "recipes", schemaId: "recipe.schema.json" },
  { key: "refiningRecipes", schemaId: "refiningRecipe.schema.json" },
  { key: "schematics", schemaId: "schematic.schema.json" },
  { key: "planets", schemaId: "planet.schema.json" },
];

function isRawContentConfig(value: unknown): value is RawContentConfig {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return SECTIONS.every((section) => Array.isArray(record[section.key]));
}

// Parses/validates already-read raw JSON (matching Agent 1's schemas) into
// typed content objects. No file I/O -- reading the JSON off disk/network
// is the caller's job. The only sanctioned path other agents use to access
// Agent 6's content (never parse/import the raw JSON directly).
export function loadContent(rawConfig: unknown): LoadedContent {
  if (!isRawContentConfig(rawConfig)) {
    throw new Error(
      "loadContent: expected an object with resources/recipes/refiningRecipes/schematics/planets arrays",
    );
  }

  const problems: string[] = [];
  const loaded: Record<string, unknown> = {};

  for (const section of SECTIONS) {
    const validate = ajv.getSchema(section.schemaId);
    if (!validate) {
      throw new Error(`loadContent: no schema registered for ${section.schemaId}`);
    }
    const items = rawConfig[section.key];
    items.forEach((item, index) => {
      if (!validate(item)) {
        const detail = (validate.errors ?? [])
          .map((error) => `${error.instancePath || "(root)"} ${error.message}`)
          .join("; ");
        problems.push(`${section.key}[${index}]: ${detail}`);
      }
    });
    loaded[section.key] = items;
  }

  if (problems.length > 0) {
    throw new Error(`loadContent: invalid config:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }

  return loaded as unknown as LoadedContent;
}
