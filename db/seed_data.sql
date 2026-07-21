-- Seed fixtures: stat types, a couple of planets, material classes across
-- tiers, one worked-example batch, a minimal schematic, and a crafter.

INSERT INTO stat_type (code, label, description) VALUES
    ('si', 'Structural Integrity', 'Resistance to mechanical stress and deformation'),
    ('cd', 'Conductivity',         'Ability to carry energy/current'),
    ('el', 'Elasticity',           'Ability to flex and return to shape'),
    ('pu', 'Purity',               'Freedom from contaminants; affects refining yield'),
    ('dn', 'Density',              'Mass per unit volume'),
    ('vo', 'Volatility',           'Instability under heat/pressure; high is riskier to work');

-- Planets (region_node)
INSERT INTO region_node (code, name, sector, description, si_bias, cd_bias, el_bias, pu_bias, dn_bias, vo_bias) VALUES
    ('KESSARI-PRIME', 'Kessari Prime', 'Outer Reach', 'A dense, iron-cored world with strong structural yields.',
        40, -20, 0, 10, 60, -30),
    ('VOLARIS-BELT',  'Volaris Belt',  'Cinder Expanse', 'A volcanic asteroid belt; volatile materials run hot here.',
        -20, 10, -10, -10, -10, 80);

-- Material classes
INSERT INTO material_class (code, name, tier, stage,
    si_min, si_max, si_floor, cd_min, cd_max, cd_floor, el_min, el_max, el_floor,
    pu_min, pu_max, pu_floor, dn_min, dn_max, dn_floor, vo_min, vo_max, vo_floor) VALUES
    ('NEUT', 'Neutronium Ore', 4, 'raw',
        700, 900, 300,  200, 500, 100,  300, 600, 150,
        500, 850, 250,  700, 950, 300,   50, 300,  20),
    ('FERR', 'Ferrite Shale', 1, 'raw',
        200, 500, 100,  100, 400, 50,   150, 450, 80,
        150, 500, 80,   200, 500, 100,  100, 400,  40);

-- Worked-example batch (matches docs/design/data-model.md's worked example:
-- SI 880 / DN 900, feeding a 70/30-weighted Structural slot -> SlotQuality 886)
INSERT INTO material_batch (code, material_class_id, region_node_id, si, cd, el, pu, dn, vo) VALUES
    ('NEUT-48291',
        (SELECT id FROM material_class WHERE code = 'NEUT'),
        (SELECT id FROM region_node WHERE code = 'KESSARI-PRIME'),
        880, 310, 420, 610, 900, 140);

-- Crafting definitions
INSERT INTO profession (name) VALUES ('Structural Engineer');

INSERT INTO schematic (name, profession_id, tier_requirement, output_name) VALUES
    ('Capital Hull Plate', (SELECT id FROM profession WHERE name = 'Structural Engineer'), 4, 'Capital Hull Plate');

INSERT INTO ingredient_slot (schematic_id, slot_name, slot_weight, w_si, w_cd, w_el, w_pu, w_dn, w_vo) VALUES
    ((SELECT id FROM schematic WHERE name = 'Capital Hull Plate'), 'Structural', 1.0,
        0.7, 0.0, 0.0, 0.0, 0.3, 0.0);

-- Crafter
INSERT INTO crafter (name, skill_factor) VALUES ('Vex Marren', 0.8);

-- Market
INSERT INTO station (name, region_node_id) VALUES
    ('Kessari Trade Hub', (SELECT id FROM region_node WHERE code = 'KESSARI-PRIME'));

-- Quality bands
INSERT INTO quality_band (name, min_value, max_value) VALUES
    ('Shoddy',     0,   399.999),
    ('Standard', 400,   649.999),
    ('Fine',     650,   849.999),
    ('Masterwork', 850, 1000);
