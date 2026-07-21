#!/usr/bin/env python3
"""Refining execution (design doc §6 -- variance-reduction/blending math).

refine() executes a refining_recipe against a list of input material_batch
codes, producing one new material_batch of the recipe's output_class.

Blending strategy: best-of-per-stat. For each of the six stats, the new
batch takes the MAX value rolled across all input batches -- refining lets
you cull the best rolls out of a set of raw batches rather than average
them down. The per-stat max is then clamped to [output_class.{stat}_floor,
1000], the same floor-guarantee clamp used by roll_batch.py and
balance_harness.py.

CLI:
    python engine/refine.py db/local.db --recipe "Neutronium Smelting" \\
        --batch NEUT-48291 --batch NEUT-77002
"""
from __future__ import annotations

import argparse
import random
import sqlite3
import sys
from datetime import datetime, timezone

STATS = ("si", "cd", "el", "pu", "dn", "vo")


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def _next_batch_code(conn: sqlite3.Connection, class_code: str) -> str:
    rng = random.Random()
    while True:
        candidate = f"{class_code}-{rng.randint(10000, 99999)}"
        exists = conn.execute(
            "SELECT 1 FROM material_batch WHERE code = ?", (candidate,)
        ).fetchone()
        if not exists:
            return candidate


def refine(conn: sqlite3.Connection, recipe: str, input_batches: list[str]) -> dict:
    """Execute refining_recipe `recipe` against `input_batches` (material_batch
    codes), producing one new material_batch of the recipe's output_class.
    Each stat on the new batch is the max value rolled across all inputs,
    floor-clamped to the output class's floor. Persists the new batch and
    returns its code, material_class, input batches, and stats."""
    conn.row_factory = sqlite3.Row

    recipe_row = conn.execute(
        "SELECT * FROM refining_recipe WHERE name = ?", (recipe,)
    ).fetchone()
    if recipe_row is None:
        raise ValueError(f"No refining_recipe named {recipe!r}")

    if not input_batches:
        raise ValueError("refine() requires at least one input batch")

    batch_rows = []
    for batch_code in input_batches:
        batch_row = conn.execute(
            "SELECT * FROM material_batch WHERE code = ?", (batch_code,)
        ).fetchone()
        if batch_row is None:
            raise ValueError(f"No material_batch with code {batch_code!r}")
        if batch_row["material_class_id"] != recipe_row["input_class_id"]:
            raise ValueError(
                f"Batch {batch_code!r} is not of recipe {recipe!r}'s input material_class"
            )
        batch_rows.append(batch_row)

    output_class = conn.execute(
        "SELECT * FROM material_class WHERE id = ?", (recipe_row["output_class_id"],)
    ).fetchone()

    stats: dict[str, int] = {}
    for stat in STATS:
        best = max(row[stat] for row in batch_rows)
        floor = output_class[f"{stat}_floor"]
        stats[stat] = _clamp(best, floor, 1000)

    # New batch spawns on the same planet as the first input batch.
    region_node_id = batch_rows[0]["region_node_id"]

    batch_code = _next_batch_code(conn, output_class["code"])
    rolled_at = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """INSERT INTO material_batch
               (code, material_class_id, region_node_id, rolled_at, si, cd, el, pu, dn, vo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            batch_code, output_class["id"], region_node_id, rolled_at,
            stats["si"], stats["cd"], stats["el"], stats["pu"], stats["dn"], stats["vo"],
        ),
    )
    conn.commit()

    return {
        "code": batch_code,
        "material_class": output_class["code"],
        "input_batches": list(input_batches),
        "stats": stats,
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("db_path")
    parser.add_argument("--recipe", required=True, help="refining_recipe name")
    parser.add_argument(
        "--batch", action="append", dest="batches", default=[],
        help="input material_batch code, repeatable",
    )
    args = parser.parse_args(argv)

    if not args.batches:
        parser.error("at least one --batch is required")

    conn = sqlite3.connect(args.db_path)
    result = refine(conn, args.recipe, args.batches)

    stat_str = " ".join(f"{k}={v}" for k, v in result["stats"].items())
    print(f"Refined {result['code']} ({result['material_class']}) "
          f"from {result['input_batches']}: {stat_str}")


if __name__ == "__main__":
    main(sys.argv[1:])
