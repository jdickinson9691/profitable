import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { startingPlanet } from "../galaxyState.ts";
import { consume, addBatch } from "../inventory.ts";
import { getWallet, setWallet, PLAYER_ID } from "../tradingState.ts";
import {
  getCrewCapacity,
  setCrewCapacity,
  getCrewRoster,
  addCrewMember,
  replaceCrewMember,
  removeCrewMember,
  getCrewPool,
  setCrewPool,
} from "../crewState.ts";
import { hireCrew } from "../../crew/hireCrew.ts";
import { assignToCraft } from "../../crew/assignToCraft.ts";
import { resolveBackgroundCrafting } from "../../crew/resolveBackgroundCrafting.ts";
import { payUpkeep } from "../../crew/payUpkeep.ts";
import { checkAttrition } from "../../crew/checkAttrition.ts";
import { dismissCrew } from "../../crew/dismissCrew.ts";
import { purchaseCapacity } from "../../crew/purchaseCapacity.ts";
import { CREW_HIRE_COST_BY_TIER } from "../../data/constants/crewConfig.ts";
import type { CrewCandidate } from "../../data/types/crewCandidate.ts";
import type { CrewMember } from "../../data/types/crewMember.ts";
import type { CraftAction } from "../../data/types/craftAction.ts";
import type { ResourceInstance } from "../../data/types/resourceInstance.ts";
import type { HireSucceeded } from "../../data/types/hireResult.ts";
import type { AssignSucceeded } from "../../data/types/assignResult.ts";
import type { PurchaseCapacitySucceeded } from "../../data/types/purchaseCapacityResult.ts";

// Agent 18 (Crew Presentation). Every number shown is sourced directly
// from Agent 16's actual function outputs -- this scene formats and
// dispatches, never recomputes crew math itself. No "risk of losing this
// crew member" messaging anywhere (Section 2.7 has no random-loss
// mechanic; departure is shown only after checkAttrition() actually
// reports it).
export class CrewScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  // Bug fix (found during this agent's own Phase 4 integration playtest,
  // in this same scene) -- see MarketScene.ts's identical fix comment.
  private pendingMessage = "";

  constructor() {
    super(SCENE_KEYS.crew);
  }

  create(): void {
    this.redraw();
  }

  private setStatus(message: string): void {
    this.pendingMessage = message;
    this.statusText?.setText(message);
  }

  // The one fixed MVP crafting recipe -- same "resolve category to the
  // first matching content resource" simplification CraftScene already
  // uses, since MVP content only ever has one resource per relevant
  // category. Crew members draw from the same shared player inventory as
  // the player's own crafting; there's no separate per-crafter stockpile.
  private resolveSlotResource(category: string) {
    return content.resources.find((resource) => resource.category === category);
  }

  private hasEnoughInputs(): boolean {
    const recipe = content.recipes[0];
    if (!recipe) return false;
    const inventory = getInventory();
    return recipe.inputs.every((slot) => {
      const resource = this.resolveSlotResource(slot.category);
      if (!resource) return false;
      const total = inventory
        .filter((batch) => batch.resourceId === resource.id)
        .reduce((sum, batch) => sum + batch.quantity, 0);
      return total >= slot.quantity;
    });
  }

  private buildCraftAction(id: string): CraftAction | null {
    const recipe = content.recipes[0];
    const schematic = content.schematics.find((s) => s.recipeId === recipe?.id);
    if (!recipe || !schematic || !this.hasEnoughInputs()) return null;

    let inventory = getInventory();
    const inputs: ResourceInstance[] = [];
    for (const slot of recipe.inputs) {
      const resource = this.resolveSlotResource(slot.category);
      if (!resource) continue;
      const { inventory: remaining, consumed } = consume(inventory, resource.id, slot.quantity);
      inventory = remaining;
      for (const batch of consumed) {
        inputs.push({ resource, quantity: batch.quantity, qualities: batch.qualities });
      }
    }
    setInventory(inventory);

    return { id, inputs, recipe, schematicTier: schematic.tier };
  }

  private redraw(): void {
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.crew);

    // Departures are only ever surfaced after checkAttrition() actually
    // reports one -- never guessed or displayed preemptively.
    const departedNames: string[] = [];
    for (const member of getCrewRoster()) {
      const attrition = checkAttrition(member, Date.now());
      if (attrition.departed) {
        departedNames.push(member.id);
        removeCrewMember(member.id);
      }
    }
    if (departedNames.length > 0) {
      this.pendingMessage = `Departed (unpaid upkeep): ${departedNames.join(", ")}`;
    }

    this.add.text(16, 64, `Crew — ${startingPlanet.name}`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffffff",
    });
    this.add.text(16, 90, `Credits: ${getWallet().credits}`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd700",
    });

    const capacity = getCrewCapacity();
    const maxCrew = capacity.baseCapacity + capacity.purchasedSlots;
    const roster = getCrewRoster();
    let y = 114;
    this.add.text(16, y, `Capacity: ${roster.length}/${maxCrew}`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cccccc",
    });
    const purchaseBtn = this.add.text(220, y, "> Purchase Slot", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#2196f3",
    });
    purchaseBtn.setInteractive({ useHandCursor: true });
    purchaseBtn.on("pointerdown", () => this.onPurchaseCapacity());
    y += 28;

    y = this.renderPool(y);
    y += 12;
    y = this.renderRoster(y, roster);

    this.statusText = this.add.text(16, 470, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: departedNames.length > 0 ? "#ff6666" : "#cccccc",
    });
  }

  private renderPool(startY: number): number {
    let y = startY;
    this.add.text(16, y, "Crew pool at this planet:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const pool = getCrewPool();
    if (pool.availableHires.length === 0) {
      this.add.text(16, y, "(none)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    for (const candidate of pool.availableHires) {
      const cost = CREW_HIRE_COST_BY_TIER.find((e) => e.tier === candidate.tier)?.cost ?? 0;
      const label = `${candidate.tier}${candidate.profession ? ` (${candidate.profession})` : ""} — hire for ${cost}cr`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });

      const hireBtn = this.add.text(500, y, "> Hire", { fontFamily: "monospace", fontSize: "14px", color: "#4caf50" });
      hireBtn.setInteractive({ useHandCursor: true });
      hireBtn.on("pointerdown", () => this.onHire(candidate));
      y += 22;
    }
    return y;
  }

  private renderRoster(startY: number, roster: CrewMember[]): number {
    let y = startY;
    this.add.text(16, y, "Your crew:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    if (roster.length === 0) {
      this.add.text(16, y, "(no crew hired yet)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    for (const member of roster) {
      const profLabel = member.profession ? ` (${member.profession})` : "";
      const craftLabel = member.status === "active" ? `, working on ${member.assignedCraftId}` : "";
      const label = `${member.tier}${profLabel} — ${member.status}${craftLabel}, wage ${member.wageAmount}cr`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;

      if (member.status === "idle") {
        const assignBtn = this.add.text(32, y, "> Assign to Craft", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#4caf50",
        });
        assignBtn.setInteractive({ useHandCursor: true });
        assignBtn.on("pointerdown", () => this.onAssign(member));

        const checkBtn = this.add.text(190, y, "> Check Background", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#2196f3",
        });
        checkBtn.setInteractive({ useHandCursor: true });
        checkBtn.on("pointerdown", () => this.onCheckBackground(member));
      }

      const payBtn = this.add.text(370, y, "> Pay Upkeep", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffd700",
      });
      payBtn.setInteractive({ useHandCursor: true });
      payBtn.on("pointerdown", () => this.onPayUpkeep(member));

      const dismissBtn = this.add.text(500, y, "> Dismiss", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ff6666",
      });
      dismissBtn.setInteractive({ useHandCursor: true });
      dismissBtn.on("pointerdown", () => this.onDismiss(member));

      y += 24;
    }
    return y;
  }

  private onHire(candidate: CrewCandidate): void {
    const result = hireCrew(candidate, getCrewPool(), getCrewCapacity(), getCrewRoster(), getWallet(), PLAYER_ID);
    if (!result.hired) {
      this.setStatus(`Hire failed: ${result.reason}`);
      return;
    }
    const succeeded = result as HireSucceeded;
    setCrewPool(succeeded.updatedPool);
    setWallet(succeeded.updatedWallet);
    addCrewMember(succeeded.crewMember);
    this.setStatus(`Hired a ${succeeded.crewMember.tier} tier crew member.`);
    this.redraw();
  }

  private onAssign(member: CrewMember): void {
    const action = this.buildCraftAction(`craft-${member.id}-${Date.now()}`);
    if (!action) {
      this.setStatus("Not enough materials gathered/refined yet to assign this crew member.");
      return;
    }
    const result = assignToCraft(member, action) as AssignSucceeded;
    replaceCrewMember(result.updatedCrewMember);

    if (result.craftResult.accepted) {
      const recipe = content.recipes[0]!;
      const outputResource = content.resources.find((r) => r.id === recipe.outputResourceId);
      setInventory(
        addBatch(getInventory(), {
          resourceId: recipe.outputResourceId,
          quantity: recipe.outputQuantity,
          qualities: result.craftResult.qualities,
        }),
      );
      this.setStatus(`${member.tier} crew member crafted 1x ${outputResource?.name ?? recipe.outputResourceId}.`);
    } else {
      this.setStatus(`Crew member's craft was rejected: ${result.craftResult.reason}`);
    }
    this.redraw();
  }

  private onCheckBackground(member: CrewMember): void {
    // BACKGROUND_IDLE_OUTPUT_RATE is currently unset (Phase 4 GDD §2.1a,
    // still an open design question) -- resolveBackgroundCrafting() always
    // hits its "not yet available" path with no override supplied, so the
    // craftAction's actual contents don't matter yet. Once a real rate
    // exists, this needs to build a real action the same way onAssign()
    // does (consuming real inventory per completed unit).
    const placeholderAction: CraftAction = {
      id: member.assignedCraftId ?? `background-${member.id}`,
      inputs: [],
      recipe: content.recipes[0]!,
      schematicTier: "Grey",
    };
    const result = resolveBackgroundCrafting(member, placeholderAction, Date.now());
    replaceCrewMember(result.updatedCrewMember);

    if (!result.resolved) {
      this.setStatus(`Background check: ${result.reason}`);
    } else {
      this.setStatus(`Background production: ${result.unitsCompleted} unit(s) completed.`);
    }
    this.redraw();
  }

  private onPayUpkeep(member: CrewMember): void {
    const result = payUpkeep(member, getWallet(), Date.now());
    if (result.status === "not-due") {
      this.setStatus("Upkeep is not due yet.");
      return;
    }
    if (result.status === "insufficient-funds") {
      this.setStatus("Not enough credits to pay upkeep.");
      return;
    }
    setWallet(result.updatedWallet);
    replaceCrewMember(result.updatedCrewMember);
    this.setStatus(`Paid ${member.wageAmount}cr upkeep.`);
    this.redraw();
  }

  private onDismiss(member: CrewMember): void {
    const result = dismissCrew(member, PLAYER_ID);
    if (!result.dismissed) {
      this.setStatus(`Dismiss failed: ${result.reason}`);
      return;
    }
    removeCrewMember(member.id);
    this.setStatus(`Dismissed ${member.tier} crew member.`);
    this.redraw();
  }

  private onPurchaseCapacity(): void {
    const result = purchaseCapacity(getCrewCapacity(), getWallet()) as PurchaseCapacitySucceeded;
    if (!result.purchased) {
      this.setStatus("Not enough credits to purchase a slot.");
      return;
    }
    setCrewCapacity(result.updatedCapacity);
    setWallet(result.updatedWallet);
    this.setStatus("Purchased an additional crew slot.");
    this.redraw();
  }
}
