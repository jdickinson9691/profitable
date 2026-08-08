import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { getCurrentPlanet } from "../currentPlanet.ts";
import { startingPlanet } from "../galaxyState.ts";
import { addBatch, totalQuantity } from "../inventory.ts";
import { getCurrentPlanetResources, getPlanetResourceCycleIndex } from "../../galaxy/planetResourceCycle.ts";
import type { ResourcesForCycle } from "../../galaxy/planetResourceCycle.ts";
import { getRemainingQuantity } from "../../galaxy/resourceDepletion.ts";
import { getResourceDepletionEntry, recordResourceGather } from "../resourceDepletionState.ts";
import { formatQualityRoll, formatQualityLabel } from "../display.ts";
import { renderOnboardingStep } from "./onboardingOverlay.ts";
import { getWallet, setWallet } from "../tradingState.ts";
import { getShipRoster } from "../shipsState.ts";
import { getPlanetOwnershipEntry, setPlanetOwnershipEntry } from "../planetOwnershipState.ts";
import { transportColonists } from "../../planets/transportColonists.ts";
import { MINIMUM_COLONISTS_TO_PRODUCE } from "../../data/constants/planetOwnership.ts";
import type { Resource } from "../../data/types/resource.ts";
import type { Planet } from "../../data/types/planet.ts";

// Planet Resource Generation amendment: gathering is now a deterministic
// read + inventory write -- no roll happens in this scene's own action
// path anymore. getCurrentPlanetResources() is the single source of truth
// for "what's producible, and at what quality, right now" -- this scene
// reads it once per create() and never rolls or recomputes quality itself.
export class GatherScene extends Phaser.Scene {
  private resultText?: Phaser.GameObjects.Text;
  private inventoryText?: Phaser.GameObjects.Text;
  // Per-Resource Quantity Caps: one row per producible resource, keyed by
  // resource id, so a gather action that depletes a resource to zero can
  // update just that row in place -- swapping its text/color and dropping
  // interactivity -- rather than restarting the whole scene and losing the
  // just-gathered result feedback below it.
  private gatherRows = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super(SCENE_KEYS.gather);
  }

  create(): void {
    renderNav(this, SCENE_KEYS.gather);

    // Planet-aware fix: reads wherever the player's ship currently is
    // (previously hardcoded to startingPlanet, so gathering never reflected
    // travel). Read once per create() -- scene.start()/scene.restart()
    // re-runs create() fresh on every visit, so this can't go stale within
    // a single visit to the scene.
    const planet = getCurrentPlanet();
    const isStartingPlanet = planet.id === startingPlanet.id;
    const now = Date.now();
    const current = getCurrentPlanetResources(planet, content.resources, now, isStartingPlanet);
    // Same (planetId, now) pair getCurrentPlanetResources() itself derived
    // its cycle from -- computed again here (cheap, pure, no persisted
    // state either) so depletion lookups below key off the identical cycle.
    const cycleIndex = getPlanetResourceCycleIndex(planet.id, now);
    this.gatherRows = new Map();

    this.add.text(16, 64, `Gather — ${planet.name}`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    const specialtyResource = content.resources.find(
      (r) => r.id === current.specialtyResourceId,
    );
    const tierLine = `${planet.tier ?? "?"} tier` +
      (specialtyResource ? ` — specialty: ${specialtyResource.name}` : "");
    this.add.text(16, 90, tierLine, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffd700",
    });

    let y = 120;
    y = this.renderOwnershipSection(planet, y);

    const resources = this.getGatherableResources(current);
    for (const resource of resources) {
      const cap = current.resourceQuantityCaps[resource.id] ?? null;
      const entry = getResourceDepletionEntry(planet.id, resource.id);
      const remaining = getRemainingQuantity(cap, entry, cycleIndex);
      this.gatherRows.set(resource.id, this.renderGatherRow(resource, remaining, y, planet, current, cycleIndex));
      y += 30;
    }

    this.resultText = this.add.text(16, y + 20, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.inventoryText = this.add.text(420, 110, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cccccc",
    });

    this.refreshInventoryDisplay(current);

    renderOnboardingStep(
      this,
      "Gather",
      "This is your starting planet. Click a \"> Gather <resource>\" button to collect a raw resource and see its quality roll.",
      () => this.scene.restart(),
    );
  }

  // Colonist-Driven Production (planet-ownership.md). Minimal presentation
  // hook -- without this, the colonist gate would make every non-bootstrap
  // planet permanently unminable with no player-facing way to unlock one,
  // a real regression to playability, not just an unfinished feature.
  // Returns the y position to continue rendering from.
  //
  // Retroactive removal (2026-08-04): this used to also render Claim
  // Planet / Build Citadel Level N actions once colonized -- see
  // planet-ownership.md's own retroactive note. Colonist-Driven Production
  // never depended on either, so nothing else here changes.
  private renderOwnershipSection(planet: Planet, y: number): number {
    const entry = getPlanetOwnershipEntry(planet.id);

    if (entry.colonistCount < MINIMUM_COLONISTS_TO_PRODUCE) {
      const needed = MINIMUM_COLONISTS_TO_PRODUCE - entry.colonistCount;
      this.add.text(16, y, `Uncolonized (${entry.colonistCount}/${MINIMUM_COLONISTS_TO_PRODUCE} colonists) — nothing gatherable yet`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ff8888",
      });
      y += 22;
      const button = this.add.text(16, y, `> Transport ${needed} Colonists`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#2196f3",
      });
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.transportColonistsAction(planet, needed));
      return y + 30;
    }

    this.add.text(16, y, `Colonized (${entry.colonistCount} colonists)`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#88ff88",
    });
    return y + 22;
  }

  private transportColonistsAction(planet: Planet, quantity: number): void {
    const ship = getShipRoster()[0];
    if (!ship) return;
    const entry = getPlanetOwnershipEntry(planet.id);
    const result = transportColonists(ship, planet, quantity, getWallet(), entry);
    if (!result.success) {
      this.resultText?.setText(`Transport failed: ${result.reason}`);
      return;
    }
    setWallet(result.updatedWallet);
    setPlanetOwnershipEntry(planet.id, result.updatedOwnershipEntry);
    this.scene.restart();
  }

  private getGatherableResources(current: ResourcesForCycle): Resource[] {
    return current.producibleResourceIds
      .map((id) => content.resources.find((resource) => resource.id === id))
      .filter((resource): resource is Resource => resource !== undefined);
  }

  // Per-Resource Quantity Caps: remaining === 0 renders a plain, non-
  // interactive "depleted until reset" line instead of a clickable button --
  // never a button that silently no-ops on click. remaining === null means
  // uncapped (either no cap table entry, or the tutorial-guarantee
  // exemption) -- renders as a normal button unconditionally.
  private renderGatherRow(
    resource: Resource,
    remaining: number | null,
    y: number,
    planet: Planet,
    current: ResourcesForCycle,
    cycleIndex: number,
  ): Phaser.GameObjects.Text {
    if (remaining === 0) {
      return this.renderDepletedRow(resource, y);
    }
    const button = this.add.text(16, y, `> Gather ${resource.name}`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#4caf50",
    });
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.gather(resource, planet, current, cycleIndex));
    return button;
  }

  private renderDepletedRow(resource: Resource, y: number): Phaser.GameObjects.Text {
    return this.add.text(16, y, `${resource.name}: depleted until reset`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#888888",
    });
  }

  private gather(resource: Resource, planet: Planet, current: ResourcesForCycle, cycleIndex: number): void {
    const roll = current.resourceQualities[resource.id];
    if (!roll) return; // resource came from current.producibleResourceIds -- should always have a roll

    const cap = current.resourceQuantityCaps[resource.id] ?? null;
    const entryBefore = getResourceDepletionEntry(planet.id, resource.id);
    const remainingBefore = getRemainingQuantity(cap, entryBefore, cycleIndex);
    // Defensive guard only -- unreachable in normal play, since a depleted
    // resource's row is never rendered as a clickable button in the first
    // place (renderGatherRow() above).
    if (remainingBefore === 0) return;

    const inventory = addBatch(getInventory(), {
      resourceId: resource.id,
      quantity: 1,
      qualities: roll,
    });
    setInventory(inventory);

    // Uncapped resources (cap === null) never need a depletion entry --
    // nothing to track against, so skip persisting one at all.
    if (cap !== null) {
      recordResourceGather(planet.id, resource.id, cycleIndex, 1);
      const entryAfter = getResourceDepletionEntry(planet.id, resource.id);
      const remainingAfter = getRemainingQuantity(cap, entryAfter, cycleIndex);
      if (remainingAfter === 0) {
        this.markDepleted(resource);
      }
    }

    const lines = formatQualityRoll(roll).map(formatQualityLabel);
    this.resultText?.setText([`Gathered 1x ${resource.name}:`, ...lines]);
    this.refreshInventoryDisplay(current);
  }

  // Swaps a single row from a clickable button to the depleted label in
  // place -- deliberately not a full this.scene.restart(), which would
  // wipe the "Gathered 1x ..." feedback this same action just set.
  private markDepleted(resource: Resource): void {
    const row = this.gatherRows.get(resource.id);
    if (!row) return;
    row.disableInteractive();
    row.removeAllListeners();
    row.setText(`${resource.name}: depleted until reset`);
    row.setColor("#888888");
  }

  private refreshInventoryDisplay(current: ResourcesForCycle): void {
    const inventory = getInventory();
    const lines = this.getGatherableResources(current).map(
      (resource) => `${resource.name}: ${totalQuantity(inventory, resource.id)}`,
    );
    this.inventoryText?.setText(["Inventory:", ...lines]);
  }
}
