# Profitable

A game systems engine for resource gathering, refining, and crafting, where
every item — raw, refined, or crafted — carries the same 5 numeric qualities
(purity, density, potency, durability, rarity). Quality flows through
refining and crafting via a shared formula, feeding a trading market across
raw resources, refined resources, recipes/schematics, and crafted items.
Long-term vision includes a galaxy of planets with local markets, a galactic
trade map, NPC crew crafters, and multiplayer — all out of scope for the MVP.

**Status: reset.** The repository was previously a Python/SQLite/Tkinter
prototype (material tiers, six stats) built under a different design. That
implementation has been removed (still recoverable from git history prior to
this reset commit) in favor of the MVP defined below. Nothing has been built
against the new design yet — this file and `docs/design/` are the starting
point.

## Design source of truth

`docs/design/profitable-mvp-gdd.md` is the MVP Game Design Document — it
defines what gets built, in what order, and by which agent contract. Read it
in full before starting any implementation work. Key points summarized here
for quick reference; the GDD is authoritative if anything conflicts.

### The 5 qualities
Purity, density, potency, durability, rarity. Universal, but not all apply
to every resource type (non-applicable = `null`, never `0`). Each quality is
an integer 1–100, mapped to a 7-tier color: Grey (1–40), White (41–60),
Green (61–75), Blue (76–85), Purple (86–91), Orange (92–96), Gold (97–100).

### MVP scope
Proves the quality math end-to-end before any procedural generation,
trading, or travel systems: one hardcoded planet, 2–3 resource types,
resource quality rolls, one refining recipe (Section 3.2 formula), one
crafting recipe + schematic (Section 3.3 formula). Galaxy/planet generation,
trading markets, NPC crew crafters, travel, and the trade map are explicitly
deferred.

### Technical architecture (mandatory)
- **Stack:** TypeScript + Phaser or PixiJS for the MVP; Unity migration is
  planned post-MVP.
- **Simulation/presentation separation:** all quality/refining/crafting math
  must be plain, framework-agnostic TypeScript — pure functions and data
  structures, zero Phaser/PixiJS objects touching them.
- **Data-driven:** resources, recipes, qualities, and tier tables load from
  JSON config, never hardcoded in logic — including the MVP's hardcoded
  content.
- **Browser API isolation:** no DOM-based UI, no URL/cookie state.
  Persistence and audio each sit behind a single swappable adapter interface
  (`SaveSystem`, `AudioManager`).

### Agent development plan
The GDD (Section 5) defines seven agent roles built in dependency order —
Data Schema → Simulation Core → Validation/Test (parallel with Simulation
Core) → Infrastructure/Adapter → Presentation → Content → Integration —
each with an explicit contract (inputs, outputs, what it must NOT do, and
its definition of done). Cross-cutting rules: no agent hardcodes a number
that already exists in the Data Schema Agent's output; no agent reaches
"downward" past its declared inputs (e.g., Presentation calls Simulation
Core's public functions only, never Content's raw JSON directly); every
agent's output must be independently reviewable against its own definition
of done. Follow these contracts when implementing each part of the system,
even outside a literal multi-agent workflow — they define the module
boundaries.

## Layout

```
docs/design/     Design docs (profitable-mvp-gdd.md is the current source of truth)
```

Everything else (simulation core, data schemas/config, presentation scenes,
adapters, tests) does not exist yet — it gets created per the agent
contracts above as implementation begins.

## Working style

- Don't add procedural generation, trading, travel, or multiplayer code —
  all explicitly out of scope until the MVP checkpoint (GDD Section 2, step 5).
- Keep simulation math (`engine/`-equivalent once created) free of any
  Phaser/PixiJS/DOM import — verify this holds before considering formula
  work done.
- Don't hardcode a number from GDD Section 3 (quality tiers, variance
  tables, refund chances, penalty curve, schematic tier table) anywhere
  outside the data/config layer — import it.
- No pip/Python dependencies going forward; this is now a Node/TypeScript
  project.
