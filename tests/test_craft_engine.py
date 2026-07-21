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

from balance_harness import run_simulation  # noqa: E402
from build_db import build_db  # noqa: E402
from craft_engine import craft  # noqa: E402
from market import list_batch  # noqa: E402
from refine import refine  # noqa: E402
from roll_batch import roll_batch  # noqa: E402
from universe import load_universe, save_universe  # noqa: E402
from worldgen import generate_world  # noqa: E402


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
        conn.close()


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
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM material_class WHERE code = 'NEUT'").fetchone()
        assert result["stats"]["si"] >= row["si_floor"]

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
        conn.close()


def test_list_batch_creates_listing():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        build_db(db_path)
        conn = sqlite3.connect(db_path)

        listing_id = list_batch(conn, "Kessari Trade Hub", "NEUT-48291", 4200)
        assert isinstance(listing_id, int)

        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM market_listing WHERE id = ?", (listing_id,)
        ).fetchone()
        assert row is not None
        assert row["price"] == 4200

        station = conn.execute(
            "SELECT * FROM station WHERE id = ?", (row["station_id"],)
        ).fetchone()
        assert station["name"] == "Kessari Trade Hub"

        batch = conn.execute(
            "SELECT * FROM material_batch WHERE id = ?", (row["batch_id"],)
        ).fetchone()
        assert batch["code"] == "NEUT-48291"

        print(f"list_batch(): listing_id={listing_id} price={row['price']}  [OK]")
        conn.close()


def test_run_simulation_summarizes_quality():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        build_db(db_path)
        conn = sqlite3.connect(db_path)

        result = run_simulation(
            conn, "NEUT", "KESSARI-PRIME", "Capital Hull Plate", "Vex Marren",
            n=200, rng=random.Random(42),
        )

        assert result["n"] == 200
        assert 0.0 <= result["min_quality"] <= result["mean_quality"] <= result["max_quality"] <= 1000.0
        assert result["stdev_quality"] >= 0.0
        assert sum(result["band_counts"].values()) == 200
        assert set(result["band_counts"]) <= {"Shoddy", "Standard", "Fine", "Masterwork"}

        print(f"run_simulation(): n={result['n']} mean={result['mean_quality']:.2f} "
              f"bands={result['band_counts']}  [OK]")
        conn.close()


def test_refine_blends_best_of_per_stat():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        build_db(db_path)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row

        result = refine(conn, "Neutronium Smelting", ["NEUT-48291", "NEUT-77002"])

        # NEUT-48291: si=880 cd=310 el=420 pu=610 dn=900 vo=140
        # NEUT-77002: si=760 cd=470 el=510 pu=700 dn=850 vo=205
        assert result["stats"] == {"si": 880, "cd": 470, "el": 510, "pu": 700, "dn": 900, "vo": 205}
        assert result["material_class"] == "NEUT-INGOT"

        row = conn.execute(
            "SELECT * FROM material_batch WHERE code = ?", (result["code"],)
        ).fetchone()
        assert row is not None
        assert row["si"] == 880 and row["vo"] == 205

        output_class = conn.execute(
            "SELECT * FROM material_class WHERE code = 'NEUT-INGOT'"
        ).fetchone()
        assert row["material_class_id"] == output_class["id"]

        print(f"refine(): code={result['code']} stats={result['stats']}  [OK]")
        conn.close()


def test_generate_world_creates_usable_entities():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        build_db(db_path)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row

        before_planets = conn.execute("SELECT COUNT(*) AS n FROM region_node").fetchone()["n"]
        before_materials = conn.execute("SELECT COUNT(*) AS n FROM material_class").fetchone()["n"]
        before_schematics = conn.execute("SELECT COUNT(*) AS n FROM schematic").fetchone()["n"]

        result = generate_world(conn, 3, 2, 2, random.Random(99))

        assert len(result["planets"]) == 3
        assert len(result["materials"]) == 2
        assert len(result["schematics"]) == 2
        for schematic in result["schematics"]:
            assert 1 <= len(schematic["slots"]) <= 3
            total_weight = sum(s["slot_weight"] for s in schematic["slots"])
            assert abs(total_weight - 1.0) < 0.01

        after_planets = conn.execute("SELECT COUNT(*) AS n FROM region_node").fetchone()["n"]
        after_materials = conn.execute("SELECT COUNT(*) AS n FROM material_class").fetchone()["n"]
        after_schematics = conn.execute("SELECT COUNT(*) AS n FROM schematic").fetchone()["n"]
        assert after_planets == before_planets + 3
        assert after_materials == before_materials + 2
        assert after_schematics == before_schematics + 2

        # Generated entities are immediately usable by roll_batch + craft.
        universe = load_universe(Path(tmp) / "universe.json")
        mat, planet, schem = result["materials"][0], result["planets"][0], result["schematics"][0]
        batch = roll_batch(conn, universe, mat["code"], planet["code"], random.Random(1))
        crafter_name = conn.execute("SELECT name FROM crafter LIMIT 1").fetchone()["name"]
        slot_name = schem["slots"][0]["slot_name"]
        craft_result = craft(conn, schem["name"], crafter_name, {slot_name: batch["code"]}, random.Random(1))
        assert 0.0 <= craft_result["final_quality"] <= 1000.0

        print(f"generate_world(): +{len(result['planets'])} planets "
              f"+{len(result['materials'])} materials +{len(result['schematics'])} schematics, "
              f"generated entities craftable  [OK]")
        conn.close()


if __name__ == "__main__":
    test_craft_worked_example()
    test_roll_batch_creates_planet_and_batch()
    test_list_batch_creates_listing()
    test_run_simulation_summarizes_quality()
    test_refine_blends_best_of_per_stat()
    test_generate_world_creates_usable_entities()
    print("All smoke tests passed.")
