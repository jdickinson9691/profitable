#!/usr/bin/env python3
"""Monte Carlo balance harness (design doc §4, "suggested next steps" #3).

run_simulation() rolls `n` synthetic material_batch stat sets for
material_class_code on planet_code -- the same envelope/floor/bias math as
roll_batch.py, but ephemeral: nothing is written to material_batch or
region_node. Each synthetic batch fills every ingredient_slot on
schematic_name, crafted by crafter_name, and the resulting final_quality
distribution is aggregated. Lets tier/stat-weight tuning be sanity-checked
without polluting the db with throwaway batches.

CLI:
    python engine/simulate.py db/local.db --material NEUT --planet KESSARI-PRIME \\
        --schematic "Capital Hull Plate" --crafter "Vex Marren" --n 1000 --seed 7
"""
from __future__ import annotations

import argparse
import random
import sqlite3
import statistics
import sys
from collections import Counter
from typing import Any

from craft_engine import (
    STATS,
    SlotResult,
    experimentation_roll,
    final_quality,
    item_base_quality,
    lookup_quality_band,
    slot_quality,
)


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def _roll_stats(material_class: sqlite3.Row, planet: sqlite3.Row, rng: random.Random) -> dict[str, int]:
    stats: dict[str, int] = {}
    for stat in STATS:
        lo = material_class[f"{stat}_min"]
        hi = material_class[f"{stat}_max"]
        floor = material_class[f"{stat}_floor"]
        bias = planet[f"{stat}_bias"]

        raw_roll = rng.randint(lo, hi)
        biased = raw_roll + bias
        stats[stat] = _clamp(biased, floor, 1000)
    return stats


def run_simulation(
    conn: sqlite3.Connection,
    material_class_code: str,
    planet_code: str,
    schematic_name: str,
    crafter_name: str,
    n: int,
    rng: random.Random,
) -> dict[str, Any]:
    """Roll `n` synthetic batches of material_class_code on planet_code and
    craft schematic_name with crafter_name against each, using the same
    rolled batch to fill every ingredient_slot. Returns a summary of the
    resulting final_quality distribution. Nothing is persisted to the db."""
    conn.row_factory = sqlite3.Row

    material_class = conn.execute(
        "SELECT * FROM material_class WHERE code = ?", (material_class_code,)
    ).fetchone()
    if material_class is None:
        raise ValueError(f"No material_class with code {material_class_code!r}")

    planet = conn.execute(
        "SELECT * FROM region_node WHERE code = ?", (planet_code,)
    ).fetchone()
    if planet is None:
        raise ValueError(f"No region_node with code {planet_code!r}")

    schematic = conn.execute(
        "SELECT * FROM schematic WHERE name = ?", (schematic_name,)
    ).fetchone()
    if schematic is None:
        raise ValueError(f"No schematic named {schematic_name!r}")

    slots = conn.execute(
        "SELECT * FROM ingredient_slot WHERE schematic_id = ?", (schematic["id"],)
    ).fetchall()
    if not slots:
        raise ValueError(f"Schematic {schematic_name!r} has no ingredient slots")

    crafter = conn.execute(
        "SELECT * FROM crafter WHERE name = ?", (crafter_name,)
    ).fetchone()
    if crafter is None:
        raise ValueError(f"No crafter named {crafter_name!r}")

    final_qualities: list[float] = []
    band_counts: Counter = Counter()

    for _ in range(n):
        stats = _roll_stats(material_class, planet, rng)
        slot_results = [
            SlotResult(slot["slot_name"], slot["slot_weight"], "<synthetic>", slot_quality(stats, slot))
            for slot in slots
        ]
        ibq = item_base_quality(slot_results)
        exp_roll = experimentation_roll(ibq, crafter["skill_factor"], rng)
        final_q = final_quality(ibq, crafter["skill_factor"], exp_roll)
        band = lookup_quality_band(conn, final_q)

        final_qualities.append(final_q)
        band_counts[band] += 1

    return {
        "n": n,
        "mean_quality": statistics.mean(final_qualities),
        "min_quality": min(final_qualities),
        "max_quality": max(final_qualities),
        "stdev_quality": statistics.pstdev(final_qualities) if n > 1 else 0.0,
        "band_counts": dict(band_counts),
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("db_path")
    parser.add_argument("--material", required=True, help="material_class code, e.g. NEUT")
    parser.add_argument("--planet", required=True, help="planet (region_node) code, e.g. KESSARI-PRIME")
    parser.add_argument("--schematic", required=True)
    parser.add_argument("--crafter", required=True)
    parser.add_argument("--n", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args(argv)

    rng = random.Random(args.seed)
    conn = sqlite3.connect(args.db_path)

    result = run_simulation(conn, args.material, args.planet, args.schematic, args.crafter, args.n, rng)

    print(f"Ran {result['n']} synthetic crafts of {args.schematic!r} using {args.material}/{args.planet}:")
    print(f"  mean={result['mean_quality']:.2f} min={result['min_quality']:.2f} "
          f"max={result['max_quality']:.2f} stdev={result['stdev_quality']:.2f}")
    print(f"  bands: {result['band_counts']}")


if __name__ == "__main__":
    main(sys.argv[1:])
