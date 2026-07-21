#!/usr/bin/env python3
"""Build a local SQLite database from db/schema.sql + db/seed_data.sql.

Usage:
    python scripts/build_db.py [output_path]

Defaults to db/local.db. Overwrites any existing file at that path.
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "db" / "schema.sql"
SEED_PATH = ROOT / "db" / "seed_data.sql"


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
