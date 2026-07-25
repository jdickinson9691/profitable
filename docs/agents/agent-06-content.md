# Agent 6: Content Agent

**Creation order:** Sixth. Depends on Agent 1 (Data Schema) only. Can run in parallel with Agents 2–5, but Agent 7 (Integration) needs this agent's output to test against.

## Responsibility

Populate the actual MVP content as config data: the 3 resource type definitions, the 1 hardcoded planet, the 1 refining recipe, and the 1 crafting recipe + schematic. This is a data-only agent — it writes no code.

## Inputs

- Agent 1's JSON schemas (all config data must validate against these).
- GDD Section 3.4 (MVP Content) for the specific values to encode.

## Outputs

### Resource config (JSON)
- **Igneous Ore** — solid; purity, density, potency, durability, rarity all applicable (roll 1–100 each).
- **Hydrogen Gas** — gas; purity, density, potency, rarity applicable; **durability = null/N/A**.
- **Autunite Crystal** — radioactive crystal; density, potency, durability, rarity applicable; **purity = null/N/A**.

### Planet config (JSON)
- **Delta Rigelus** — id, name, and a list referencing the three resource ids above as producible. No modifiers, seasons, or tier fields (explicitly out of scope for MVP per Agent 1's minimal `Planet` type).

### Refining recipe config (JSON)
- 2× Igneous Ore + 1× Autunite Crystal → 1× **Radiant Alloy Bar**.

### Crafting recipe + schematic config (JSON)
- Recipe: 1× Radiant Alloy Bar (recommended durability threshold: 60+) + 1× Hydrogen Gas → 1× **Ion-Forged Hull Plate**.
- One schematic tied to this recipe, at a testable tier (e.g., Blue) — chosen deliberately not-Grey and not-Gold so both the ceiling-raise and forgiveness effects are non-trivial (Grey would show a zero-bonus baseline; testing a mid-tier value like Blue better exercises the schematic contribution table).

## Must NOT Do

- Must not write any TypeScript/JavaScript logic — this agent produces JSON config files only.
- Must not invent resources, recipes, or planets beyond what GDD Section 3.4 specifies — no speculative content for post-MVP systems.
- Must not use `0` for any non-applicable quality — must use `null`/omit the field per Agent 1's schema.

## Testing Requirements

- Every config file must validate successfully against Agent 1's corresponding JSON schema.
- Confirm the content is rich enough to exercise every relevant formula branch: at least one input with a null quality feeding into both the refining recipe (Autunite Crystal's missing purity) and the crafting recipe (Hydrogen Gas's missing durability), and at least one craft input capable of falling below the recipe's recommended threshold (to exercise the penalty curve, not just the happy path).

## Definition of Done

- All four config files (resources, planet, refining recipe, crafting recipe + schematic) exist and validate against schema.
- Agent 7 (Integration) can load this content through Agent 2's loading path with no errors and no missing fields.
