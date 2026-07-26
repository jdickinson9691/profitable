import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { addBatch, totalQuantity } from "../inventory.ts";
import { rollQuality } from "../../simulation/rollQuality.ts";
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

    this.add.text(16, 64, `Gather — ${content.planets[0]?.name ?? "Delta Rigelus"}`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    const resources = this.getGatherableResources();
    let y = 110;
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
    const producibleIds = content.planets[0]?.producibleResourceIds ?? [];
    return producibleIds
      .map((id) => content.resources.find((resource) => resource.id === id))
      .filter((resource): resource is Resource => resource !== undefined);
  }

  private gather(resource: Resource): void {
    const roll = rollQuality(resource);
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
