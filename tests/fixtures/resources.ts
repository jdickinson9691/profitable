import type { Resource } from "../../src/data/types/resource.ts";

// Test fixtures mirroring the MVP content described in GDD SS3.4 / CLAUDE.md
// SS4 -- not the authoritative game content (that's the Content Agent's job,
// content/ validated against src/data/schemas). These exist so Agent 2/3
// tests can exercise rollQuality/refine/craft against realistic shapes
// without waiting on that config.
export const igneousOre: Resource = {
  id: "igneous-ore",
  name: "Igneous Ore",
  category: "solid",
  applicableQualities: {
    purity: true,
    density: true,
    potency: true,
    durability: true,
    rarity: true,
  },
};

export const hydrogenGas: Resource = {
  id: "hydrogen-gas",
  name: "Hydrogen Gas",
  category: "gas",
  applicableQualities: {
    purity: true,
    density: true,
    potency: true,
    durability: false,
    rarity: true,
  },
};

export const autuniteCrystal: Resource = {
  id: "autunite-crystal",
  name: "Autunite Crystal",
  category: "radioactive crystal",
  applicableQualities: {
    purity: false,
    density: true,
    potency: true,
    durability: true,
    rarity: true,
  },
};
