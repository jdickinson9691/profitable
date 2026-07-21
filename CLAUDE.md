# Profitable

A material-tier crafting/trading system for a space game (design inspired by
TradeWars 2002, Jumpgate, and Star Wars Galaxies): five material tiers, six
multi-dimensional quality stats per material batch, and a recipe-weighted
crafting formula that turns raw material quality into finished-item quality.

## Layout

```
docs/design/     Design docs (system design + data model rationale)
db/              SQLite schema and seed fixtures
engine/          Reference Python implementation of the crafting math
scripts/         Convenience scripts (e.g. rebuilding the local DB)
tests/           Smoke tests
```

## Core concepts

- **Six stats**, always in this order: `si` (Structural Integrity), `cd`
  (Conductivity), `el` (Elasticity), `pu` (Purity), `dn` (Density), `vo`
  (Volatility). Every stat is an integer 0–1000.
- **`material_class`** — a template (e.g. "Neutronium Ore"): tier (1–5),
  stage (`raw` / `refined` / `component`), and a min/max/floor envelope per
  stat.
- **`region_node`** — a planet. Adds a small additive per-stat bias
  (-300..+300) applied before clamping to the class envelope/floor. Planet
  fields: `code`, `name`, `sector`, `description`, `discovered_at`, plus
  `{stat}_bias` columns.
- **`material_batch`** — a concrete, tradeable, rolled lot of a
  `material_class`, spawned on a specific `region_node`.
- **`ingredient_slot`** — on a `schematic`, has a `slot_weight` (how much
  this slot counts toward item quality) and six `w_{stat}` weights (how the
  slot scores a candidate batch). The six weights should sum to ~1.0.
- **Crafting pipeline** (`engine/craft_engine.py`):
  `slot_quality` → `item_base_quality` (IBQ) → `experimentation_roll` →
  `final_quality` → `quality_band` lookup → `persist_craft`.
- **Stat-roll generation** (`engine/roll_batch.py`): rolls a new
  `material_batch` for a `material_class` on a planet, respecting envelope
  + floor + planet bias. Auto-registers new planets in both the SQLite db
  and `engine/universe.py`'s JSON "universe" state
  (`db/universe.json`, gitignored — regenerate with `roll_batch.py`).
- **Market listings** (`engine/market.py`): `list_batch(conn, station_code,
  batch_code, price) -> listing_id` creates a `market_listing` row for an
  existing `material_batch` at an existing `station`. `station` has no
  `code` column, so it's looked up by its `name` column instead.
- **Balance harness** (`engine/balance_harness.py`): `run_simulation(conn,
  material_class_code, planet_code, schematic_name, crafter_name, n, rng)`
  rolls `n` synthetic material stat sets (same envelope/floor/bias math as
  `roll_batch.py`, but ephemeral — nothing is persisted to `material_batch`/
  `region_node`), crafts them against a schematic's slots, and returns a
  `final_quality` distribution summary (mean/min/max/stdev + quality-band
  counts). For sanity-checking tier/stat-weight tuning without polluting the
  db with throwaway batches.

## Conventions

- Python 3.9+, standard library only — no external dependencies.
- SQLite via the stdlib `sqlite3` module; schema is written to be portable
  to Postgres with minor type swaps.
- Codes (material_class, region_node, material_batch) are short, uppercase,
  hyphenated: `NEUT`, `KESSARI-PRIME`, `NEUT-48291`.
- Generated artifacts (`db/local.db`, `db/universe.json`) are gitignored —
  never commit them. Rebuild with `python scripts/build_db.py`.

## Commands

```powershell
python scripts/build_db.py db/local.db
python engine/craft_engine.py db/local.db "Capital Hull Plate" "Vex Marren" --slot "Structural=NEUT-48291" --seed 42
python engine/roll_batch.py db/local.db db/universe.json --material NEUT --planet KESSARI-PRIME --count 5 --seed 7
python engine/market.py db/local.db --station "Kessari Trade Hub" --batch NEUT-48291 --price 4200
python engine/balance_harness.py db/local.db --material NEUT --planet KESSARI-PRIME --schematic "Capital Hull Plate" --crafter "Vex Marren" --n 1000 --seed 7
python tests/test_craft_engine.py
```

## Status / next steps

See `docs/design/data-model.md` §4 for the full roadmap. Current state:

- [x] Schema, seed data, crafting engine (validated against the design
      doc's worked example)
- [x] Stat-roll generator with planet support (`roll_batch.py`)
- [x] Balance harness — Monte Carlo script to sanity-check tier/stat-weight
      tuning (`balance_harness.py`)
- [ ] Refining execution — `refine(recipe, input_batches) -> new_batch`
      implementing variance-reduction/blending math (§6 of the design doc).
      `refining_recipe` table exists but nothing executes it yet.
- [ ] Market/turn economy — listing creation exists (`market.py`'s
      `list_batch`), but there's still no purchase/transaction or
      turn-budget logic.

## Working style

- Keep the standard-library-only constraint — don't add pip dependencies.
- Match existing code style in `engine/` (dataclasses for structured
  results, argparse CLIs with a `main(argv)` entry point, docstrings that
  explain the *why* not just the *what*).
- Add/extend smoke tests in `tests/test_craft_engine.py` for new engine
  functions.
- After making changes: run `python tests/test_craft_engine.py` before
  considering a task done.
