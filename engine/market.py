#!/usr/bin/env python3
"""Market listing creation (design doc §4, "suggested next steps" #2 —
Market/turn economy).

list_batch() creates a market_listing for an existing material_batch at an
existing station. Station has no dedicated `code` column (see db/schema.sql),
so it's looked up by its `name` column instead.

CLI:
    python engine/market.py db/local.db --station "Kessari Trade Hub" \\
        --batch NEUT-48291 --price 4200
"""
from __future__ import annotations

import argparse
import sqlite3
import sys


def list_batch(conn: sqlite3.Connection, station_code: str, batch_code: str, price: float) -> int:
    """Create a market_listing for batch_code at station_code, return its id."""
    conn.row_factory = sqlite3.Row

    station = conn.execute(
        "SELECT * FROM station WHERE name = ?", (station_code,)
    ).fetchone()
    if station is None:
        raise ValueError(f"No station named {station_code!r}")

    batch = conn.execute(
        "SELECT * FROM material_batch WHERE code = ?", (batch_code,)
    ).fetchone()
    if batch is None:
        raise ValueError(f"No material_batch with code {batch_code!r}")

    if price < 0:
        raise ValueError(f"price must be >= 0, got {price!r}")

    cur = conn.execute(
        "INSERT INTO market_listing (station_id, batch_id, price) VALUES (?, ?, ?)",
        (station["id"], batch["id"], price),
    )
    conn.commit()
    return cur.lastrowid


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("db_path")
    parser.add_argument("--station", required=True, help="station name, e.g. 'Kessari Trade Hub'")
    parser.add_argument("--batch", required=True, help="material_batch code, e.g. NEUT-48291")
    parser.add_argument("--price", type=float, required=True)
    args = parser.parse_args(argv)

    conn = sqlite3.connect(args.db_path)
    listing_id = list_batch(conn, args.station, args.batch, args.price)
    print(f"Listed {args.batch} at {args.station!r} for {args.price}: listing_id={listing_id}")


if __name__ == "__main__":
    main(sys.argv[1:])
