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
gui/             Tkinter desktop GUI (all engine functions + world generation)
scripts/         Convenience scripts (e.g. rebuilding the local DB, unified CLI)
packaging/       PyInstaller spec + Inno Setup script for a standalone Windows installer
tests/           Smoke tests
pyproject.toml   Packaging -- editable-installable, provides the `profitable` /
                 `profitable-gui` console/gui scripts
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
- **Refining** (`engine/refine.py`): `refine(conn, recipe, input_batches) ->
  new_batch` executes a `refining_recipe` against a list of input
  `material_batch` codes. Blending strategy is best-of-per-stat: the new
  batch takes the MAX value across all inputs for each of the six stats,
  floor-clamped to the output `material_class`'s floor (capped at 1000).
  Deterministic — no `rng` needed. The new batch spawns on the same
  `region_node` as the first input batch.
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
- **Unified CLI** (`scripts/cli.py`): one entry point wrapping all five
  engine functions as subcommands (`roll`, `craft`, `refine`, `sell`,
  `simulate`), plus `build-db` and read-only `show` subcommands (`planets`,
  `materials`, `batches`, `schematics`, `crafters`, `listings`, `recipes`)
  for browsing db content without hand-writing SQL. Stdlib-only — table
  formatting is hand-rolled, no `rich`/`click`.
- **World generation** (`engine/worldgen.py` + `engine/namegen.py`):
  `generate_world(conn, n_planets, n_materials, n_recipes, rng)` (or the
  three `generate_planets`/`generate_materials`/`generate_schematics`
  functions individually) procedurally creates that many new planets, raw
  material classes, and crafting schematics with randomized-but-plausible
  names, envelopes, biases, and slot weights. `namegen.py` holds the
  curated word lists + name/code generation helpers (no external data,
  fully deterministic given a seeded `random.Random`). "Crafting recipes"
  here means `schematic` + `ingredient_slot` (item recipes), not
  `refining_recipe` (material-to-material transforms, handled separately
  by `refine.py`).
- **GUI** (`gui/app.py`): a Tkinter desktop app wrapping every engine
  function above (roll/craft/refine/sell/simulate/generate-world) plus
  read-only browse tables for all seven entity types, in one window with
  File > Open/New Database. Stdlib-only (tkinter ships with Python) — no
  new runtime dependency. Run via `python gui/app.py` or (once installed)
  the `profitable-gui` command.

## Conventions

- Python 3.9+, standard library only — no external dependencies.
- SQLite via the stdlib `sqlite3` module; schema is written to be portable
  to Postgres with minor type swaps.
- Codes (material_class, region_node, material_batch) are short, uppercase,
  hyphenated: `NEUT`, `KESSARI-PRIME`, `NEUT-48291`.
- Generated artifacts (`db/local.db`, `db/universe.json`) are gitignored —
  never commit them. Rebuild with `python scripts/build_db.py`.

## Installing

`pyproject.toml` declares `engine/`, `scripts/`, and `gui/` as packages
(each has an `__init__.py`) and registers `scripts.cli:main` as the
`profitable` console script and `gui.app:main` as the `profitable-gui`
gui-script (no console window). `scripts/cli.py` and `gui/app.py` both use
qualified imports (`from engine.craft_engine import craft`, etc.) rather
than bare/flat imports, specifically so PyInstaller's static analysis can
trace and bundle them (see "Building a standalone installer" below).
`engine/roll_batch.py` and `engine/balance_harness.py` still try a relative
import first, falling back to a flat one (`from .universe import ...` /
`except ImportError: from universe import ...`) — this keeps `python
engine/roll_batch.py` runnable standalone (relative imports need a parent
package) while also working when imported via `engine.roll_batch`.

```powershell
python -m pip install -e .
profitable db/local.db show batches
profitable-gui
```

This works via `pip install -e .` (editable install) from anywhere, since
`db_path` is always an explicit argument. Note: `db/schema.sql` /
`seed_data.sql` are located relative to `scripts/build_db.py`'s own file
path, which only resolves correctly for an editable install (source stays
in place) — a real wheel/sdist would need those SQL files declared as
package data, which hasn't been done (the PyInstaller build below handles
this differently, via bundled data files).

## Building a standalone installer

`packaging/profitable.spec` (PyInstaller) + `packaging/profitable.iss`
(Inno Setup) produce a real double-clickable `ProfitableSetup.exe` that
needs neither Python nor this repo on the target machine.

```powershell
python -m pip install pyinstaller
pyinstaller packaging/profitable.spec --distpath dist --workpath build --noconfirm
iscc packaging/profitable.iss   # requires Inno Setup 6 (ISCC.exe) installed
```

- PyInstaller builds a onedir bundle at `dist/profitable/` containing both
  `profitable.exe` (console CLI) and `profitable-gui.exe` (windowed GUI),
  sharing bundled `db/schema.sql` + `db/seed_data.sql` data files so
  `build-db` / "New Database" works with no source repo at runtime (see
  `scripts/build_db.py`'s `_db_resource_dir()`, which branches on
  `sys.frozen` / `sys._MEIPASS`).
- Inno Setup wraps that into `dist/installer/ProfitableSetup.exe`: a
  per-user install (no admin required) under
  `%LocalAppData%\Programs\Profitable`, with Start Menu/Desktop shortcuts
  to the GUI (primary) and a "(Console)" shortcut that opens a persistent
  cmd prompt via `packaging/profitable-shell.bat` (a direct shortcut to
  `profitable.exe` with no args would flash and close instantly). An
  optional task adds the install dir to the user's `PATH`, with a matching
  `CurUninstallStepChanged` step in `[Code]` that surgically removes just
  that segment on uninstall (not `Flags: uninsdeletevalue`, which would
  delete the *entire* `Path` value).
- A post-install `[Run]` step silently runs `build-db` to create a starter
  `{app}\data\local.db`.

## Commands

```powershell
python scripts/build_db.py db/local.db
python engine/craft_engine.py db/local.db "Capital Hull Plate" "Vex Marren" --slot "Structural=NEUT-48291" --seed 42
python engine/roll_batch.py db/local.db db/universe.json --material NEUT --planet KESSARI-PRIME --count 5 --seed 7
python engine/refine.py db/local.db --recipe "Neutronium Smelting" --batch NEUT-48291 --batch NEUT-77002
python engine/market.py db/local.db --station "Kessari Trade Hub" --batch NEUT-48291 --price 4200
python engine/balance_harness.py db/local.db --material NEUT --planet KESSARI-PRIME --schematic "Capital Hull Plate" --crafter "Vex Marren" --n 1000 --seed 7
python tests/test_craft_engine.py

# Or use the unified CLI for all of the above, plus read-only browsing
# (either form works once installed; `profitable` needs `pip install -e .` first):
python scripts/cli.py db/local.db show batches --planet KESSARI-PRIME
profitable db/local.db craft "Capital Hull Plate" "Vex Marren" --slot "Structural=NEUT-48291" --seed 42

# Or the GUI (all of the above, plus a Generate World tab):
python gui/app.py
profitable-gui
```

## Status / next steps

See `docs/design/data-model.md` §4 for the full roadmap. Current state:

- [x] Schema, seed data, crafting engine (validated against the design
      doc's worked example)
- [x] Stat-roll generator with planet support (`roll_batch.py`)
- [x] Balance harness — Monte Carlo script to sanity-check tier/stat-weight
      tuning (`balance_harness.py`)
- [x] Refining execution — `refine(recipe, input_batches) -> new_batch`
      (`refine.py`), best-of-per-stat blending, floor-clamped to the output
      class.
- [x] World generation — procedural planets/materials/crafting schematics
      at any scale (`worldgen.py` + `namegen.py`).
- [x] GUI — Tkinter desktop app wrapping every engine function
      (`gui/app.py`), packaged into a standalone Windows installer
      (`packaging/`).
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
- `gui/app.py` has no automated test file (Tkinter has no easy headless
  test mode) -- verify changes by instantiating `App`, calling
  `_set_connection(db_path)`, and driving the relevant tab's `_on_*`
  handler methods directly (set combobox/entry values, then call the
  handler) rather than relying on visual/mouse interaction.
