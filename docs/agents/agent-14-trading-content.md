# Agent 14: Trading Content Agent

**Creation order:** Fifth in Phase 3. Depends on the Agent 1 Phase 3 amendment only. Can run in parallel with Agents 11–13, but Agent 15 (Integration) needs this agent's output to test against.

## Responsibility

Populate the actual trading content as config data: a base price per tradeable item, and initial planet buy/sell preference lists. Data-only agent, same spirit as the original MVP Content Agent (Agent 6).

## Inputs

- Agent 1's Phase 3 schema (`PlanetMarketState.basePrice` and related shapes).
- The MVP's existing item roster (Igneous Ore, Hydrogen Gas, Autunite Crystal, Radiant Alloy Bar, Ion-Forged Hull Plate) as the initial set of tradeable items — no new items need to be invented for this pass.
- Phase 2's generated planet roster (Planet Type per planet) as the basis for buy/sell preference, per the "follow-on idea" logged in the design doc: Planet Type can reasonably drive which categories a planet favors buying/selling.

## Outputs

### Base price config (JSON)
- A base Credits price for each of the MVP's five items, used as the floor/ceiling reference point in Agent 11's drift calculations (Section 2.6). Values should be internally consistent (e.g., a crafted item's base price should exceed its raw-material inputs' combined base price, reflecting the value added by refining/crafting) but exact numbers are a tunable balance decision, not a locked design requirement.

### Planet market preference config (JSON)
- For a representative sample of Phase 2-generated planets (or all of them, if the galaxy is small enough to be practical), an initial "sells cheap" / "buys at a premium" list, loosely informed by Planet Type (e.g., a Terrestrial/mining-flavored planet favoring solid-resource categories).
- This is a **starting state**, not a permanent assignment — Agent 11's baseline drift will move actual prices away from these initial values as soon as any trading activity occurs. This config only seeds day-one market state; it is not re-read or treated as authoritative after generation.

## Must NOT Do

- Must not write any TypeScript/JavaScript logic — this agent produces JSON config files only, same rule as Agent 6.
- Must not invent new tradeable items beyond the existing MVP roster — no speculative content for tiers/items not already defined elsewhere.
- Must not hardcode planet-specific data that duplicates what Agent 8 already generates (planet id, tier, Planet Type) — reference those by id, don't re-specify them.

## Testing Requirements

- Every config file must validate successfully against Agent 1's Phase 3 schema.
- Confirm base prices are internally consistent per the note above (a spot-check, not an automated economic-balance test).
- Confirm the planet preference config references only planet ids that actually exist in a generated Phase 2 galaxy — no dangling references.

## Definition of Done

- Base price and planet preference config files exist and validate against schema.
- Agent 15 (Integration) can load this content and use it to initialize Agent 11's `PlanetMarketState` records with no errors or missing fields.
