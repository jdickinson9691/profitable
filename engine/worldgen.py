"""World generation: procedurally create planets, material classes, and
crafting schematics at whatever scale requested (engine/namegen.py provides
the naming). For spinning up a fresh game world, or bulk-populating an
existing one, in service of the larger trading/crafting game system this
tool is meant to support.

Each generate_* function is independent and can be called with n=0 to skip
it; generate_world() is a convenience wrapper calling all three.
"""
from __future__ import annotations

import random
import sqlite3
from typing import Any

try:
    from .namegen import (
        generate_item_name,
        generate_material_name,
        generate_planet_name,
        generate_sector_name,
        material_code,
        planet_code,
        unique_code,
    )
except ImportError:
    from namegen import (
        generate_item_name,
        generate_material_name,
        generate_planet_name,
        generate_sector_name,
        material_code,
        planet_code,
        unique_code,
    )

STATS = ("si", "cd", "el", "pu", "dn", "vo")

DEFAULT_PROFESSIONS = ["Engineer", "Artificer", "Fabricator", "Technician"]


def _code_exists(conn: sqlite3.Connection, table: str, code: str) -> bool:
    return conn.execute(f"SELECT 1 FROM {table} WHERE code = ?", (code,)).fetchone() is not None


def generate_planets(conn: sqlite3.Connection, n: int, rng: random.Random) -> list[dict[str, Any]]:
    """Create `n` new region_node rows with procedural names/sectors and a
    random per-stat bias in [-300, 300]. Returns what was created."""
    conn.row_factory = sqlite3.Row
    created = []
    for _ in range(n):
        name = generate_planet_name(rng)
        code = unique_code(planet_code(name), lambda c: _code_exists(conn, "region_node", c), rng)
        sector = generate_sector_name(rng)
        bias = {stat: rng.randint(-300, 300) for stat in STATS}

        conn.execute(
            """INSERT INTO region_node
                   (code, name, sector, description, si_bias, cd_bias, el_bias, pu_bias, dn_bias, vo_bias)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                code, name, sector, f"A world in the {sector}.",
                bias["si"], bias["cd"], bias["el"], bias["pu"], bias["dn"], bias["vo"],
            ),
        )
        created.append({"code": code, "name": name, "sector": sector, "bias": bias})
    conn.commit()
    return created


def generate_materials(conn: sqlite3.Connection, n: int, rng: random.Random) -> list[dict[str, Any]]:
    """Create `n` new raw material_class rows with procedural names and a
    randomized (but internally consistent: floor <= min <= max <= 1000)
    six-stat envelope. Returns what was created."""
    conn.row_factory = sqlite3.Row
    created = []
    for _ in range(n):
        name = generate_material_name(rng)
        code = unique_code(material_code(name), lambda c: _code_exists(conn, "material_class", c), rng)
        tier = rng.randint(1, 5)

        envelope = {}
        for stat in STATS:
            lo = rng.randint(50, 800)
            hi = min(1000, lo + rng.randint(80, 300))
            floor = max(0, lo - rng.randint(50, 250))
            envelope[stat] = (lo, hi, floor)

        columns = ["code", "name", "tier", "stage"]
        values: list[Any] = [code, name, tier, "raw"]
        for stat in STATS:
            lo, hi, floor = envelope[stat]
            columns += [f"{stat}_min", f"{stat}_max", f"{stat}_floor"]
            values += [lo, hi, floor]

        placeholders = ", ".join("?" for _ in values)
        conn.execute(
            f"INSERT INTO material_class ({', '.join(columns)}) VALUES ({placeholders})",
            values,
        )
        created.append({"code": code, "name": name, "tier": tier, "envelope": envelope})
    conn.commit()
    return created


def _ensure_professions(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM profession").fetchall()
    if rows:
        return rows
    for name in DEFAULT_PROFESSIONS:
        conn.execute("INSERT INTO profession (name) VALUES (?)", (name,))
    conn.commit()
    return conn.execute("SELECT * FROM profession").fetchall()


def _random_partition(n: int, rng: random.Random) -> list[float]:
    """`n` positive weights summing to exactly 1.0."""
    if n == 1:
        return [1.0]
    cuts = sorted(rng.uniform(0, 1) for _ in range(n - 1))
    bounds = [0.0] + cuts + [1.0]
    parts = [round(bounds[i + 1] - bounds[i], 3) for i in range(n)]
    drift = round(1.0 - sum(parts), 3)
    parts[0] = round(parts[0] + drift, 3)
    return parts


def generate_schematics(conn: sqlite3.Connection, n: int, rng: random.Random) -> list[dict[str, Any]]:
    """Create `n` new crafting schematics (item recipes), each with 1-3
    ingredient_slots whose slot_weights sum to 1.0. Each slot's six stat
    weights favor two randomly-chosen dominant stats (summing to 1.0) --
    a rough approximation of "this slot cares about X and Y". Auto-creates
    a handful of default professions if none exist yet. Returns what was
    created."""
    conn.row_factory = sqlite3.Row
    professions = _ensure_professions(conn)

    created = []
    for _ in range(n):
        profession = rng.choice(professions)
        tier = rng.randint(1, 5)
        name = generate_item_name(rng)

        cur = conn.execute(
            "INSERT INTO schematic (name, profession_id, tier_requirement, output_name) VALUES (?, ?, ?, ?)",
            (name, profession["id"], tier, name),
        )
        schematic_id = cur.lastrowid

        num_slots = rng.randint(1, 3)
        slot_weights = _random_partition(num_slots, rng)
        slots = []
        for i, slot_weight in enumerate(slot_weights):
            primary, secondary = rng.sample(STATS, 2)
            primary_w = round(rng.uniform(0.5, 0.8), 2)
            secondary_w = round(1.0 - primary_w, 2)
            weights = {stat: 0.0 for stat in STATS}
            weights[primary] = primary_w
            weights[secondary] = secondary_w
            slot_name = f"Slot {i + 1}"

            conn.execute(
                """INSERT INTO ingredient_slot
                       (schematic_id, slot_name, slot_weight, w_si, w_cd, w_el, w_pu, w_dn, w_vo)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    schematic_id, slot_name, slot_weight,
                    weights["si"], weights["cd"], weights["el"], weights["pu"], weights["dn"], weights["vo"],
                ),
            )
            slots.append({"slot_name": slot_name, "slot_weight": slot_weight, "weights": weights})

        created.append({"name": name, "profession": profession["name"], "tier": tier, "slots": slots})
    conn.commit()
    return created


def generate_world(
    conn: sqlite3.Connection, n_planets: int, n_materials: int, n_recipes: int, rng: random.Random
) -> dict[str, Any]:
    """Convenience wrapper: generate_planets + generate_materials +
    generate_schematics in one call."""
    return {
        "planets": generate_planets(conn, n_planets, rng),
        "materials": generate_materials(conn, n_materials, rng),
        "schematics": generate_schematics(conn, n_recipes, rng),
    }
