#!/usr/bin/env python3
"""Reference implementation of the crafting math (docs/design/data-model.md, §2).

Pipeline:
    1. slot_quality(batch, slot)            -> Sum(stat_value * stat_weight)
    2. item_base_quality(slot_results, slots) -> Sum(SlotQuality_i * SlotWeight_i)  == IBQ
    3. experimentation_roll(ibq, skill_factor) -> small, capped bonus
    4. final_quality(ibq, skill_factor, exp_roll) -> IBQ * (0.85 + 0.15*skill) + exp_roll, capped at 1000
    5. quality_band(final_quality)           -> lookup in quality_band table
    6. persist_craft(...)                    -> writes crafted_item + item_ingredient rows

Runnable as a CLI:
    python engine/craft_engine.py db/local.db "Capital Hull Plate" "Vex Marren" \\
        --slot "Structural=NEUT-48291" [--seed 42]
"""
from __future__ import annotations

import argparse
import random
import sqlite3
import sys
from dataclasses import dataclass

STATS = ("si", "cd", "el", "pu", "dn", "vo")


@dataclass
class SlotResult:
    slot_name: str
    slot_weight: float
    batch_code: str
    slot_quality: float


def slot_quality(batch_row: sqlite3.Row, slot_row: sqlite3.Row) -> float:
    """Sum(stat_value * stat_weight) across the six stats for one slot."""
    return sum(batch_row[stat] * slot_row[f"w_{stat}"] for stat in STATS)


def item_base_quality(slot_results: list[SlotResult]) -> float:
    """Sum(SlotQuality_i * SlotWeight_i) across all filled slots -> IBQ."""
    return sum(r.slot_quality * r.slot_weight for r in slot_results)


def experimentation_roll(ibq: float, skill_factor: float, rng: random.Random) -> float:
    """A small, capped bonus.

    Shrinks as IBQ approaches 1000 (there's less room left to gain) and
    scales partially with crafter skill. Deliberately small -- it can't
    rescue bad materials, matching the design intent that materials
    dominate outcome.
    """
    room_left = max(0.0, 1000.0 - ibq)
    max_bonus = room_left * 0.15
    skill_scaling = 0.5 + 0.5 * skill_factor
    return rng.uniform(0.0, max_bonus) * skill_scaling


def final_quality(ibq: float, skill_factor: float, exp_roll: float) -> float:
    """IBQ * (0.85 + 0.15 * skill_factor) + exp_roll, capped at 1000."""
    value = ibq * (0.85 + 0.15 * skill_factor) + exp_roll
    return min(value, 1000.0)


def lookup_quality_band(conn: sqlite3.Connection, final_q: float) -> str:
    row = conn.execute(
        "SELECT name FROM quality_band WHERE ? BETWEEN min_value AND max_value",
        (final_q,),
    ).fetchone()
    if row is None:
        raise ValueError(f"No quality_band covers final_quality={final_q}")
    return row["name"]


def persist_craft(
    conn: sqlite3.Connection,
    schematic_id: int,
    crafter_id: int,
    ibq: float,
    exp_roll: float,
    final_q: float,
    band: str,
    slot_results: list[tuple[int, int, float]],  # (slot_id, batch_id, slot_quality)
) -> int:
    cur = conn.execute(
        """INSERT INTO crafted_item (schematic_id, crafter_id, ibq, exp_roll, final_quality, quality_band)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (schematic_id, crafter_id, ibq, exp_roll, final_q, band),
    )
    crafted_item_id = cur.lastrowid
    conn.executemany(
        """INSERT INTO item_ingredient (crafted_item_id, slot_id, batch_id, slot_quality)
           VALUES (?, ?, ?, ?)""",
        [(crafted_item_id, slot_id, batch_id, sq) for slot_id, batch_id, sq in slot_results],
    )
    conn.commit()
    return crafted_item_id


def craft(
    conn: sqlite3.Connection,
    schematic_name: str,
    crafter_name: str,
    slot_assignments: dict[str, str],  # slot_name -> batch_code
    rng: random.Random,
) -> dict:
    conn.row_factory = sqlite3.Row

    schematic = conn.execute(
        "SELECT * FROM schematic WHERE name = ?", (schematic_name,)
    ).fetchone()
    if schematic is None:
        raise ValueError(f"No schematic named {schematic_name!r}")

    crafter = conn.execute(
        "SELECT * FROM crafter WHERE name = ?", (crafter_name,)
    ).fetchone()
    if crafter is None:
        raise ValueError(f"No crafter named {crafter_name!r}")

    slots = conn.execute(
        "SELECT * FROM ingredient_slot WHERE schematic_id = ?", (schematic["id"],)
    ).fetchall()
    slots_by_name = {s["slot_name"]: s for s in slots}

    slot_results: list[SlotResult] = []
    persist_rows: list[tuple[int, int, float]] = []

    for slot_name, batch_code in slot_assignments.items():
        slot_row = slots_by_name.get(slot_name)
        if slot_row is None:
            raise ValueError(f"Schematic {schematic_name!r} has no slot named {slot_name!r}")

        batch_row = conn.execute(
            "SELECT * FROM material_batch WHERE code = ?", (batch_code,)
        ).fetchone()
        if batch_row is None:
            raise ValueError(f"No material_batch with code {batch_code!r}")

        sq = slot_quality(batch_row, slot_row)
        slot_results.append(SlotResult(slot_name, slot_row["slot_weight"], batch_code, sq))
        persist_rows.append((slot_row["id"], batch_row["id"], sq))

    ibq = item_base_quality(slot_results)
    exp_roll = experimentation_roll(ibq, crafter["skill_factor"], rng)
    final_q = final_quality(ibq, crafter["skill_factor"], exp_roll)
    band = lookup_quality_band(conn, final_q)

    crafted_item_id = persist_craft(
        conn, schematic["id"], crafter["id"], ibq, exp_roll, final_q, band, persist_rows
    )

    return {
        "crafted_item_id": crafted_item_id,
        "slot_results": slot_results,
        "ibq": ibq,
        "exp_roll": exp_roll,
        "final_quality": final_q,
        "quality_band": band,
    }


def _parse_slot_arg(raw: str) -> tuple[str, str]:
    name, _, batch_code = raw.partition("=")
    if not batch_code:
        raise argparse.ArgumentTypeError(f"--slot must be SlotName=BatchCode, got {raw!r}")
    return name, batch_code


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path")
    parser.add_argument("schematic_name")
    parser.add_argument("crafter_name")
    parser.add_argument(
        "--slot", action="append", dest="slots", default=[], type=_parse_slot_arg,
        help="SlotName=BatchCode, repeatable",
    )
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args(argv)

    if not args.slots:
        parser.error("at least one --slot is required")

    rng = random.Random(args.seed)
    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row

    result = craft(conn, args.schematic_name, args.crafter_name, dict(args.slots), rng)

    for r in result["slot_results"]:
        print(f"Slot {r.slot_name!r} <- {r.batch_code}: SlotQuality = {r.slot_quality:.2f}")
    print(f"IBQ: {result['ibq']:.1f}")
    print(f"Experimentation roll: {result['exp_roll']:.2f}")
    print(f"Final Item Quality: {result['final_quality']:.2f}  ({result['quality_band']})")


if __name__ == "__main__":
    main(sys.argv[1:])
