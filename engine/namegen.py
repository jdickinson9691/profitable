"""Procedural name/code generation for world-gen (engine/worldgen.py).

Small curated word lists combined at random -- no external data files, no
network calls, fully deterministic given a seeded random.Random.
"""
from __future__ import annotations

import random
import re

PLANET_ROOTS = [
    "Kessari", "Volaris", "Drazen", "Halcyon", "Ashgard", "Nyxara", "Torvane",
    "Ophelian", "Marrow", "Zephyr", "Corvus", "Ithaca", "Vantor", "Solheim",
    "Kethra", "Baelor", "Ilvarr", "Thessia", "Ognos", "Cindral", "Varek",
    "Ustra", "Meridian", "Xelvara", "Doryn", "Anthrix",
]
PLANET_SUFFIXES = [
    "Prime", "Belt", "Reach", "Expanse", "Hollow", "Drift", "Verge",
    "Cradle", "Rim", "Span", "Hold", "Crown", "Gate", "Wake",
]

SECTOR_ROOTS = [
    "Outer", "Cinder", "Frontier", "Ashen", "Hollow", "Deep", "Shattered",
    "Silent", "Ember", "Fringe", "Broken", "Wild",
]
SECTOR_SUFFIXES = [
    "Reach", "Expanse", "Verge", "Rim", "Drift", "Belt", "Reaches", "Span",
]

MATERIAL_ROOTS = [
    "Ferrite", "Neutronium", "Cobaltite", "Quartzium", "Duralite",
    "Voidstone", "Pyrelite", "Cryonite", "Umbrite", "Solarium", "Graphene",
    "Zirconide", "Basalite", "Chromiron", "Nyxalloy", "Prismite",
]
MATERIAL_SUFFIXES = [
    "Ore", "Shale", "Crystal", "Alloy", "Dust", "Vein", "Sand", "Resin",
    "Fiber", "Slag",
]

ITEM_ADJECTIVES = [
    "Reinforced", "Ablative", "Hardened", "Reactive", "Composite",
    "Layered", "Tempered", "Modular", "Sealed", "Adaptive",
]
ITEM_NOUNS = [
    "Hull Plate", "Conduit Array", "Pressure Seal", "Thruster Housing",
    "Shield Emitter", "Cargo Frame", "Power Core", "Sensor Mount",
    "Coolant Loop", "Armor Segment",
]


def _combine(rng: random.Random, roots: list[str], suffixes: list[str]) -> str:
    return f"{rng.choice(roots)} {rng.choice(suffixes)}"


def generate_planet_name(rng: random.Random) -> str:
    return _combine(rng, PLANET_ROOTS, PLANET_SUFFIXES)


def generate_sector_name(rng: random.Random) -> str:
    return _combine(rng, SECTOR_ROOTS, SECTOR_SUFFIXES)


def generate_material_name(rng: random.Random) -> str:
    return _combine(rng, MATERIAL_ROOTS, MATERIAL_SUFFIXES)


def generate_item_name(rng: random.Random) -> str:
    return _combine(rng, ITEM_ADJECTIVES, ITEM_NOUNS)


def planet_code(name: str) -> str:
    """'Kessari Prime' -> 'KESSARI-PRIME' (matches seed data convention)."""
    cleaned = re.sub(r"[^A-Za-z0-9\s-]", "", name)
    return "-".join(cleaned.upper().split())


def material_code(name: str, length: int = 4) -> str:
    """'Ferrite Shale' -> 'FERR' (first word, abbreviated -- matches NEUT/FERR)."""
    cleaned = re.sub(r"[^A-Za-z0-9\s-]", "", name)
    words = cleaned.upper().split()
    return words[0][:length] if words else "MAT"


def unique_code(base_code: str, exists, rng: random.Random) -> str:
    """Append a random numeric suffix until `exists(code)` returns False."""
    if not exists(base_code):
        return base_code
    while True:
        candidate = f"{base_code}-{rng.randint(100, 999)}"
        if not exists(candidate):
            return candidate
