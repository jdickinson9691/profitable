import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { renderTierSelector } from "./tierSelector.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { consume, addBatch, totalQuantity } from "../inventory.ts";
import type { InventoryBatch } from "../inventory.ts";
import { getShipRoster, replaceShip, getShipsContent } from "../shipsState.ts";
import { craft } from "../../simulation/craft.ts";
import { computeAggregateTier } from "../../simulation/aggregateTier.ts";
import { assembleShip } from "../../ships/assembleShip.ts";
import { COMPONENT_CATEGORIES } from "../../data/types/componentCategory.ts";
import type { ComponentCategory } from "../../data/types/componentCategory.ts";
import type { Ship } from "../../data/types/ship.ts";
import type { Recipe } from "../../data/types/recipe.ts";
import type { ShipComponent } from "../../data/types/shipComponent.ts";
import type { ResourceInstance } from "../../data/types/resourceInstance.ts";
import type { TierColor } from "../../data/types/tierColor.ts";

// Agent 22 (Ships & Travel Presentation), Phase 5 GDD §2.1/§2.3/§2.5.
// Crafts a component in place (calling craft() directly against player
// inventory, then wrapping its output into a real ShipComponent and
// installing it via assembleShip()) rather than routing through
// CraftScene.ts -- the same "craft via a scene other than CraftScene" shape
// CrewScene.onAssign() already established, adapted for a ship-component
// output instead of a crew-member's craft.
//
// Necessary completion: component recipes have no Schematic entity behind
// them (only the MVP's own ion-forged-hull-plate recipe does -- see
// content/README.md's Phase 5 section), so there's no schematic.tier to
// read the way CraftScene/CrewScene do. schematicTier is instead player-
// selected directly, the same way crafterTier already is, via a second
// tier selector.
export class ShipAssemblyScene extends Phaser.Scene {
  private selectedCrafterTier: TierColor = "Grey";
  private selectedSchematicTier: TierColor = "Grey";
  private statusText?: Phaser.GameObjects.Text;
  private pendingMessage = "";

  constructor() {
    super(SCENE_KEYS.shipAssembly);
  }

  create(): void {
    this.redraw();
  }

  private setStatus(message: string): void {
    this.pendingMessage = message;
    this.statusText?.setText(message);
  }

  // Same "resolve category to the first matching content resource"
  // simplification CraftScene/CrewScene already use -- MVP content only
  // ever has one resource per relevant category.
  private resolveSlotResource(category: string) {
    return content.resources.find((resource) => resource.category === category);
  }

  private findRecipeForCategory(category: ComponentCategory): Recipe | undefined {
    const link = getShipsContent().componentRecipes.find((entry) => entry.category === category);
    if (!link) return undefined;
    return content.recipes.find((recipe) => recipe.id === link.recipeId);
  }

  private hasEnoughInputs(recipe: Recipe): boolean {
    const inventory = getInventory();
    return recipe.inputs.every((slot) => {
      const resource = this.resolveSlotResource(slot.category);
      return resource !== undefined && totalQuantity(inventory, resource.id) >= slot.quantity;
    });
  }

  private redraw(): void {
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.shipAssembly);

    this.add.text(16, 64, "Ship Assembly", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" });

    this.add.text(16, 96, "Crafter tier:", { fontFamily: "monospace", fontSize: "14px", color: "#ffffff" });
    renderTierSelector(this, 140, 96, this.selectedCrafterTier, (tier) => {
      this.selectedCrafterTier = tier;
      this.redraw();
    });
    this.add.text(16, 120, "Schematic tier:", { fontFamily: "monospace", fontSize: "14px", color: "#ffffff" });
    renderTierSelector(this, 160, 120, this.selectedSchematicTier, (tier) => {
      this.selectedSchematicTier = tier;
      this.redraw();
    });

    let y = 156;
    const roster = getShipRoster();
    if (roster.length === 0) {
      this.add.text(16, y, "(no ships owned yet -- purchase one at the Shipyard)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
      y += 22;
    }
    for (const ship of roster) {
      y = this.renderShip(ship, y);
      y += 12;
    }

    this.statusText = this.add.text(16, 460, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
  }

  private renderShip(ship: Ship, startY: number): number {
    let y = startY;
    this.add.text(16, y, `${ship.name} — ${ship.tier} tier`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd700",
    });
    y += 22;

    for (const category of COMPONENT_CATEGORIES) {
      const installed = ship.components[category];
      const label = installed ? `${category}: ${installed.tier} tier` : `${category}: (empty)`;
      this.add.text(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });

      const recipe = this.findRecipeForCategory(category);
      const canCraft = recipe !== undefined && this.hasEnoughInputs(recipe);
      const craftBtn = this.add.text(420, y, "> Craft & Install", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: canCraft ? "#4caf50" : "#555555",
      });
      if (canCraft) {
        craftBtn.setInteractive({ useHandCursor: true });
        craftBtn.on("pointerdown", () => this.onCraftAndInstall(ship, category, recipe!));
      }
      y += 20;
    }
    return y;
  }

  private onCraftAndInstall(ship: Ship, category: ComponentCategory, recipe: Recipe): void {
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

    const result = craft(inputs, recipe, this.selectedSchematicTier, this.selectedCrafterTier);

    if (!result.accepted) {
      // A rejected craft never happened -- give the consumed materials
      // back, same rollback CraftScene already performs.
      for (const batches of consumedBySlot) {
        for (const batch of batches) {
          inventory = addBatch(inventory, batch);
        }
      }
      setInventory(inventory);
      this.setStatus(`Craft rejected: ${result.reason}`);
      this.redraw();
      return;
    }

    setInventory(inventory);

    const tier = computeAggregateTier(result.qualities) ?? "Grey";
    const component: ShipComponent = {
      id: `component-${ship.id}-${category}-${Date.now()}`,
      category,
      qualities: result.qualities,
      tier,
    };

    const updatedShip = assembleShip(ship, component, category);
    replaceShip(updatedShip);
    this.setStatus(`Installed a ${tier} ${category} component. Ship tier now ${updatedShip.tier}.`);
    this.redraw();
  }
}
