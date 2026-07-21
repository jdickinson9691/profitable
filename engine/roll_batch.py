#!/usr/bin/env python3
"""Stat-roll generator (design doc §4, "suggested next steps" #1).

roll_batch() spawns a new material_batch for a given material_class on a
given planet (region_node), respecting:
  - the class envelope   (material_class.{stat}_min / {stat}_max)
  - the class floor       (material_class.{stat}_floor -- an absolute
                            guarantee that survives even a harsh negative
                            node bias)
  - the planet's bias     (region_node.{stat}_bias, -300..+300, added
                            before clamping)

It writes the new batch to both:
  - the SQLite db (material_batch table) -- the system of record that
    craft_engine.py reads from
  - the JSON universe state (engine/universe.py) -- the game-world
    bookkeeping layer of "which planets exist and what has spawned there"

If the planet doesn't exist yet in either store, it's created (registered)
first -- this is the "adding the planet to an ongoing data structure of
the game universe" behavior.

CLI:
    python engine/roll_batch.py db/local.db universe.json \\
        --material NEUT --planet KESSARI-PRIME \\
        --planet-name "Kessari Prime" --sector "Outer Reach" \\
        --bias si=40,cd=-20,dn=60,vo=-30 \\
        --count 3 --seed 7

If --planet-name/--sector/--bias are omitted for a planet that doesn't
exist yet, it's registered with a neutral (all-zero bias) profile that
you can edit later.
"""
from __future__ import annotations

import argparse
import random
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from universe import STATS, load_universe, record_batch, register_planet, save_universe


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def _get_or_create_planet_row(
    conn: sqlite3.Connection,
    code: str,
    name: str | None,
    sector: str | None,
    description: str | None,
    bias: dict[str, int],
) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM region_node WHERE code = ?", (code,)).fetchone()
    if row is not None:
        return row

    conn.execute(
        """INSERT INTO region_node
               (code, name, sector, description,
                si_bias, cd_bias, el_bias, pu_bias, dn_bias, vo_bias)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            code,
            name or code,
            sector,
            description,
            bias.get("si", 0), bias.get("cd", 0), bias.get("el", 0),
            bias.get("pu", 0), bias.get("dn", 0), bias.get("vo", 0),
        ),
    )
    conn.commit()
    return conn.execute("SELECT * FROM region_node WHERE code = ?", (code,)).fetchone()


def _next_batch_code(conn: sqlite3.Connection, class_code: str, rng: random.Random) -> str:
    while True:
        candidate = f"{class_code}-{rng.randint(10000, 99999)}"
        exists = conn.execute(
            "SELECT 1 FROM material_batch WHERE code = ?", (candidate,)
        ).fetchone()
        if not exists:
            return candidate


def roll_batch(
    conn: sqlite3.Connection,
    universe: dict[str, Any],
    material_class_code: str,
    planet_code: str,
    rng: random.Random,
    planet_name: str | None = None,
    planet_sector: str | None = None,
    planet_description: str | None = None,
    planet_bias: dict[str, int] | None = None,
) -> dict[str, Any]:
    """Roll and persist one new material_batch. Registers the planet (in
    both the db and the universe) first if it doesn't exist yet."""
    conn.row_factory = sqlite3.Row
    planet_bias = planet_bias or {}

    material_class = conn.execute(
        "SELECT * FROM material_class WHERE code = ?", (material_class_code,)
    ).fetchone()
    if material_class is None:
        raise ValueError(f"No material_class with code {material_class_code!r}")

    planet_row = _get_or_create_planet_row(
        conn, planet_code, planet_name, planet_sector, planet_description, planet_bias
    )
    register_planet(
        universe,
        code=planet_code,
        name=planet_row["name"],
        sector=planet_row["sector"],
        description=planet_row["description"],
        bias={stat: planet_row[f"{stat}_bias"] for stat in STATS},
        discovered_at=planet_row["discovered_at"],
    )

    stats: dict[str, int] = {}
    for stat in STATS:
        lo = material_class[f"{stat}_min"]
        hi = material_class[f"{stat}_max"]
        floor = material_class[f"{stat}_floor"]
        bias = planet_row[f"{stat}_bias"]

        raw_roll = rng.randint(lo, hi)
        biased = raw_roll + bias
        stats[stat] = _clamp(biased, floor, 1000)

    batch_code = _next_batch_code(conn, material_class_code, rng)
    rolled_at = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """INSERT INTO material_batch
               (code, material_class_id, region_node_id, rolled_at, si, cd, el, pu, dn, vo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            batch_code, material_class["id"], planet_row["id"], rolled_at,
            stats["si"], stats["cd"], stats["el"], stats["pu"], stats["dn"], stats["vo"],
        ),
    )
    conn.commit()

    record_batch(
        universe,
        planet_code=planet_code,
        batch_code=batch_code,
        material_class_code=material_class_code,
        stats=stats,
        rolled_at=rolled_at,
    )

    return {"code": batch_code, "planet": planet_code, "material_class": material_class_code, "stats": stats}


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


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("db_path")
    parser.add_argument("universe_path")
    parser.add_argument("--material", required=True, help="material_class code, e.g. NEUT")
    parser.add_argument("--planet", required=True, help="planet (region_node) code, e.g. KESSARI-PRIME")
    parser.add_argument("--planet-name")
    parser.add_argument("--sector")
    parser.add_argument("--description")
    parser.add_argument("--bias", type=_parse_bias_arg, default={}, help="e.g. si=40,dn=60,vo=-30")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args(argv)

    rng = random.Random(args.seed)
    conn = sqlite3.connect(args.db_path)
    universe_path = Path(args.universe_path)
    universe = load_universe(universe_path)

    for _ in range(args.count):
        result = roll_batch(
            conn, universe, args.material, args.planet, rng,
            planet_name=args.planet_name, planet_sector=args.sector,
            planet_description=args.description, planet_bias=args.bias,
        )
        stat_str = " ".join(f"{k}={v}" for k, v in result["stats"].items())
        print(f"Rolled {result['code']} on {result['planet']}: {stat_str}")

    save_universe(universe, universe_path)
    print(f"Universe state saved to {universe_path}")


if __name__ == "__main__":
    main(sys.argv[1:])
