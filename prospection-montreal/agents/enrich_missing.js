const fs = require("fs");
const path = require("path");
const { normalizeBuildingRecord } = require("./lib/scoring");
const { isLikelyExisting, normalizeName } = require("./lib/dedupe");
const { inferZone } = require("./lib/zones");

const DATA_FILE = path.join(__dirname, "..", "data.json");
const OUT_DIR = path.join(__dirname, "out");
const OUTPUT_FILE = path.join(OUT_DIR, "proposed-additions.json");
const CANDIDATE_INPUTS = ["wikidata-candidates.json", "opendata-candidates.json", "manual-candidates.json", "gemini-candidates.json"];

function loadAllCandidates() {
  const all = [];
  for (const name of CANDIDATE_INPUTS) {
    const f = path.join(OUT_DIR, name);
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    (j.candidates || []).forEach((c) => all.push(c));
  }
  const unique = new Map();
  for (const c of all) {
    const k = `${normalizeName(c.immeuble)}|${Number(c.latitude).toFixed(5)}|${Number(c.longitude).toFixed(5)}`;
    if (!unique.has(k)) unique.set(k, c);
  }
  return [...unique.values()];
}

function buildProposedRecord(candidate, startId) {
  const inferredZone = inferZone(candidate.latitude, candidate.longitude);
  const base = {
    id: startId,
    rang: startId,
    immeuble: candidate.immeuble,
    hauteur_m: candidate.hauteur_m,
    etages: candidate.etages,
    annee: candidate.annee,
    usage: candidate.usage,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    zone: inferredZone.zone,
    zone_lettre: inferredZone.zone_lettre,
    decideur_probable: "A valider",
    angle_commercial: "Detection automatique - validation requise",
    raison_priorisation: "Candidat non repertorie dans l'inventaire local",
    mode_action: "Validation",
    top25_ordre: null,
    condo_ordre: null,
    source_inventaire: candidate.source_url,
    source_rbq: "https://www.rbq.gouv.qc.ca/",
    source_proprietaires: "https://montreal.ca/demarches/consulter-les-roles-devaluation-fonciere",
  };

  return normalizeBuildingRecord(base);
}

function run() {
  const currentData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const inventory = currentData.inventory || [];
  const candidates = loadAllCandidates();
  if (candidates.length === 0) {
    throw new Error("No candidate files. Run discover_wikidata.js and/or ingest/manual-csv.js first.");
  }
  const maxId = inventory.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0);
  let nextId = maxId + 1;

  const proposed = [];
  for (const candidate of candidates) {
    if (isLikelyExisting(candidate, inventory, { distanceMeters: 120 })) continue;
    const complete = buildProposedRecord(candidate, nextId++);
    proposed.push(complete);
  }

  const output = {
    generated_at: new Date().toISOString(),
    total_existing: inventory.length,
    total_discovered: candidates.length,
    total_proposed: proposed.length,
    proposed,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${proposed.length} proposed additions to ${OUTPUT_FILE}`);
}

run();
