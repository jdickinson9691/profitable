# src/data/types

Owned by the **Data Schema Agent** (GDD §5.2, agent 1).

TypeScript interfaces for every data shape referenced in GDD §3: the 5
qualities, resource types, `material`/recipe/schematic shapes, and the tier
tables (color breakpoints, refiner/crafter variance, refund chance, penalty
curve, schematic tier contribution).

No formula logic, gameplay behavior, or rendering — shapes only. Every other
agent imports types from here rather than re-declaring them.

**Status:** all GDD §3 data shapes and tables are now defined: `tierColor.ts`,
`quality.ts`, `resource.ts`, `resourceInstance.ts`, `refineResult.ts`,
`tierVariance.ts`, `refundChance.ts`, `random.ts`, `recipe.ts`,
`schematicEntity.ts` (the `Schematic` item, distinct from `schematicTier.ts`'s
formula table), `craftResult.ts`, `penaltyCurve.ts`, `schematicTier.ts`, and
`planet.ts` (minimal per GDD §3.4 — id/name/producible resource ids only, no
modifiers/seasons/tier).

Also `refiningRecipe.ts` — **not** one of Agent 1's originally-listed 6
types, added because Agent 6's contract requires a "refining recipe config"
and nothing else covers that shape (`refine()` itself takes no recipe
parameter at all — it just averages whatever `ResourceInstance[]` it's
given; this type exists purely for content/presentation purposes: which
specific resources combine, in what quantities, into what output).

**Phase 2 amendment** (`docs/agents/agent-01-amendment-phase2-schema.md`):
`planetType.ts` (the `PlanetType` enum), `planetTypeEligibility.ts`,
`planetTierModifier.ts`, `resourceSubsetPercentage.ts` (the 3 new lookup/
table row shapes), and `planet.ts`'s `Planet` extended with 5 new fields
(`planetType`, `tier`, `position`, `specialtyResourceId`, `discovered`) —
**all optional**, so MVP-era content (Delta Rigelus) still validates with
zero changes to that data. The original 3 MVP fields (`id`, `name`,
`producibleResourceIds`) are unchanged.

**Phase 3 amendment** (`docs/agents/agent-01-amendment-phase3-schema.md`):
`listing.ts` (`Listing`, plus the `MarketLocation` union), `planetMarketState.ts`
(`PlanetMarketState`), and `wallet.ts` (`Wallet`) — the 3 new trading types.
Timestamps (`createdAt`/`expiresAt`) are plain `number` (epoch ms), matching
this codebase's existing `Date.now()` convention rather than introducing a
new date/time type.

Also `resource.ts`'s `Resource` extended with one new **optional** field,
`itemTier?: number` (1-7) — **a necessary completion, not literally named in
the Phase 3 GDD's own text.** GDD §2.1/the amendment's contract describe the
global market's sell restriction as "reusing existing tier-numbering
conventions already in the schema," but no such numbering existed:
`TierColor` is the quality-*color* tier (7-band, from a straight average of
the 5 qualities), a different concept from the raw/refined/crafted item-tier
numbering (1-7) that CLAUDE.md §3.1 describes and that the restriction
actually needs. `itemTier` closes that gap, placed on `Resource` because
raw, refined, and crafted outputs are all represented as `Resource` entries
already (see `refiningRecipe.ts`'s and `recipe.ts`'s `outputResourceId`) —
there's no separate "item" type to hang this on. Optional for the same
backward-compatibility reason as the Phase 2 `Planet` fields: MVP/Phase 2
content sets no `itemTier` and still validates unchanged.

**Agent 11 (Trading Core) additions** — 3 more necessary completions,
discovered while implementing `docs/agents/agent-11-trading-core.md`
against the Phase 3 amendment above; see `src/trading/README.md` for the
full reasoning on each:
- `tradeDirection.ts` (`TradeDirection = "buy" | "sell"`), shared by
  `applyDrift`, `getGlobalPrice`, and `purchaseListing` rather than each
  retyping the same union independently.
- `purchaseResult.ts` (`PurchaseResult`, a discriminated union over
  `success` — `PurchaseSucceeded`/`PurchaseRejected`), the return type
  Agent 11's contract names for `purchaseListing()` but that the amendment
  never defined. Modeled on the existing `CraftResult` pattern, since a
  rejected purchase (self-trade, insufficient quantity) is a normal
  business outcome the caller must always handle, not an exceptional case.
- `listingExpiry.ts` (`ReturnAction`, `ListingExpiryResult`), the return
  shape Agent 11's contract names for `expireListings()` but that the
  amendment never defined.

**Agent 14 (Trading Content) additions** — 2 more necessary completions,
discovered while implementing `docs/agents/agent-14-trading-content.md`:
Agent 14's own contract asks for a "Base price config" and a "Planet
market preference config" but no shape existed for either.
- `itemBasePrice.ts` (`ItemBasePrice`) — one Credits price per item,
  distinct from `PlanetMarketState.basePrice` (which is per planet+item):
  this is the single galaxy-wide reference value every planet's initial
  `PlanetMarketState.basePrice` is seeded from.
- `planetMarketPreference.ts` (`PlanetMarketPreference`) — keyed by
  `PlanetType`, not by specific planet id. Phase 2's galaxy is generated
  per save from a stored seed, so there is no fixed set of "real" planet
  ids for static content to reference ahead of time; a generated `Planet`
  looks up its preference entry by its own `planetType` field instead.

**Phase 4 amendment** (`docs/agents/agent-01-amendment-phase4-schema.md`):
`crewMember.ts` (`CrewMember`), `crewCapacity.ts` (`CrewCapacity`), and
`planetCrewPool.ts` (`PlanetCrewPool`) — the 3 new crew types, plus
`crewHireCost.ts`/`crewWage.ts` (`CrewHireCostByTier`/`CrewWageByTier`),
the row shapes for the two new tier-keyed constant tables. Same
epoch-ms-number timestamp convention as `Listing`.

Also `profession.ts` (`Profession = string`) — a necessary completion:
the amendment's own contract names a `Profession` type for
`CrewMember.profession` but never defines it, because the full tier 6-7
profession taxonomy is still an explicitly open design question
(`profitable-design-questions.md`, tracked since the original MVP GDD's
"full scope post-MVP" note on crafter specialties). Rather than inventing
a fixed enum the design hasn't decided — the same must-not-invent rule
this amendment's contract applies to the background/idle rate constant —
`Profession` is a free-form string for now; a real enum can replace it
without changing `CrewMember`'s shape once the taxonomy is decided.

**Agent 16 (Crew Core) additions** — discovered while implementing
`docs/agents/agent-16-crew-core.md`; see `src/crew/README.md` for the full
reasoning on each:
- `crewCandidate.ts` (`CrewCandidate`) — a **correction**, not a pure
  addition: `PlanetCrewPool.availableHires` was typed as `CrewMember[]` by
  the amendment, but an unhired pool candidate has no real
  `hiredByPlayerId`/`hiredAt`/`wageAmount`/`lastPaidAt` yet.
  `planetCrewPool.ts`'s `availableHires` field now holds `CrewCandidate[]`.
- `craftAction.ts` (`CraftAction`) — bundles the inputs/recipe/schematic
  tier a crafter (player or crew member) is working, so `assignToCraft()`/
  `resolveBackgroundCrafting()` have something concrete to pass to
  `craft()` alongside the crafter's own tier.
- `hireResult.ts`, `assignResult.ts`, `backgroundResult.ts`,
  `paymentResult.ts`, `attritionResult.ts`, `dismissResult.ts` — the
  return types Agent 16's contract names for each of its 7 functions but
  that the amendment never defined. The first three mirror the existing
  `CraftResult`/`PurchaseResult` discriminated-union pattern (a rejected
  hire, a not-yet-available background rate, etc. are normal business
  outcomes the caller must always handle).

**Agent 18 (Crew Presentation) addition** — `purchaseCapacityResult.ts`
(`PurchaseCapacityResult`), discovered while implementing
`docs/agents/agent-18-crew-presentation.md`: its contract requires a UI
"option to purchase additional capacity," but Agent 16's contract never
included a corresponding function despite Phase 4 GDD §2.4 deciding the
mechanic. The function itself (`purchaseCapacity()`) lives in
`src/crew/`, not presentation — see `src/crew/README.md`.

**Phase 5 amendment** (`docs/agents/agent-01-amendment-phase5-schema.md`):
`componentCategory.ts` (`ComponentCategory`, the 4-value union), `shipComponent.ts`
(`ShipComponent`), `ship.ts` (`Ship`), `shipyardPool.ts` (`ShipyardPool`), and
`voyage.ts` (`Voyage`) — the core new Phase 5 types. `ShipComponent.qualities`
reuses the existing `QualityRoll` shape directly (components are ordinary
crafted items, no separate stat system).

Also two necessary additions beyond the amendment's own literal pseudocode:
- `shipCandidate.ts` (`ShipCandidate`) — a **correction**, same category as
  Phase 4's `CrewCandidate`/`CrewMember` split: the amendment's pseudocode
  typed `ShipyardPool.availableShips` as `Ship[]`, but `Ship.ownerId` is
  required and meaningless for a ship still sitting unpurchased in a
  shipyard pool. `ShipCandidate` omits only `ownerId`; `shipyardPool.ts`'s
  `availableShips` field now holds `ShipCandidate[]`.
- `componentRecipe.ts` (`ComponentRecipe`) — a **necessary completion**
  closing a genuine gap the amendment's own testing requirement asked it
  to check for: "confirm the existing `Recipe` type is sufficient... if a
  gap is found, report it rather than redesigning `Recipe` unilaterally."
  `Recipe` *is* sufficient, unmodified, for a component recipe's input
  side (category + threshold inputs — no change needed). A real gap
  exists on the output side: `Recipe.outputResourceId` is designed to
  reference a `Resource` (feeding `craft()`'s `applicableQualities`), but
  `ShipComponent` isn't a `Resource` — nothing links a recipe id to which
  `ComponentCategory` its `craft()` output should become. `ComponentRecipe`
  is that small link table (`recipeId` → `category`), populated by Agent
  23 alongside each component recipe, read by Agent 20's ship-assembly
  path — `Recipe` itself stays completely untouched.

Also `shipTierSpeedModifier.ts` (`ShipTierSpeedModifier`) and
`shipPurchaseCost.ts` (`ShipPurchaseCostByTier`) — row shapes for the two
new tier-keyed constant tables (see `src/data/constants/README.md`).
`ShipTierSpeedModifier` is deliberately a single multiplier per tier, not
an asymmetric negative/positive pair like `TierVariance` — travel time has
no random roll to narrow, so ship tier applies a flat, deterministic
modifier rather than a variance range.

**Agent 20 (Ships & Travel Core) additions** — discovered while
implementing `docs/agents/agent-20-ships-travel-core.md`; see
`src/ships/README.md` for the full reasoning on each:
- **`Ship.currentPlanetId` — a correction to the amendment's own `Ship`
  type**, not a pure addition: nothing recorded where a ship currently is,
  yet `resolveArrival()`'s contract requires delivering "the ship... to
  the destination planet." Added as a required `string`, set at purchase
  time and updated only on a successful arrival. `ship.schema.json` and
  every test constructing a `Ship` were updated to include it.
- `purchaseShipResult.ts` (`PurchaseShipResult`) and `arrivalResult.ts`
  (`ArrivalResult`) — the return types Agent 20's contract names for
  `purchaseShip()` and `resolveArrival()` but that the amendment never
  defined. Both mirror the existing `CraftResult`/`PurchaseResult`/
  `HireResult` discriminated-union pattern. `ArrivalResult` deliberately
  only *reports* delivered cargo — it does not itself represent activating
  a Phase 3 `Listing`, since Agent 20 must never touch Agent 11's logic.

**Travel Encounters (Non-Combat) amendment**
(`docs/agents/agent-01-amendment-travel-encounters-schema.md`):
`encounter.ts` (`EncounterType`, and `EncounterResult` — a discriminated
union of `TradeOpportunityEncounterResult`/`DiscoveryEncounterResult`/
`HazardEncounterResult`, mirroring the existing `CraftResult`/
`ArrivalResult` pattern rather than one shape with a generic
`outcome: unknown` bag), plus `hazardTierModifier.ts`
(`HazardTierModifier`) and `hazardFailureCostBand.ts`
(`HazardFailureCostBand`), the row shapes for the two new hazard-specific
constant tables (see `src/data/constants/README.md`).

`voyage.ts`'s `Voyage` gained one new field, `encounters?: EncounterResult[]`
— **deliberately optional**, not required. This amendment's own testing
requirement calls for "the extended `Voyage` type still validates all
existing Phase 5 voyage data without requiring changes to that data,"
which a persisted pre-amendment `Voyage` (already sitting in a player's
saved `shipsState.ts` voyages list) can't satisfy if `encounters` were
required — differing from `Ship.currentPlanetId`'s own precedent (added
as *required*, with every fixture updated) specifically because that
amendment never asked for backward compatibility and this one explicitly
does.

`DiscoveryEncounterResult.outcome.resourceId` is a plain `string`, not an
embedded `Resource` object — the GDD's own outcome description says "the
rolled Resource + QualityRoll," but storing the full object inline would
duplicate content data inside a structure (`Voyage`) that persists through
`SaveSystem` indefinitely. Follows the same id-reference convention every
other cross-reference in this codebase already uses (`Listing.itemId`,
`VoyageCargoItem.itemId`), rather than inventing an embedded-object
exception here.

`HazardTierModifier`'s roll bonus deliberately treats **Grey as the floor
(+0), not a penalty** — unlike `PlanetTierModifier` (whose neutral point is
Green, since a planet isn't a skill investment), ship tier here is a
skill/equipment investment axis, the same convention
`ShipTierSpeedModifier` already established for ships (Grey = exactly
baseline, never negative).

**Scanner/Probe amendment** (`docs/agents/agent-01-amendment-scanner-schema.md`):
`scanner.ts` (`Scanner`) and `scannerPool.ts` (`ScannerPool`), plus
`scannerPurchaseCost.ts` (`ScannerPurchaseCostByTier`) and
`scannerTierRadiusBonus.ts` (`ScannerTierRadiusBonus`), the row shapes for
the two new tier-keyed constant tables (see `src/data/constants/README.md`).
No changes to `Planet`, `Voyage`, `Ship`, `ShipyardPool`, or any other
prior type — a scan action only ever flips an existing `discovered`
boolean, so `Scanner`/`ScannerPool` need no new fields anywhere else.

Also `scannerCandidate.ts` (`ScannerCandidate`) — a **correction**, same
category as Phase 4's `CrewCandidate`/`CrewMember` split and Phase 5's
`ShipCandidate`/`Ship` split: the GDD's own pseudocode typed
`ScannerPool.availableScanners` as `Scanner[]`, but `Scanner.ownerId` is
required and meaningless for a scanner still sitting unpurchased in a
planet's scanner pool. `ScannerCandidate` omits only `ownerId`;
`scannerPool.ts`'s `availableScanners` field now holds
`ScannerCandidate[]`.

`ScannerTierRadiusBonus`'s radius bonus deliberately treats **Grey as the
floor (+0), not a penalty** — same convention as `HazardTierModifier`/
`ShipTierSpeedModifier`: a scanner's tier is a skill/equipment investment
axis, not a "how good is this place" axis like planet tier.

**Agent 20 (Scanner/Probe Core) additions** — discovered while
implementing `docs/agents/agent-20-amendment-scanner-core.md`; see
`src/ships/README.md` for the full reasoning on each:
- `purchaseScannerResult.ts` (`PurchaseScannerResult`) and
  `performScanResult.ts` (`PerformScanResult`) — the return types the
  amendment's contract names for `purchaseScanner()` and `performScan()`
  but never defines. Both mirror the existing `CraftResult`/
  `PurchaseResult`/`PurchaseShipResult` discriminated-union pattern.
