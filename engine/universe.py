#!/usr/bin/env python3
"""The "ongoing game universe" — a JSON file tracking known planets and the
history of material batches rolled on each of them.

This sits alongside the SQLite db (which remains the system of record for
craftable material_batch rows) as a world-building / bookkeeping layer:
it's what a game master or generation tool would read to answer "what
planets exist, and what has spawned there so far?"

Structure:
{
  "planets": {
    "KESSARI-PRIME": {
      "name": "Kessari Prime",
      "sector": "Outer Reach",
      "description": "...",
      "bias": {"si": 40, "cd": -20, "el": 0, "pu": 10, "dn": 60, "vo": -30},
      "discovered_at": "2026-07-21T12:00:00",
      "batches_generated": [
        {
          "code": "NEUT-48291",
          "material_class": "NEUT",
          "stats": {"si": 880, "cd": 310, "el": 420, "pu": 610, "dn": 900, "vo": 140},
          "rolled_at": "2026-07-21T12:00:01"
        }
      ]
    }
  }
}
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

STATS = ("si", "cd", "el", "pu", "dn", "vo")

DEFAULT_UNIVERSE: dict[str, Any] = {"planets": {}}


def load_universe(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"planets": {}}
    with path.open() as f:
        return json.load(f)


def save_universe(universe: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump(universe, f, indent=2, sort_keys=True)


def register_planet(
    universe: dict[str, Any],
    code: str,
    name: str,
    sector: str | None = None,
    description: str | None = None,
    bias: dict[str, int] | None = None,
    discovered_at: str | None = None,
) -> dict[str, Any]:
    """Add a planet to the universe if it isn't already known. Idempotent:
    calling this again for an existing code returns the existing entry
    unchanged rather than overwriting it."""
    from datetime import datetime, timezone

    if code in universe["planets"]:
        return universe["planets"][code]

    entry = {
        "name": name,
        "sector": sector,
        "description": description,
        "bias": {stat: (bias or {}).get(stat, 0) for stat in STATS},
        "discovered_at": discovered_at or datetime.now(timezone.utc).isoformat(),
        "batches_generated": [],
    }
    universe["planets"][code] = entry
    return entry


def record_batch(
    universe: dict[str, Any],
    planet_code: str,
    batch_code: str,
    material_class_code: str,
    stats: dict[str, int],
    rolled_at: str | None = None,
) -> None:
    from datetime import datetime, timezone

    if planet_code not in universe["planets"]:
        raise KeyError(f"Planet {planet_code!r} is not registered in the universe yet")

    universe["planets"][planet_code]["batches_generated"].append(
        {
            "code": batch_code,
            "material_class": material_class_code,
            "stats": {stat: stats[stat] for stat in STATS},
            "rolled_at": rolled_at or datetime.now(timezone.utc).isoformat(),
        }
    )
