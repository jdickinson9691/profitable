import Phaser from "phaser";

// Shared by every scene whose content height depends on player state
// (inventory size, listing count, owned ships/crew/scanners) rather than a
// fixed layout -- factored out because TradeMapScene.ts and
// DebugPanelScene.ts already duplicated this exact scrollable-viewport
// shape once each (Galactic Map Agent 25/26 verification, item 3 of
// profitable-map-gdd.md Section 7: "canvas/nav overflow"), and copy-pasting
// it a third, fourth, fifth, sixth, and seventh time (Market, GlobalMarket,
// Crew, Shipyard, ShipAssembly -- the scenes found to share the same bug
// class, a fixed-position status/confirmation text silently colliding with
// whatever dynamic content happened to grow underneath it) would be the
// exact "fixed-dimension assumption" mistake this pattern exists to
// prevent, just duplicated instead of fixed.
//
// IMPORTANT: this uses a dedicated Camera with a fixed screen viewport,
// NOT GameObject.setMask(GeometryMask) -- TradeMapScene.ts/DebugPanelScene.ts's
// original implementation used setMask(), which silently no-ops under the
// WebGL renderer this game actually runs under (Phaser 4:
// GameObjects.Components.Mask#setMask is a Canvas-only API; WebGL logs a
// console warning and returns without applying anything -- see
// node_modules/phaser/src/gameobjects/components/Mask.js). That means
// TradeMapScene/DebugPanelScene's own clipping was silently non-functional
// this whole time under normal (WebGL) play, not just in the 5 scenes this
// file was originally built to fix. Both scenes have since been ported
// onto this same camera-based approach -- see their own headers -- so
// every scrollable scene in the game now uses ScrollableContent, none use
// setMask(GeometryMask) anymore. A Camera's viewport is a core,
// renderer-agnostic feature (unlike GameObject masks), and critically is
// also input-aware by construction -- Phaser's own GeometryMask docs note
// masks "have no impact on physics or input detection," which is exactly
// why the old implementation needed a manual updateScrollInteractivity()
// workaround; a camera's viewport naturally makes scrolled-out content
// unclickable too, so no workaround is needed here.
export const VIEWPORT_TOP = 64;
export const VIEWPORT_BOTTOM = 455;
export const STATUS_TEXT_Y = 470;

export class ScrollableContent {
  private contentContainer?: Phaser.GameObjects.Container;
  private viewCamera?: Phaser.Cameras.Scene2D.Camera;
  private scrollY = 0;
  private maxScrollY = 0;
  private wheelAttached = false;

  constructor(private readonly scene: Phaser.Scene) {}

  // Registered once and left attached across every subsequent redraw() --
  // scene-level input listeners survive children.removeAll(), same note
  // TradeMapScene.create()/DebugPanelScene.create() already made about this.
  attachWheelInput(): void {
    if (this.wheelAttached) return;
    this.wheelAttached = true;
    this.scene.input.on("wheel", (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      if (this.maxScrollY <= 0) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScrollY);
      this.applyScroll();
    });
  }

  private applyScroll(): void {
    if (this.viewCamera) this.viewCamera.scrollY = VIEWPORT_TOP + this.scrollY;
  }

  // Call at the start of a scene's redraw(), after children.removeAll(),
  // in place of manually creating the container/camera.
  begin(): void {
    this.contentContainer?.destroy();
    if (this.viewCamera) this.scene.cameras.remove(this.viewCamera);

    // Content keeps its normal world y-coordinates (64-455-ish, same as
    // every non-scrollable scene already uses) -- the camera's own
    // viewport + scrollY does the clipping and scrolling, not the
    // container's own position, so nothing above needs to know this
    // container is scrollable at all.
    this.contentContainer = this.scene.add.container(0, 0);

    // The main camera renders everything (nav bar, status text, etc.)
    // except this container -- the dedicated viewCamera below renders the
    // container instead, clipped to a fixed screen rectangle.
    this.scene.cameras.main.ignore(this.contentContainer);

    this.viewCamera = this.scene.cameras.add(
      0,
      VIEWPORT_TOP,
      this.scene.scale.width,
      VIEWPORT_BOTTOM - VIEWPORT_TOP,
    );
    this.viewCamera.setName("scrollableContentView");
    this.applyScroll();
  }

  // Use in place of `this.add.text` for anything that should scroll --
  // i.e. everything except the nav bar and the fixed status text below.
  addText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const object = this.scene.add.text(x, y, text, style);
    this.contentContainer?.add(object);
    return object;
  }

  // Call as the ABSOLUTE LAST step of a scene's redraw(), after every fixed
  // piece of chrome for this redraw has already been added -- nav, the
  // status text (positioned at the exported STATUS_TEXT_Y, added directly
  // via `this.scene.add.text`, never `addText`), and, where applicable, the
  // onboarding tip overlay. Ordering matters: a freshly-added Camera
  // renders every scene object by default, not just the ones passed to
  // `addText` -- so until this runs, the view camera would also render its
  // own shifted-by-scroll duplicate of the nav bar/status text/tip on top
  // of the real, correctly-fixed copies the main camera already draws.
  // This locks that down by telling the view camera to ignore everything
  // in the scene except the scrollable container, once true means
  // "everything that will ever be added this redraw is already here."
  finish(finalY: number): void {
    this.maxScrollY = Math.max(0, finalY - VIEWPORT_BOTTOM);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
    this.applyScroll();

    if (this.maxScrollY > 0) {
      this.scene.add.text(16, VIEWPORT_BOTTOM + 3, "(scroll for more)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#666666",
      });
    }

    if (this.viewCamera && this.contentContainer) {
      const everythingElse = this.scene.children.list.filter((object) => object !== this.contentContainer);
      this.viewCamera.ignore(everythingElse);
    }
  }
}
