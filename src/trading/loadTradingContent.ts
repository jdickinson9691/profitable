import { Ajv } from "ajv";

import type { ItemBasePrice } from "../data/types/itemBasePrice.ts";
import type { PlanetMarketPreference } from "../data/types/planetMarketPreference.ts";

import planetTypeSchema from "../data/schemas/planetType.schema.json" with { type: "json" };
import itemBasePriceSchema from "../data/schemas/itemBasePrice.schema.json" with { type: "json" };
import planetMarketPreferenceSchema from "../data/schemas/planetMarketPreference.schema.json" with { type: "json" };

// Necessary completion: Agent 13's contract forbids reading Agent 14's raw
// content JSON directly ("content should be accessed through Agent 11's/
// Agent 2's established loading paths") but nothing in Agent 11's own
// contract names a loading path -- same category of gap that produced
// src/simulation/loadContent.ts mid-build for the MVP. This mirrors that
// function's shape exactly: data-in, validated typed-data-out, no file I/O.
const ajv = new Ajv({ allErrors: true });
for (const schema of [planetTypeSchema, itemBasePriceSchema, planetMarketPreferenceSchema]) {
  ajv.addSchema(schema);
}

export interface RawTradingContentConfig {
  tradingBasePrices: unknown[];
  planetMarketPreferences: unknown[];
}

export interface LoadedTradingContent {
  tradingBasePrices: ItemBasePrice[];
  planetMarketPreferences: PlanetMarketPreference[];
}

interface ContentSection {
  key: keyof RawTradingContentConfig;
  schemaId: string;
}

const SECTIONS: ContentSection[] = [
  { key: "tradingBasePrices", schemaId: "itemBasePrice.schema.json" },
  { key: "planetMarketPreferences", schemaId: "planetMarketPreference.schema.json" },
];

function isRawTradingContentConfig(value: unknown): value is RawTradingContentConfig {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return SECTIONS.every((section) => Array.isArray(record[section.key]));
}

export function loadTradingContent(rawConfig: unknown): LoadedTradingContent {
  if (!isRawTradingContentConfig(rawConfig)) {
    throw new Error(
      "loadTradingContent: expected an object with tradingBasePrices/planetMarketPreferences arrays",
    );
  }

  const problems: string[] = [];
  const loaded: Record<string, unknown> = {};

  for (const section of SECTIONS) {
    const validate = ajv.getSchema(section.schemaId);
    if (!validate) {
      throw new Error(`loadTradingContent: no schema registered for ${section.schemaId}`);
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
    throw new Error(`loadTradingContent: invalid config:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }

  return loaded as unknown as LoadedTradingContent;
}
