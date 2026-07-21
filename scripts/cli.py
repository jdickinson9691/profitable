#!/usr/bin/env python3
"""Unified CLI for experimenting with the Profitable systems and data.

One entry point wrapping the five engine functions (roll, craft, refine,
sell, simulate) as subcommands, plus read-only `show` subcommands for
browsing the db's planets/materials/batches/schematics/crafters/listings/
recipes without hand-writing SQL.

Examples:
    python scripts/cli.py db/local.db show planets
    python scripts/cli.py db/local.db show materials
    python scripts/cli.py db/local.db show batches --planet KESSARI-PRIME
    python scripts/cli.py db/local.db show schematics
    python scripts/cli.py db/local.db show crafters
    python scripts/cli.py db/local.db show listings
    python scripts/cli.py db/local.db show recipes

    python scripts/cli.py db/local.db roll --material NEUT --planet KESSARI-PRIME --count 3 --seed 7
    python scripts/cli.py db/local.db craft "Capital Hull Plate" "Vex Marren" --slot "Structural=NEUT-48291" --seed 42
    python scripts/cli.py db/local.db refine --recipe "Neutronium Smelting" --batch NEUT-48291 --batch NEUT-77002
    python scripts/cli.py db/local.db sell --station "Kessari Trade Hub" --batch NEUT-48291 --price 4200
    python scripts/cli.py db/local.db simulate --material NEUT --planet KESSARI-PRIME \\
        --schematic "Capital Hull Plate" --crafter "Vex Marren" --n 1000 --seed 7
"""
from __future__ import annotations

import argparse
import random
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "engine"))

from balance_harness import run_simulation  # noqa: E402
from craft_engine import craft  # noqa: E402
from market import list_batch  # noqa: E402
from refine import refine  # noqa: E402
from roll_batch import roll_batch  # noqa: E402
from universe import load_universe, save_universe  # noqa: E402

STATS = ("si", "cd", "el", "pu", "dn", "vo")


def _print_table(headers: list[str], rows: list[list]) -> None:
    if not rows:
        print("(no rows)")
        return
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(str(cell)))

    def _fmt(row) -> str:
        return "  ".join(str(cell).ljust(widths[i]) for i, cell in enumerate(row))

    print(_fmt(headers))
    print("  ".join("-" * w for w in widths))
    for row in rows:
        print(_fmt(row))


def _parse_bias_arg(raw: str | None) -> dict[str, int]:
    if not raw:
        return {}
    bias: dict[str, int] = {}
    for pair in raw.split(","):
        stat, _, value = pair.partition("=")
        if stat not in STATS or not value:
            raise argparse.ArgumentTypeError(
                f"--bias entries must be one of {STATS}=value, got {pair!r}"
            )
        bias[stat] = int(value)
    return bias


def _parse_slot_arg(raw: str) -> tuple[str, str]:
    name, _, batch_code = raw.partition("=")
    if not batch_code:
        raise argparse.ArgumentTypeError(f"--slot must be SlotName=BatchCode, got {raw!r}")
    return name, batch_code


def _default_universe_path(db_path: str) -> Path:
    return Path(db_path).parent / "universe.json"


# ---------------------------------------------------------------------
# show: read-only browsing of db content
# ---------------------------------------------------------------------

def cmd_show_planets(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = conn.execute("SELECT * FROM region_node ORDER BY code").fetchall()
    table = []
    for r in rows:
        bias = " ".join(f"{s}={r[s + '_bias']:+d}" for s in STATS)
        table.append([r["code"], r["name"], r["sector"] or "", bias])
    _print_table(["code", "name", "sector", "bias"], table)


def cmd_show_materials(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = conn.execute("SELECT * FROM material_class ORDER BY tier, code").fetchall()
    table = [[r["code"], r["name"], r["tier"], r["stage"]] for r in rows]
    _print_table(["code", "name", "tier", "stage"], table)


def cmd_show_batches(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    query = (
        "SELECT material_batch.*, material_class.code AS class_code, "
        "region_node.code AS planet_code "
        "FROM material_batch "
        "JOIN material_class ON material_class.id = material_batch.material_class_id "
        "JOIN region_node ON region_node.id = material_batch.region_node_id"
    )
    params: list[str] = []
    if args.planet:
        query += " WHERE region_node.code = ?"
        params.append(args.planet)
    if args.material:
        query += (" AND" if params else " WHERE") + " material_class.code = ?"
        params.append(args.material)
    query += " ORDER BY material_batch.rolled_at"

    rows = conn.execute(query, params).fetchall()
    table = []
    for r in rows:
        stat_str = " ".join(f"{s}={r[s]}" for s in STATS)
        table.append([r["code"], r["class_code"], r["planet_code"], stat_str])
    _print_table(["code", "class", "planet", "stats"], table)


def cmd_show_schematics(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    schematics = conn.execute("SELECT * FROM schematic ORDER BY name").fetchall()
    for s in schematics:
        print(f"{s['name']} (tier {s['tier_requirement']}, output: {s['output_name']})")
        slots = conn.execute(
            "SELECT * FROM ingredient_slot WHERE schematic_id = ?", (s["id"],)
        ).fetchall()
        table = []
        for slot in slots:
            parts = []
            for stat in STATS:
                key = f"w_{stat}"
                value = slot[key]
                if value:
                    parts.append(f"{key}={value:.2f}")
            table.append([slot["slot_name"], slot["slot_weight"], " ".join(parts)])
        _print_table(["slot", "weight", "stat weights"], table)
        print()


def cmd_show_crafters(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = conn.execute("SELECT * FROM crafter ORDER BY name").fetchall()
    table = [[r["name"], f"{r['skill_factor']:.2f}"] for r in rows]
    _print_table(["name", "skill_factor"], table)


def cmd_show_listings(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = conn.execute(
        "SELECT market_listing.*, station.name AS station_name, "
        "material_batch.code AS batch_code "
        "FROM market_listing "
        "JOIN station ON station.id = market_listing.station_id "
        "JOIN material_batch ON material_batch.id = market_listing.batch_id "
        "ORDER BY market_listing.listed_at"
    ).fetchall()
    table = [[r["id"], r["station_name"], r["batch_code"], r["price"], r["listed_at"]] for r in rows]
    _print_table(["id", "station", "batch", "price", "listed_at"], table)


def cmd_show_recipes(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = conn.execute(
        "SELECT refining_recipe.*, ic.code AS input_code, oc.code AS output_code "
        "FROM refining_recipe "
        "JOIN material_class ic ON ic.id = refining_recipe.input_class_id "
        "JOIN material_class oc ON oc.id = refining_recipe.output_class_id "
        "ORDER BY refining_recipe.name"
    ).fetchall()
    table = [[r["name"], r["input_code"], r["output_code"]] for r in rows]
    _print_table(["recipe", "input", "output"], table)


SHOW_COMMANDS = {
    "planets": cmd_show_planets,
    "materials": cmd_show_materials,
    "batches": cmd_show_batches,
    "schematics": cmd_show_schematics,
    "crafters": cmd_show_crafters,
    "listings": cmd_show_listings,
    "recipes": cmd_show_recipes,
}


# ---------------------------------------------------------------------
# action commands: wrap the five engine functions
# ---------------------------------------------------------------------

def cmd_roll(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    universe_path = Path(args.universe) if args.universe else _default_universe_path(args.db_path)
    universe = load_universe(universe_path)
    rng = random.Random(args.seed)

    for _ in range(args.count):
        result = roll_batch(
            conn, universe, args.material, args.planet, rng,
            planet_name=args.planet_name, planet_sector=args.sector,
            planet_description=args.description, planet_bias=args.bias,
        )
        stat_str = " ".join(f"{k}={v}" for k, v in result["stats"].items())
        print(f"Rolled {result['code']} on {result['planet']}: {stat_str}")

    save_universe(universe, universe_path)


def cmd_craft(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rng = random.Random(args.seed)
    result = craft(conn, args.schematic, args.crafter, dict(args.slots), rng)

    for r in result["slot_results"]:
        print(f"Slot {r.slot_name!r} <- {r.batch_code}: SlotQuality = {r.slot_quality:.2f}")
    print(f"IBQ: {result['ibq']:.1f}")
    print(f"Experimentation roll: {result['exp_roll']:.2f}")
    print(f"Final Item Quality: {result['final_quality']:.2f}  ({result['quality_band']})")


def cmd_refine(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    result = refine(conn, args.recipe, args.batches)
    stat_str = " ".join(f"{k}={v}" for k, v in result["stats"].items())
    print(f"Refined {result['code']} ({result['material_class']}) "
          f"from {result['input_batches']}: {stat_str}")


def cmd_sell(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    listing_id = list_batch(conn, args.station, args.batch, args.price)
    print(f"Listed {args.batch} at {args.station!r} for {args.price}: listing_id={listing_id}")


def cmd_simulate(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rng = random.Random(args.seed)
    result = run_simulation(conn, args.material, args.planet, args.schematic, args.crafter, args.n, rng)

    print(f"Ran {result['n']} synthetic crafts of {args.schematic!r} using {args.material}/{args.planet}:")
    print(f"  mean={result['mean_quality']:.2f} min={result['min_quality']:.2f} "
          f"max={result['max_quality']:.2f} stdev={result['stdev_quality']:.2f}")
    print(f"  bands: {result['band_counts']}")


# ---------------------------------------------------------------------
# argument parsing
# ---------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("db_path")
    sub = parser.add_subparsers(dest="command", required=True)

    show = sub.add_parser("show", help="browse db content")
    show_sub = show.add_subparsers(dest="what", required=True)
    show_batches = show_sub.add_parser("batches")
    show_batches.add_argument("--planet")
    show_batches.add_argument("--material")
    for name in ("planets", "materials", "schematics", "crafters", "listings", "recipes"):
        show_sub.add_parser(name)

    roll = sub.add_parser("roll", help="roll a new material_batch (wraps roll_batch.py)")
    roll.add_argument("--material", required=True, help="material_class code, e.g. NEUT")
    roll.add_argument("--planet", required=True, help="planet (region_node) code, e.g. KESSARI-PRIME")
    roll.add_argument("--planet-name")
    roll.add_argument("--sector")
    roll.add_argument("--description")
    roll.add_argument("--bias", type=_parse_bias_arg, default={}, help="e.g. si=40,dn=60,vo=-30")
    roll.add_argument("--count", type=int, default=1)
    roll.add_argument("--seed", type=int, default=None)
    roll.add_argument("--universe", help="path to universe.json (default: alongside db_path)")

    craft_p = sub.add_parser("craft", help="craft an item from a schematic (wraps craft_engine.py)")
    craft_p.add_argument("schematic")
    craft_p.add_argument("crafter")
    craft_p.add_argument(
        "--slot", action="append", dest="slots", default=[], type=_parse_slot_arg,
        required=True, help="SlotName=BatchCode, repeatable",
    )
    craft_p.add_argument("--seed", type=int, default=None)

    refine_p = sub.add_parser("refine", help="execute a refining_recipe (wraps refine.py)")
    refine_p.add_argument("--recipe", required=True, help="refining_recipe name")
    refine_p.add_argument(
        "--batch", action="append", dest="batches", default=[],
        required=True, help="input material_batch code, repeatable",
    )

    sell_p = sub.add_parser("sell", help="create a market_listing (wraps market.py's list_batch)")
    sell_p.add_argument("--station", required=True, help="station name")
    sell_p.add_argument("--batch", required=True, help="material_batch code")
    sell_p.add_argument("--price", type=float, required=True)

    sim_p = sub.add_parser("simulate", help="Monte Carlo balance harness (wraps balance_harness.py)")
    sim_p.add_argument("--material", required=True)
    sim_p.add_argument("--planet", required=True)
    sim_p.add_argument("--schematic", required=True)
    sim_p.add_argument("--crafter", required=True)
    sim_p.add_argument("--n", type=int, default=1000)
    sim_p.add_argument("--seed", type=int, default=None)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row
    try:
        if args.command == "show":
            SHOW_COMMANDS[args.what](conn, args)
        elif args.command == "roll":
            cmd_roll(conn, args)
        elif args.command == "craft":
            cmd_craft(conn, args)
        elif args.command == "refine":
            cmd_refine(conn, args)
        elif args.command == "sell":
            cmd_sell(conn, args)
        elif args.command == "simulate":
            cmd_simulate(conn, args)
    finally:
        conn.close()


if __name__ == "__main__":
    main(sys.argv[1:])
