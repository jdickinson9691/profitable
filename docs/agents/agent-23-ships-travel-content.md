# Agent 23: Ships & Travel Content Agent

**Creation order:** Fifth in Phase 5. Depends on the Agent 1 Phase 5 amendment only. Can run in parallel with Agents 20–22, but Agent 24 (Integration) needs this agent's output to test against.

## Responsibility

Populate example ship component recipes as config data — at least one recipe per component category (weapon, engine, shield, cargo hold). Data-only agent, same spirit as Agent 6 (MVP Content) and Agent 14 (Trading Content).

## Inputs

- Agent 1's Phase 5 schema (confirms the existing `Recipe` type is sufficient for component recipes).
- The MVP's existing resource/item roster as candidate inputs for component recipes — no new raw resources need to be invented for this pass unless a genuine gap is found (if so, report it rather than inventing scope unilaterally).

## Outputs

### Component recipe config (JSON), one per category minimum
- A **weapon** recipe: category + threshold inputs → one `ShipComponent` with `category: 'weapon'`.
- An **engine** recipe: similarly, for `category: 'engine'`.
- A **shield** recipe: similarly, for `category: 'shield'`.
- A **cargo hold** recipe: similarly, for `category: 'cargoHold'`.
- Each recipe should use existing MVP/Phase-2-generated resources as inputs where plausible — reuse the existing roster rather than inventing new raw resources, consistent with how Agent 14 reused the MVP item roster for base trading prices.

## Must NOT Do

- Must not write any TypeScript/JavaScript logic — this agent produces JSON config files only.
- Must not invent new raw resource types to serve as recipe inputs unless a genuine gap is found in the existing roster — report the gap rather than filling it unilaterally.
- Must not invent additional component categories beyond the four decided in Section 2.5 (weapon, engine, shield, cargo hold).

## Testing Requirements

- Every recipe config file must validate successfully against Agent 1's Phase 5 schema (and the underlying `Recipe` type from Agent 1's original MVP output).
- Confirm each recipe is craftable end-to-end via Agent 2's `craft()` using only existing, already-defined resources as inputs.

## Definition of Done

- At least four recipe config files exist (one per component category) and validate against schema.
- Agent 24 (Integration) can craft at least one component per category through Agent 2's existing crafting path with no errors or missing fields.
