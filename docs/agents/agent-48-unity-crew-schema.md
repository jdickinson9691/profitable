# Agent 48: Unity Crew Schema Agent

**Creation order:** First in Migration Phase 2, Sub-Phase C. Depends on Agent 38 (Unity Galaxy/Planet Schema, for the `PlanetType`/`TierColor` reuse pattern) and Agent 32 (Unity Simulation Core, for `CraftResult` reuse in `CrewMember`/`AssignResult`/`BackgroundResult`).

## Responsibility

Port `src/data/types/{crewCandidate,crewCapacity,crewHireCost,crewMember,crewWage,planetCrewPool,craftAction,hireResult,dismissResult,paymentResult,attritionResult,purchaseCapacityResult,assignResult,backgroundResult}.ts`, `src/data/types/shipCrewRole.ts` (scoped early, see below), and `src/data/constants/crewConfig.ts` to C#. Types and constants only — no formula logic (Agent 49's job).

## Inputs

- `docs/agents/agent-43-unity-trading-schema.md` — the immediately-preceding Schema agent's own conventions, extended rather than re-derived: sealed-class-hierarchy unions, mutable `public static` properties for debug-tunable scalars.
- The real TypeScript source files listed above, read directly.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`ShipCrewRole` is ported now, even though its own assignment logic (`assignToShipRole()`, `getCrewSlotsForShip()`) is Sub-Phase D's scope.** `CrewMember.ShipRole`/`AssignedShipId` are part of Sub-Phase C's own schema (the "Ship Crew Roles amendment" fields on `CrewMember`), and a nullable enum field needs its enum to exist even before anything meaningfully sets it — the same scoped-early-dependency shape Sub-Phase A's `PlanetOwnershipConstants.MinimumColonistsToProduce` already established for a cross-sub-phase field dependency.
- **`CREW_HIRE_COST_BY_TIER`/`CREW_WAGE_BY_TIER` are `Dictionary<TierColor, double>`, not a wrapper type + find-and-mutate helper.** The TypeScript source's array-of-`{tier, cost}` shape exists only because JS has no tier-keyed map literal as convenient as this; a `Dictionary` is the more direct equivalent and is already itself mutable in place (`CrewConfig.CrewHireCostByTier[TierColor.Grey] = 999` just works) — no `SetCostForTier()`-style wrapper needed, same reasoning `TradingConfig` already established for why C# doesn't need the TypeScript setter-function pattern.
- **`HireResult`/`PurchaseCapacityResult`/`AssignResult`/`BackgroundResult` are sealed-class hierarchies**, matching `CraftResult`/`PurchaseResult`'s already-established shape. **`DismissResult`/`AttritionResult` stay plain classes** — their TypeScript sources are single interfaces (`{ dismissed: boolean; reason?: string }`), not unions of two distinct shapes, so a sealed hierarchy here would invent a distinction the source itself doesn't draw. **`PaymentResult` is a three-way sealed hierarchy** (`PaymentPaid`/`PaymentNotDue`/`PaymentInsufficientFunds`) — "not due yet" is a normal no-op, structurally distinct from "insufficient funds" (an actual failure that leaves `LastPaidAt` unmoved, feeding `CheckAttrition`'s grace-period clock).
- **`Profession` stays a plain `string?`, not an enum** — mirrors `profession.ts`'s own explicit reasoning verbatim (the taxonomy is decided, but nothing currently branches on it exhaustively, so narrowing the type would be speculative tightening with no consumer to justify it).

## Outputs

### 1. New schema types (`unity/ProfitableCore/Schema/`)

`ShipCrewRole.cs` (enum), `CrewCandidate.cs`, `CrewCapacity.cs`, `CrewMember.cs` (+ `CrewStatus` enum), `PlanetCrewPool.cs`, `CraftAction.cs`, `HireResult.cs` (`HireResult`/`HireSucceeded`/`HireRejected`), `DismissResult.cs`, `PaymentResult.cs` (`PaymentResult`/`PaymentPaid`/`PaymentNotDue`/`PaymentInsufficientFunds`), `AttritionResult.cs`, `PurchaseCapacityResult.cs` (`PurchaseCapacityResult`/`PurchaseCapacitySucceeded`/`PurchaseCapacityRejected`), `AssignResult.cs` (`AssignResult`/`AssignSucceeded`/`AssignRejected`), `BackgroundResult.cs` (`BackgroundResult`/`BackgroundResolved`/`BackgroundRateUnavailable`).

### 2. `unity/ProfitableCore/Constants/CrewConfig.cs` (new)

All crew tunables: `BaseCrewCapacity`, `CrewCapacityExpansionBaseCost`/`CrewCapacityExpansionCostMultiplier`, the two tier-keyed `Dictionary<TierColor, double>` tables, `WagePaymentIntervalHours`, `UpkeepGracePeriodHours`, `CrewPoolSizePerPlanet`, `CrewPoolRefreshIntervalHours`, `ElapsedTimeCapHours`, `BackgroundIdleOutputRate` (nullable), `Tier67Professions`.

## Must NOT Do

- Must not add any formula logic to this file set — Agent 49's job.
- Must not model `DismissResult`/`AttritionResult` as sealed-class unions — their TypeScript sources are single interfaces, and forcing a union here would be an unrequested shape change (migration GDD §4's own "idiomatic shape change, not a meaning change" rule cuts the other way when the source has no union to begin with).
- Must not give `CrewConfig`'s tier-keyed dictionaries a paired `SetXForTier()` wrapper method — a `Dictionary` indexer already does everything the TypeScript setter function exists to work around.
- Must not port Sub-Phase D's actual ship-crew-role assignment behavior here — only the `ShipCrewRole` enum itself, as a schema dependency `CrewMember` needs now.

## Testing Requirements

- `dotnet build` succeeds with zero warnings/errors.
- Every new type is exercised by Agent 49's simulation code and Agent 50's parity tests — this agent has no functions of its own to unit-test directly.

## Definition of Done

- Every crew-related TypeScript type/constant Sub-Phase C needs has a C# equivalent, field-for-field.
- Agent 49 can port every `src/crew/*.ts` function against these types without needing to reopen this file set for a missing field.
