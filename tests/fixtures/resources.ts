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

// Refined from 2x Igneous Ore + 1x Autunite Crystal (GDD §3.4). Igneous Ore
// covers every dimension, so the refined output has all 5 applicable.
export const radiantAlloyBar: Resource = {
  id: "radiant-alloy-bar",
  name: "Radiant Alloy Bar",
  category: "refined-metal",
  itemTier: 2,
  applicableQualities: {
    purity: true,
    density: true,
    potency: true,
    durability: true,
    rarity: true,
  },
};

// Mirrors a real content/resources.json collision (see generatePlanet.ts's
// getEligibleResources() fix comment): content/README.md's own convention
// sets a refined/crafted resource's `category` to its own id, and this
// crafted item's id happens to contain "crystal" -- a broad Planet Type
// eligibility category substring -- purely by name coincidence, the same
// way the real roster's "master-crystal-array" (itemTier 3) does. Exists
// so a test can assert this is excluded by itemTier, not just by category
// mismatch (radiantAlloyBar's "refined-metal" category never collided in
// the first place, so it couldn't catch this class of bug).
export const crystalCraftedDecoy: Resource = {
  id: "master-crystal-array",
  name: "Master Crystal Array (test decoy)",
  category: "master-crystal-array",
  itemTier: 3,
  applicableQualities: {
    purity: true,
    density: true,
    potency: true,
    durability: true,
    rarity: true,
  },
};
