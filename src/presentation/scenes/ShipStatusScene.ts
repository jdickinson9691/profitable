import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { ScrollableContent, STATUS_TEXT_Y } from "./scrollableContent.ts";
import { getShipRoster, getVoyages, replaceShip } from "../shipsState.ts";
import { getCrewRoster, replaceCrewMember } from "../crewState.ts";
import { getCrewSlotsForShip } from "../../ships/getCrewSlotsForShip.ts";
import { assignToShipRole } from "../../ships/assignToShipRole.ts";
import { unassignFromShipRole } from "../../ships/unassignFromShipRole.ts";
import { resolveComponentRepair } from "../../ships/resolveComponentRepair.ts";
import { COMPONENT_CATEGORIES } from "../../data/types/componentCategory.ts";
import { CARGO_HOLD_CAPACITY_BY_TIER } from "../../data/constants/shipsAndTravelConfig.ts";
import { QUALITY_MAX } from "../../data/constants/quality.ts";
import type { Ship } from "../../data/types/ship.ts";
import type { CrewMember } from "../../data/types/crewMember.ts";
import type { ShipCrewRole } from "../../data/types/shipCrewRole.ts";

// One-line description of what each component category actually does,
// per ship.md's consolidated contract -- weapon/shield feed Combat's own
// resolveCombatChoice(), engine/cargoHold feed calculateTravelTime()/
// initiateVoyage() directly. Purely informational text, no math lives
// here -- the actual effects stay exclusively inside the functions named.
const COMPONENT_EFFECT_LABEL: Record<(typeof COMPONENT_CATEGORIES)[number], string> = {
  weapon: "combat offense (resolveCombatChoice)",
  engine: "travel speed (calculateTravelTime, SHIP_TIER_SPEED_MODIFIER)",
  shield: "combat defense (resolveCombatChoice)",
  cargoHold: "voyage cargo capacity (initiateVoyage, CARGO_HOLD_CAPACITY_BY_TIER)",
};

const SHIP_CREW_ROLES: readonly ShipCrewRole[] = ["Pilot", "Combat Engineer", "Science Officer", "Systems Engineer", "Crafter"];

// Ship Crew Roles amendment / Ship Fuel / Cargo Hold Capacity. A
// consolidated per-ship status screen -- name, fuel, cargo hold capacity,
// installed components and their real gameplay effects, and crew role
// assignment -- ship.md's own new scope, closing the "no screen shows any
// of this" gap noted when this amendment's design entries were written.
// Formats and dispatches only, same discipline as every other scene in
// this codebase: no math is recomputed here that a core function (Agent
// 20's own functions, getCrewSlotsForShip(), assignToShipRole()) doesn't
// already own.
export class ShipStatusScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  private pendingMessage = "";
  private scroll?: ScrollableContent;

  constructor() {
    super(SCENE_KEYS.shipStatus);
  }

  create(): void {
    this.redraw();
  }

  private setStatus(message: string): void {
    this.pendingMessage = message;
    this.statusText?.setText(message);
  }

  private redraw(): void {
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.shipStatus);

    this.add.text(16, 64, "Ship Status", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" });

    // Scrollable content (same fixed-status-text bug fix ShipAssemblyScene/
    // ShipyardScene/CrewScene already established) -- each owned ship's
    // full status block (components + crew roles + assignment controls)
    // easily exceeds one screen.
    this.scroll ??= new ScrollableContent(this);
    this.scroll.attachWheelInput();
    this.scroll.begin();

    let y = 96;
    const roster = getShipRoster();
    if (roster.length === 0) {
      this.scroll.addText(16, y, "(no ships owned yet -- purchase one at the Shipyard)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
      y += 22;
    }
    for (const ship of roster) {
      y = this.renderShip(ship, y);
      y += 20;
    }

    this.statusText = this.add.text(16, STATUS_TEXT_Y, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });

    this.scroll.finish(y);
  }

  private renderShip(ship: Ship, startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, `${ship.name} — ${ship.tier} tier — at ${ship.currentPlanetId}`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffd700",
    });
    y += 24;

    this.scroll!.addText(32, y, `Fuel: ${ship.currentFuel} / ${ship.fuelCapacity}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
    y += 18;

    const cargoTier = ship.components.cargoHold?.tier ?? "Grey";
    const cargoCapacity = CARGO_HOLD_CAPACITY_BY_TIER.find((e) => e.tier === cargoTier)?.capacity ?? 0;
    this.scroll!.addText(32, y, `Cargo hold capacity: ${cargoCapacity} (per voyage, ${cargoTier} tier)`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
    y += 22;

    y = this.renderComponents(ship, y);
    y += 8;

    const checkRepairBtn = this.scroll!.addText(32, y, "> Check Repair", { fontFamily: "monospace", fontSize: "13px", color: "#4caf50" });
    checkRepairBtn.setInteractive({ useHandCursor: true });
    checkRepairBtn.on("pointerdown", () => this.onCheckRepair(ship));
    y += 20;

    y = this.renderCrewRoles(ship, y);
    y += 8;
    y = this.renderAssignmentControls(ship, y);

    return y;
  }

  // Ship Crew Roles, task #89: resolveComponentRepair()'s own Systems
  // Engineer / Crafter resolution needs the caller to state whether the
  // ship is currently traveling -- no hidden lookup inside that function,
  // same convention its own doc comment establishes. getVoyages() (not
  // ship.currentPlanetId alone) is the only way to tell, per ship.ts's own
  // note.
  //
  // Retroactive removal (2026-08-04): this used to also resolve
  // dockedPlanet, for the now-removed Citadel repair-rate contribution --
  // see planet-ownership.md's own retroactive note. Only activeVoyage is
  // needed now.
  private onCheckRepair(ship: Ship): void {
    const activeVoyage = getVoyages().find((voyage) => voyage.shipId === ship.id) ?? null;
    const updatedShip = resolveComponentRepair(ship, getCrewRoster(), activeVoyage, Date.now());
    replaceShip(updatedShip);
    this.setStatus(`Checked repair on ${updatedShip.name}.`);
    this.redraw();
  }

  private renderComponents(ship: Ship, startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, "Components:", { fontFamily: "monospace", fontSize: "15px", color: "#ffffff" });
    y += 20;

    for (const category of COMPONENT_CATEGORIES) {
      const installed = ship.components[category];
      const durabilityLabel =
        installed && installed.qualities.durability !== null ? `, durability ${installed.qualities.durability}/${QUALITY_MAX}` : "";
      const label = installed
        ? `${category}: ${installed.tier} tier${durabilityLabel} — affects ${COMPONENT_EFFECT_LABEL[category]}`
        : `${category}: (empty) — affects ${COMPONENT_EFFECT_LABEL[category]}`;
      this.scroll!.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: installed ? "#cccccc" : "#888888" });
      y += 18;
    }
    return y;
  }

  private renderCrewRoles(ship: Ship, startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, "Crew roles:", { fontFamily: "monospace", fontSize: "15px", color: "#ffffff" });
    y += 20;

    const slots = getCrewSlotsForShip(ship);
    const roster = getCrewRoster();
    for (const role of SHIP_CREW_ROLES) {
      const capacity =
        role === "Pilot"
          ? slots.pilot
          : role === "Systems Engineer"
            ? slots.systemsEngineer
            : role === "Crafter"
              ? slots.crafter
              : slots.combatEngineerOrScienceOfficer;
      const occupants = roster.filter((member) => member.assignedShipId === ship.id && member.shipRole === role);

      this.scroll!.addText(32, y, `${role} (${occupants.length}/${capacity}):`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#cccccc",
      });
      y += 16;
      for (const member of occupants) {
        const profLabel = member.profession ? ` (${member.profession})` : "";
        this.scroll!.addText(48, y, `${member.tier}${profLabel}`, { fontFamily: "monospace", fontSize: "12px", color: "#aaaaaa" });
        y += 15;
      }
    }
    return y;
  }

  private renderAssignmentControls(ship: Ship, startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, "Assign crew to a role on this ship:", { fontFamily: "monospace", fontSize: "15px", color: "#ffffff" });
    y += 20;

    const roster = getCrewRoster();
    if (roster.length === 0) {
      this.scroll!.addText(32, y, "(no crew hired yet -- hire crew at the Crew screen)", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#888888",
      });
      return y + 18;
    }

    for (const member of roster) {
      const current =
        member.assignedShipId === ship.id
          ? ` [current: ${member.shipRole}]`
          : member.assignedShipId
            ? " [assigned to another ship]"
            : "";
      const profLabel = member.profession ? ` (${member.profession})` : "";
      this.scroll!.addText(32, y, `${member.tier}${profLabel}${current}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#cccccc",
      });
      y += 16;

      let x = 48;
      for (const role of SHIP_CREW_ROLES) {
        // Eligibility (design entry's own Must-Not-Do): only Crafter is
        // gated by profession -- the other 4 roles accept any crew member,
        // any tier. An ineligible role is simply not offered as a button.
        if (role === "Crafter" && member.profession === null) continue;
        const btn = this.scroll!.addText(x, y, `> ${role}`, { fontFamily: "monospace", fontSize: "12px", color: "#4caf50" });
        btn.setInteractive({ useHandCursor: true });
        btn.on("pointerdown", () => this.onAssignRole(ship, member, role));
        x += btn.width + 14;
      }
      // Closes a previously-flagged gap: only offered when currently
      // assigned to THIS ship -- unassigning from elsewhere isn't this
      // scene's concern, same "one ship's own controls" scoping every
      // other button here already follows.
      if (member.assignedShipId === ship.id) {
        const unassignBtn = this.scroll!.addText(x, y, "> Unassign", { fontFamily: "monospace", fontSize: "12px", color: "#f44336" });
        unassignBtn.setInteractive({ useHandCursor: true });
        unassignBtn.on("pointerdown", () => this.onUnassignRole(member));
      }
      y += 20;
    }
    return y;
  }

  private onAssignRole(ship: Ship, member: CrewMember, role: ShipCrewRole): void {
    const result = assignToShipRole(member, ship, role, getCrewRoster());
    if (!result.assigned) {
      this.setStatus(`Assign failed: ${result.reason}`);
      return;
    }
    replaceCrewMember(result.updatedCrewMember);
    this.setStatus(`Assigned ${result.updatedCrewMember.tier} crew member as ${role} on ${ship.name}.`);
    this.redraw();
  }

  private onUnassignRole(member: CrewMember): void {
    const result = unassignFromShipRole(member);
    if (!result.unassigned) {
      this.setStatus(`Unassign failed: ${result.reason}`);
      return;
    }
    replaceCrewMember(result.updatedCrewMember);
    this.setStatus(`Unassigned ${result.updatedCrewMember.tier} crew member.`);
    this.redraw();
  }
}
