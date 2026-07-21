#!/usr/bin/env python3
"""Build a local SQLite database from schema.sql + seed_data.sql.

Usage:
    python scripts/build_db.py [output_path]

Defaults to db/local.db. Overwrites any existing file at that path.

schema.sql/seed_data.sql are resolved relative to this file when running
from source, or relative to sys._MEIPASS when frozen (PyInstaller bundles
them as data files under db/ -- see packaging/profitable.spec).
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _db_resource_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / "db"
    return ROOT / "db"


SCHEMA_PATH = _db_resource_dir() / "schema.sql"
SEED_PATH = _db_resource_dir() / "seed_data.sql"


def build_db(output_path: Path) -> None:
    if output_path.exists():
        output_path.unlink()

    conn = sqlite3.connect(output_path)
    try:
        conn.executescript(SCHEMA_PATH.read_text())
        conn.executescript(SEED_PATH.read_text())
        conn.commit()
    finally:
        conn.close()

    print(f"Built {output_path}")


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "db" / "local.db"
    out.parent.mkdir(parents=True, exist_ok=True)
    build_db(out)
