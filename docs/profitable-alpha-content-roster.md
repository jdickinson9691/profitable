# Profitable — Alpha Content Roster

Concrete content to implement Section 1 of `product-alpha-plan.md`. Names, inputs, and thresholds below are a complete, internally-consistent first draft — meant to be handed to a Content Agent (same pattern as Agent 6/14/23) rather than requiring further design discussion. Flavor/exact wording is easy to adjust later without touching any formula.

---

## 1. Resources (21)

| Name | Category | Qualities (all 5 unless noted) |
|---|---|---|
| Igneous Ore | Solid | all 5 |
| Ferrite Ore | Solid | all 5 |
| Cobalt Vein | Solid | all 5 |
| Titanium Shard | Solid | all 5 |
| Graphite Deposit | Solid | all 5 |
| Silicate Rock | Solid | all 5 |
| Uranium Ore | Solid | all 5 |
| Nickel-Iron Fragment | Solid | all 5 |
| Basalt Chunk | Solid | all 5 |
| Hydrogen Gas | Gas | no durability |
| Helium-3 | Gas | no durability |
| Methane Cloud | Gas | no durability |
| Nitrogen Vapor | Gas | no durability |
| Argon Mist | Gas | no durability |
| Ammonia Gas | Gas | no durability |
| Autunite Crystal | Crystal | no purity |
| Quartz Shard | Crystal | no purity |
| Beryl Crystal | Crystal | no purity |
| Selenite Crystal | Crystal | no purity |
| Zircon Fragment | Crystal | no purity |
| Corundum Crystal | Crystal | no purity |

Gas/Crystal null-quality pattern matches the MVP precedent exactly (gases lack durability, crystals lack purity) — every gas and crystal resource follows the same rule as Hydrogen Gas / Autunite Crystal, not decided per-item.

## 2. Refining Recipes (10)

| Output | Inputs |
|---|---|
| Radiant Alloy Bar | 2 Igneous Ore + 1 Autunite Crystal |
| Iron Ingot | 3 Ferrite Ore |
| Hardened Alloy Bar | 2 Cobalt Vein + 1 Titanium Shard |
| Glass Panel | 2 Silicate Rock |
| Carbon Composite | 2 Graphite Deposit + 1 Basalt Chunk |
| Meteoric Steel Bar | 3 Nickel-Iron Fragment |
| Focusing Lens | 2 Quartz Shard + 1 Beryl Crystal |
| Enriched Fuel Rod | 2 Uranium Ore + 1 Zircon Fragment |
| Fusion Gas Mix | 2 Helium-3 + 1 Hydrogen Gas |
| Polished Crystal Lattice | 2 Selenite Crystal + 1 Corundum Crystal |

## 3. Crafting Recipes (13)

Tiers 3-5 (general crafter, lower threshold):

| Output | Inputs | Threshold |
|---|---|---|
| Iron Hull Plate | 2 Iron Ingot | durability 40+ |
| Reinforced Panel | 2 Glass Panel + 1 Carbon Composite | durability 50+ |
| Basic Cargo Crate | 3 Carbon Composite | durability 30+ |
| Standard Toolkit | 2 Iron Ingot + 1 Meteoric Steel Bar | durability 45+ |
| Ion-Forged Hull Plate | 1 Radiant Alloy Bar + 1 Hydrogen Gas | durability 60+ |
| Simple Circuit Board | 2 Focusing Lens | potency 50+ |
| Fuel Canister | 2 Fusion Gas Mix | potency 40+ |
| Basic Power Cell | 2 Enriched Fuel Rod | potency 55+ |

Tiers 6-7 (specialized crafter, higher threshold):

| Output | Inputs | Threshold |
|---|---|---|
| Precision Alloy Frame | 2 Hardened Alloy Bar + 1 Meteoric Steel Bar | durability 75+ |
| Master Crystal Array | 2 Polished Crystal Lattice + 1 Focusing Lens | potency 80+ |
| High-Yield Fuel Core | 3 Enriched Fuel Rod | potency 85+ |
| Exotic Composite Hull | 2 Carbon Composite + 1 Hardened Alloy Bar | durability 80+ |
| Superconductor Coil | 2 Polished Crystal Lattice + 1 Fusion Gas Mix | potency 90+ |

## 4. Ship Component Recipes (16 — 4 per category)

**Weapons:**
| Output | Inputs | Threshold |
|---|---|---|
| Pulse Cannon | 2 Iron Ingot + 1 Focusing Lens | durability 40+ |
| Rail Driver | 2 Hardened Alloy Bar + 1 Meteoric Steel Bar | durability 60+ |
| Plasma Emitter | 2 Fusion Gas Mix + 1 Enriched Fuel Rod | potency 70+ |
| Ion Beam Array | 1 Precision Alloy Frame + 1 Master Crystal Array | potency 85+ |

**Engines:**
| Output | Inputs | Threshold |
|---|---|---|
| Chemical Thruster | 2 Carbon Composite + 1 Iron Ingot | durability 35+ |
| Ion Drive | 2 Fusion Gas Mix + 1 Focusing Lens | potency 55+ |
| Fusion Engine | 2 High-Yield Fuel Core | potency 75+ |
| Quantum Thruster | 1 Superconductor Coil + 1 Exotic Composite Hull | potency 90+ |

**Shields:**
| Output | Inputs | Threshold |
|---|---|---|
| Basic Deflector | 2 Glass Panel + 1 Iron Ingot | durability 40+ |
| Reinforced Barrier | 2 Hardened Alloy Bar + 1 Carbon Composite | durability 60+ |
| Energy Shield Array | 2 Focusing Lens + 1 Polished Crystal Lattice | potency 70+ |
| Aegis Field Generator | 1 Master Crystal Array + 1 Superconductor Coil | potency 90+ |

**Cargo Holds:**
| Output | Inputs | Threshold |
|---|---|---|
| Standard Cargo Bay | 2 Basic Cargo Crate | durability 30+ |
| Reinforced Hold | 2 Reinforced Panel + 1 Carbon Composite | durability 55+ |
| Expanded Freight Bay | 3 Exotic Composite Hull | durability 75+ |
| Vault-Class Container | 2 Precision Alloy Frame + 1 Meteoric Steel Bar | durability 85+ |

## 5. Schematics

**Recommendation:** the 8 tier 3-5 crafting recipes and the first tier in each component category (Iron Hull Plate-equivalent, Pulse Cannon, Chemical Thruster, Basic Deflector, Standard Cargo Bay) are **known by default** — no schematic required, so a new player can craft *something* immediately without needing to find anything first. Every other recipe (the 5 tier 6-7 crafting recipes + the remaining 12 component recipes = 17 total) requires discovering its schematic from a planet's market pool, per the existing schematic mechanic — no new schematic-specific content needed beyond mapping one schematic per recipe.

## 6. Tier 6-7 Crew Professions (5)

Mapped to the four component categories plus general crafted goods, closing the open item from Section 1.6:

| Profession | Specializes In |
|---|---|
| Weaponsmith | Weapon components |
| Engineer | Engine components |
| Shield Technician | Shield components |
| Cargo Specialist | Cargo hold components |
| Artisan | General tier 6-7 crafted goods (non-component) |

## 7. Ship Build Presets (4)

Onboarding content only — suggested component combinations, not a new data structure (per Section 1.7's recommendation):

| Preset | Weapon | Engine | Shield | Cargo Hold | Intent |
|---|---|---|---|---|---|
| Starter Runner | Pulse Cannon | Chemical Thruster | Basic Deflector | Standard Cargo Bay | Balanced, cheap, first ship |
| Hauler | Pulse Cannon | Chemical Thruster | Basic Deflector | Expanded Freight Bay | Cargo-focused |
| Scout | Rail Driver | Fusion Engine | Basic Deflector | Standard Cargo Bay | Speed-focused |
| Skirmisher | Ion Beam Array | Ion Drive | Aegis Field Generator | Standard Cargo Bay | Combat-focused |

---

## Remaining Content Loose Ends (from Section 1.6)

- **Schematic tier ↔ acquisition rarity:** still an open connection to decide — does a Weaponsmith-only schematic (e.g., Ion Beam Array) appear less often in market pools than a general recipe, independent of its tier roll? Recommend deciding this once the schematic pool-refresh logic is actually implemented, since it's a tuning question more than a content one.
- **Crafted-item aggregate tier formula:** recommend formally locking "straight average" now (matching ship tier and market listing tier) rather than leaving it as a stub — no reason to treat this one differently.
