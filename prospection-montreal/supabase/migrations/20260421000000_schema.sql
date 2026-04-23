-- Run this in the Supabase SQL Editor to create the buildings table

CREATE TABLE IF NOT EXISTS buildings (
    id BIGINT PRIMARY KEY,
    rang INT,
    immeuble TEXT,
    hauteur_m FLOAT,
    etages INT,
    annee INT,
    usage TEXT,
    latitude FLOAT,
    longitude FLOAT,
    zone TEXT,
    zone_lettre TEXT,
    age_2026 INT,
    score_anciennete INT,
    score_usage INT,
    score_hauteur INT,
    score_total INT,
    priorite TEXT,
    statut_public TEXT,
    decideur_probable TEXT,
    angle_commercial TEXT,
    raison_priorisation TEXT,
    mode_action TEXT,
    segment TEXT,
    top25_ordre INT,
    condo_ordre INT,
    source_inventaire TEXT,
    source_rbq TEXT,
    source_proprietaires TEXT
);

-- Enable Row Level Security (RLS) and allow public read access
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON buildings
    FOR SELECT
    USING (true);
