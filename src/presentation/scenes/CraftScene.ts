import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { renderTierSelector } from "./tierSelector.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { consume, addBatch, totalQuantity } from "../inventory.ts";
import type { InventoryBatch } from "../inventory.ts";
import { craft } from "../../simulation/craft.ts";
import { resolveSchematicTier } from "../../simulation/schematicTier.ts";
import { formatQualityRoll, formatQualityLabel, describeCraftResult } from "../display.ts";
import type { TierColor } from "../../data/types/tierColor.ts";
import type { ResourceInstance } from "../../data/types/resourceInstance.ts";
import type { Resource } from "../../data/types/resource.ts";

export class CraftScene extends Phaser.Scene {
  private selectedCrafterTier: TierColor = "Grey";
  private statusText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.craft);
  }

  create(): void {
    renderNav(this, SCENE_KEYS.craft);

    const recipe = content.recipes[0];
    const schematic = content.schematics.find((s) => s.recipeId === recipe?.id);
    const schematicTier = resolveSchematicTier(schematic);

    this.add.text(16, 64, `Craft — ${recipe?.name ?? "Ion-Forged Hull Plate"}`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    // Known-by-default recipes (docs/profitable-alpha-content-roster.md
    // §5) have no owned Schematic entity at all -- resolveSchematicTier()
    // resolves that to Grey (no bonus), not a blocked/error state.
    this.add.text(
      16,
      100,
      `Schematic tier: ${schematicTier}${schematic ? "" : " (no schematic owned -- Grey-equivalent, no bonus)"}`,
      {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffd700",
      },
    );

    this.statusText = this.add.text(16, 130, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cccccc",
    });

    this.add.text(16, 250, "Crafter tier:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    renderTierSelector(this, 16, 270, this.selectedCrafterTier, (tier) => {
      this.selectedCrafterTier = tier;
      this.scene.restart();
    });

    const craftButton = this.add.text(16, 300, "> Craft", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#4caf50",
    });
    craftButton.setInteractive({ useHandCursor: true });
    craftButton.on("pointerdown", () => this.doCraft());

    this.resultText = this.add.text(16, 340, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.refreshStatus();
  }

  // Crafting recipes are category-based, not resource-id-based (GDD:
  // "not fixed to specific materials"). The MVP content only ever has one
  // resource per relevant category, so resolving the first match is a
  // reasonable presentation-layer simplification for this content -- it's
  // inventory/UI bookkeeping, not part of craft()'s own formula.
  private resolveSlotResource(category: string): Resource | undefined {
    return content.resources.find((resource) => resource.category === category);
  }

  private hasEnoughInputs(): boolean {
    const recipe = content.recipes[0];
    if (!recipe) return false;
    const inventory = getInventory();
    return recipe.inputs.every((slot) => {
      const resource = this.resolveSlotResource(slot.category);
      return resource !== undefined && totalQuantity(inventory, resource.id) >= slot.quantity;
    });
  }

  private refreshStatus(): void {
    const recipe = content.recipes[0];
    if (!recipe) {
      this.statusText?.setText("No crafting recipe loaded.");
      return;
    }
    const inventory = getInventory();
    const lines = recipe.inputs.map((slot) => {
      const resource = this.resolveSlotResource(slot.category);
      const have = resource ? totalQuantity(inventory, resource.id) : 0;
      return `${resource?.name ?? slot.category}: ${have} / ${slot.quantity} needed`;
    });
    const craftedCount = totalQuantity(inventory, recipe.outputResourceId);
    this.statusText?.setText(["Requires:", ...lines, `Already crafted: ${craftedCount}`]);
  }

  private doCraft(): void {
    const recipe = content.recipes[0];
    const schematic = content.schematics.find((s) => s.recipeId === recipe?.id);
    // A missing schematic is not a blocking condition -- known-by-default
    // recipes have none by design (resolveSchematicTier() resolves that
    // to Grey, the correct no-bonus default). Only missing inputs/recipe
    // actually block a craft attempt.
    if (!recipe || !this.hasEnoughInputs()) {
      this.resultText?.setText("Not enough materials gathered/refined yet.");
      return;
    }
    const schematicTier = resolveSchematicTier(schematic);

    let inventory = getInventory();
    const inputs: ResourceInstance[] = [];
    const consumedBySlot: InventoryBatch[][] = [];

    for (const slot of recipe.inputs) {
      const resource = this.resolveSlotResource(slot.category);
      if (!resource) continue;
      const { inventory: remaining, consumed } = consume(inventory, resource.id, slot.quantity);
      inventory = remaining;
      consumedBySlot.push(consumed);
      for (const batch of consumed) {
        inputs.push({ resource, quantity: batch.quantity, qualities: batch.qualities });
      }
    }

    const result = craft(inputs, recipe, schematicTier, this.selectedCrafterTier);

    if (!result.accepted) {
      // A rejected craft never happened -- give the consumed materials
      // back rather than silently destroying them.
      for (const batches of consumedBySlot) {
        for (const batch of batches) {
          inventory = addBatch(inventory, batch);
        }
      }
      setInventory(inventory);
      this.resultText?.setText(describeCraftResult(result));
      this.refreshStatus();
      return;
    }

    const outputResource = content.resources.find((r) => r.id === recipe.outputResourceId);
    inventory = addBatch(inventory, {
      resourceId: recipe.outputResourceId,
      quantity: recipe.outputQuantity,
      qualities: result.qualities,
    });
    setInventory(inventory);

    const lines = formatQualityRoll(result.qualities).map(formatQualityLabel);
    this.resultText?.setText([
      `Crafted 1x ${outputResource?.name ?? recipe.outputResourceId}:`,
      describeCraftResult(result),
      ...lines,
    ]);

    this.refreshStatus();
  }
}
