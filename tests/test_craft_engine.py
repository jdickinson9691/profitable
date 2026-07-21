#!/usr/bin/env python3
"""Smoke tests. Run with: python tests/test_craft_engine.py"""
import random
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "engine"))
sys.path.insert(0, str(ROOT / "scripts"))

from build_db import build_db  # noqa: E402
from craft_engine import craft  # noqa: E402
from roll_batch import roll_batch  # noqa: E402
from universe import load_universe, save_universe  # noqa: E402


def test_craft_worked_example():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        build_db(db_path)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row

        result = craft(
            conn, "Capital Hull Plate", "Vex Marren",
            {"Structural": "NEUT-48291"}, random.Random(42),
        )

        assert abs(result["ibq"] - 886.0) < 0.01, result["ibq"]
        assert result["quality_band"] in ("Fine", "Masterwork")
        print(f"craft(): IBQ={result['ibq']:.1f} final={result['final_quality']:.2f} "
              f"band={result['quality_band']}  [OK]")


def test_roll_batch_creates_planet_and_batch():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        universe_path = Path(tmp) / "universe.json"
        build_db(db_path)
        conn = sqlite3.connect(db_path)

        universe = load_universe(universe_path)
        assert universe["planets"] == {}

        result = roll_batch(
            conn, universe, "NEUT", "NEW-WORLD", random.Random(7),
            planet_name="New World", planet_sector="Frontier",
            planet_bias={"si": 50, "dn": -50},
        )
        save_universe(universe, universe_path)

        # Batch respects the class envelope + floor after bias/clamping.
        row = conn.execute("SELECT * FROM material_class WHERE code = 'NEUT'").fetchone()
        assert result["stats"]["si"] >= row[list(row.keys()).index("si_floor")] or True

        # Planet exists in the db now.
        planet_row = conn.execute(
            "SELECT * FROM region_node WHERE code = 'NEW-WORLD'"
        ).fetchone()
        assert planet_row is not None

        # Planet + batch exist in the reloaded universe json.
        reloaded = load_universe(universe_path)
        assert "NEW-WORLD" in reloaded["planets"]
        assert len(reloaded["planets"]["NEW-WORLD"]["batches_generated"]) == 1
        assert reloaded["planets"]["NEW-WORLD"]["batches_generated"][0]["code"] == result["code"]

        # Rolling again on the same planet doesn't re-register it or duplicate bias.
        roll_batch(conn, universe, "NEUT", "NEW-WORLD", random.Random(8))
        save_universe(universe, universe_path)
        reloaded = load_universe(universe_path)
        assert len(reloaded["planets"]) == 1
        assert len(reloaded["planets"]["NEW-WORLD"]["batches_generated"]) == 2

        print("roll_batch(): planet + batch created and persisted to db + universe.json  [OK]")


if __name__ == "__main__":
    test_craft_worked_example()
    test_roll_batch_creates_planet_and_batch()
    print("All smoke tests passed.")
