import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { startingPlanet } from "../galaxyState.ts";
import { addBatch, totalQuantity } from "../inventory.ts";
import { rollQualityOnPlanet } from "../../galaxy/rollQualityOnPlanet.ts";
import { formatQualityRoll, formatQualityLabel } from "../display.ts";
import type { Resource } from "../../data/types/resource.ts";

export class GatherScene extends Phaser.Scene {
  private resultText?: Phaser.GameObjects.Text;
  private inventoryText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.gather);
  }

  create(): void {
    renderNav(this, SCENE_KEYS.gather);

    this.add.text(16, 64, `Gather — ${startingPlanet.name}`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    const specialtyResource = content.resources.find(
      (r) => r.id === startingPlanet.specialtyResourceId,
    );
    const tierLine = `${startingPlanet.tier ?? "?"} tier` +
      (specialtyResource ? ` — specialty: ${specialtyResource.name}` : "");
    this.add.text(16, 90, tierLine, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffd700",
    });

    const resources = this.getGatherableResources();
    let y = 120;
    for (const resource of resources) {
      const button = this.add.text(16, y, `> Gather ${resource.name}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#4caf50",
      });
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.gather(resource));
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

    this.refreshInventoryDisplay();
  }

  private getGatherableResources(): Resource[] {
    const producibleIds = startingPlanet.producibleResourceIds;
    return producibleIds
      .map((id) => content.resources.find((resource) => resource.id === id))
      .filter((resource): resource is Resource => resource !== undefined);
  }

  private gather(resource: Resource): void {
    const roll = rollQualityOnPlanet(resource, startingPlanet);
    const inventory = addBatch(getInventory(), {
      resourceId: resource.id,
      quantity: 1,
      qualities: roll,
    });
    setInventory(inventory);

    const lines = formatQualityRoll(roll).map(formatQualityLabel);
    this.resultText?.setText([`Gathered 1x ${resource.name}:`, ...lines]);
    this.refreshInventoryDisplay();
  }

  private refreshInventoryDisplay(): void {
    const inventory = getInventory();
    const lines = this.getGatherableResources().map(
      (resource) => `${resource.name}: ${totalQuantity(inventory, resource.id)}`,
    );
    this.inventoryText?.setText(["Inventory:", ...lines]);
  }
}
