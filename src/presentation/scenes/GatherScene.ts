import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { getCurrentPlanet } from "../currentPlanet.ts";
import { addBatch, totalQuantity } from "../inventory.ts";
import { rollQualityOnPlanet } from "../../galaxy/rollQualityOnPlanet.ts";
import { formatQualityRoll, formatQualityLabel } from "../display.ts";
import type { Resource } from "../../data/types/resource.ts";
import type { Planet } from "../../data/types/planet.ts";

export class GatherScene extends Phaser.Scene {
  private resultText?: Phaser.GameObjects.Text;
  private inventoryText?: Phaser.GameObjects.Text;

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

    this.add.text(16, 64, `Gather — ${planet.name}`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    const specialtyResource = content.resources.find(
      (r) => r.id === planet.specialtyResourceId,
    );
    const tierLine = `${planet.tier ?? "?"} tier` +
      (specialtyResource ? ` — specialty: ${specialtyResource.name}` : "");
    this.add.text(16, 90, tierLine, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffd700",
    });

    const resources = this.getGatherableResources(planet);
    let y = 120;
    for (const resource of resources) {
      const button = this.add.text(16, y, `> Gather ${resource.name}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#4caf50",
      });
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.gather(resource, planet));
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

    this.refreshInventoryDisplay(planet);
  }

  private getGatherableResources(planet: Planet): Resource[] {
    const producibleIds = planet.producibleResourceIds;
    return producibleIds
      .map((id) => content.resources.find((resource) => resource.id === id))
      .filter((resource): resource is Resource => resource !== undefined);
  }

  private gather(resource: Resource, planet: Planet): void {
    const roll = rollQualityOnPlanet(resource, planet);
    const inventory = addBatch(getInventory(), {
      resourceId: resource.id,
      quantity: 1,
      qualities: roll,
    });
    setInventory(inventory);

    const lines = formatQualityRoll(roll).map(formatQualityLabel);
    this.resultText?.setText([`Gathered 1x ${resource.name}:`, ...lines]);
    this.refreshInventoryDisplay(planet);
  }

  private refreshInventoryDisplay(planet: Planet): void {
    const inventory = getInventory();
    const lines = this.getGatherableResources(planet).map(
      (resource) => `${resource.name}: ${totalQuantity(inventory, resource.id)}`,
    );
    this.inventoryText?.setText(["Inventory:", ...lines]);
  }
}
