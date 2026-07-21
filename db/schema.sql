-- Profitable — Data Model
-- SQLite DDL (portable to Postgres with minor type swaps: INTEGER PK -> SERIAL, TEXT timestamps -> TIMESTAMPTZ)
--
-- Fourteen tables in four zones:
--   Sourcing            stat_type, material_class, region_node, material_batch, refining_recipe
--   Market              station, market_listing
--   Crafting defs       profession, schematic, ingredient_slot
--   Crafting results    crafter, crafted_item, item_ingredient
--   (+ quality_band lookup)

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- SOURCING
-- ---------------------------------------------------------------------

-- Lookup table so a UI can render stat labels/descriptions dynamically.
-- The hot-path data itself lives as fixed columns (si, cd, el, pu, dn, vo)
-- on material_class / region_node / material_batch — see data-model.md
-- for why a key-value stat table was rejected.
CREATE TABLE stat_type (
    code        TEXT PRIMARY KEY,      -- 'si' | 'cd' | 'el' | 'pu' | 'dn' | 'vo'
    label       TEXT NOT NULL,
    description TEXT
);

-- A template: "Neutronium Ore", tier 4, stage 'raw', with a six-stat
-- min/max envelope plus an absolute floor per stat (a guarantee that
-- survives even a harsh negative node bias).
CREATE TABLE material_class (
    id          INTEGER PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,          -- short code, e.g. 'NEUT'
    name        TEXT NOT NULL,
    tier        INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
    stage       TEXT NOT NULL CHECK (stage IN ('raw', 'refined', 'component')),

    si_min INTEGER NOT NULL CHECK (si_min BETWEEN 0 AND 1000),
    si_max INTEGER NOT NULL CHECK (si_max BETWEEN 0 AND 1000),
    si_floor INTEGER NOT NULL CHECK (si_floor BETWEEN 0 AND 1000),

    cd_min INTEGER NOT NULL CHECK (cd_min BETWEEN 0 AND 1000),
    cd_max INTEGER NOT NULL CHECK (cd_max BETWEEN 0 AND 1000),
    cd_floor INTEGER NOT NULL CHECK (cd_floor BETWEEN 0 AND 1000),

    el_min INTEGER NOT NULL CHECK (el_min BETWEEN 0 AND 1000),
    el_max INTEGER NOT NULL CHECK (el_max BETWEEN 0 AND 1000),
    el_floor INTEGER NOT NULL CHECK (el_floor BETWEEN 0 AND 1000),

    pu_min INTEGER NOT NULL CHECK (pu_min BETWEEN 0 AND 1000),
    pu_max INTEGER NOT NULL CHECK (pu_max BETWEEN 0 AND 1000),
    pu_floor INTEGER NOT NULL CHECK (pu_floor BETWEEN 0 AND 1000),

    dn_min INTEGER NOT NULL CHECK (dn_min BETWEEN 0 AND 1000),
    dn_max INTEGER NOT NULL CHECK (dn_max BETWEEN 0 AND 1000),
    dn_floor INTEGER NOT NULL CHECK (dn_floor BETWEEN 0 AND 1000),

    vo_min INTEGER NOT NULL CHECK (vo_min BETWEEN 0 AND 1000),
    vo_max INTEGER NOT NULL CHECK (vo_max BETWEEN 0 AND 1000),
    vo_floor INTEGER NOT NULL CHECK (vo_floor BETWEEN 0 AND 1000)
);

-- A spawn location for materials. In this drop, "planet" IS region_node —
-- extended with descriptive/world-building fields rather than split into
-- a separate parent table. Each planet nudges rolled stats via a small
-- additive per-stat bias (-300..+300), applied before clamping to the
-- material_class envelope/floor. This keeps regional flavor cheap to
-- author: six small integers per planet instead of six full ranges.
CREATE TABLE region_node (
    id             INTEGER PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,     -- short code, e.g. 'KESSARI-PRIME'
    name           TEXT NOT NULL,            -- display name, e.g. 'Kessari Prime'
    sector         TEXT,                     -- freeform world-building grouping
    description    TEXT,
    discovered_at  TEXT NOT NULL DEFAULT (datetime('now')),

    si_bias INTEGER NOT NULL DEFAULT 0 CHECK (si_bias BETWEEN -300 AND 300),
    cd_bias INTEGER NOT NULL DEFAULT 0 CHECK (cd_bias BETWEEN -300 AND 300),
    el_bias INTEGER NOT NULL DEFAULT 0 CHECK (el_bias BETWEEN -300 AND 300),
    pu_bias INTEGER NOT NULL DEFAULT 0 CHECK (pu_bias BETWEEN -300 AND 300),
    dn_bias INTEGER NOT NULL DEFAULT 0 CHECK (dn_bias BETWEEN -300 AND 300),
    vo_bias INTEGER NOT NULL DEFAULT 0 CHECK (vo_bias BETWEEN -300 AND 300)
);

-- A concrete, tradeable lot with actual rolled numbers, tied to the
-- planet (region_node) it spawned from.
CREATE TABLE material_batch (
    id                INTEGER PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,      -- e.g. 'NEUT-48291'
    material_class_id INTEGER NOT NULL REFERENCES material_class(id),
    region_node_id    INTEGER NOT NULL REFERENCES region_node(id),
    rolled_at         TEXT NOT NULL DEFAULT (datetime('now')),

    si INTEGER NOT NULL CHECK (si BETWEEN 0 AND 1000),
    cd INTEGER NOT NULL CHECK (cd BETWEEN 0 AND 1000),
    el INTEGER NOT NULL CHECK (el BETWEEN 0 AND 1000),
    pu INTEGER NOT NULL CHECK (pu BETWEEN 0 AND 1000),
    dn INTEGER NOT NULL CHECK (dn BETWEEN 0 AND 1000),
    vo INTEGER NOT NULL CHECK (vo BETWEEN 0 AND 1000)
);

-- material_class -> material_class. The raw-to-component pipeline is data,
-- not special-cased code: refining an input class produces an output
-- class, usually with a tighter envelope and often a different stage.
CREATE TABLE refining_recipe (
    id               INTEGER PRIMARY KEY,
    name             TEXT NOT NULL,
    input_class_id   INTEGER NOT NULL REFERENCES material_class(id),
    output_class_id  INTEGER NOT NULL REFERENCES material_class(id),
    notes            TEXT
);

-- ---------------------------------------------------------------------
-- MARKET
-- ---------------------------------------------------------------------

CREATE TABLE station (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    region_node_id INTEGER REFERENCES region_node(id)   -- station orbiting/on a planet
);

CREATE TABLE market_listing (
    id         INTEGER PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES station(id),
    batch_id   INTEGER NOT NULL REFERENCES material_batch(id),
    price      REAL NOT NULL CHECK (price >= 0),
    listed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- CRAFTING DEFINITIONS
-- ---------------------------------------------------------------------

CREATE TABLE profession (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE schematic (
    id                INTEGER PRIMARY KEY,
    name              TEXT NOT NULL,
    profession_id     INTEGER NOT NULL REFERENCES profession(id),
    tier_requirement  INTEGER NOT NULL CHECK (tier_requirement BETWEEN 1 AND 5),
    output_name       TEXT NOT NULL
);

-- Where the weighting system lives. slot_weight is how much this slot
-- counts toward the item's overall quality; w_si..w_vo is how this slot
-- scores any candidate batch. The six stat weights should sum to 1.0
-- (enforced in application code / seed data review — SQLite CHECK can't
-- reliably do float-sum validation across a row with rounding).
CREATE TABLE ingredient_slot (
    id           INTEGER PRIMARY KEY,
    schematic_id INTEGER NOT NULL REFERENCES schematic(id),
    slot_name    TEXT NOT NULL,
    slot_weight  REAL NOT NULL CHECK (slot_weight BETWEEN 0 AND 1),

    w_si REAL NOT NULL DEFAULT 0,
    w_cd REAL NOT NULL DEFAULT 0,
    w_el REAL NOT NULL DEFAULT 0,
    w_pu REAL NOT NULL DEFAULT 0,
    w_dn REAL NOT NULL DEFAULT 0,
    w_vo REAL NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- CRAFTING RESULTS
-- ---------------------------------------------------------------------

CREATE TABLE crafter (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    skill_factor REAL NOT NULL CHECK (skill_factor BETWEEN 0 AND 1)
);

CREATE TABLE quality_band (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,       -- e.g. 'Shoddy', 'Standard', 'Fine', 'Masterwork'
    min_value REAL NOT NULL,
    max_value REAL NOT NULL
);

-- The audit trail's parent row: a single craft attempt and its result.
CREATE TABLE crafted_item (
    id             INTEGER PRIMARY KEY,
    schematic_id   INTEGER NOT NULL REFERENCES schematic(id),
    crafter_id     INTEGER NOT NULL REFERENCES crafter(id),
    ibq            REAL NOT NULL,
    exp_roll       REAL NOT NULL,
    final_quality  REAL NOT NULL,
    quality_band   TEXT NOT NULL,
    crafted_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Records exactly which batch filled which slot on which crafted item,
-- plus the computed slot_quality at craft time — makes every result
-- explainable and replayable after the fact.
CREATE TABLE item_ingredient (
    id               INTEGER PRIMARY KEY,
    crafted_item_id  INTEGER NOT NULL REFERENCES crafted_item(id),
    slot_id          INTEGER NOT NULL REFERENCES ingredient_slot(id),
    batch_id         INTEGER NOT NULL REFERENCES material_batch(id),
    slot_quality     REAL NOT NULL
);
