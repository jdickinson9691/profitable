import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveShipTier } from "../../src/ships/deriveShipTier.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { ShipComponent } from "../../src/data/types/shipComponent.ts";

function component(tier: ShipComponent["tier"], category: ShipComponent["category"]): ShipComponent {
  return { id: `${category}-1`, category, qualities: { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 }, tier };
}

function ship(overrides: Partial<Ship["components"]> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "delta-rigelus",
    components: { weapon: null, engine: null, shield: null, cargoHold: null, ...overrides },
  };
}

test("deriveShipTier() computes a straight average of installed component tiers via getTierColor()", () => {
  // Blue (76-85, midpoint 80.5) x4 -> average 80.5 -> Blue.
  const s = ship({
    weapon: component("Blue", "weapon"),
    engine: component("Blue", "engine"),
    shield: component("Blue", "shield"),
    cargoHold: component("Blue", "cargoHold"),
  });
  assert.equal(deriveShipTier(s), "Blue");
});

test("deriveShipTier() averages mixed component tiers correctly", () => {
  // Grey (midpoint 20.5) + Gold (midpoint 98.5) -> average 59.5 -> White (41-60).
  const s = ship({
    weapon: component("Grey", "weapon"),
    engine: component("Gold", "engine"),
  });
  assert.equal(deriveShipTier(s), "White");
});

test("deriveShipTier() excludes null slots from the average rather than treating them as a penalty", () => {
  // Only one Gold component installed (midpoint 98.5) -> Gold, not dragged
  // down by the 3 empty slots.
  const s = ship({ engine: component("Gold", "engine") });
  assert.equal(deriveShipTier(s), "Gold");
});

test("deriveShipTier() falls back to Grey for a ship with zero components installed", () => {
  const s = ship();
  assert.equal(deriveShipTier(s), "Grey");
});
