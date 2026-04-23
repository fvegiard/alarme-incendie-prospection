/**
 * Lit un ou plusieurs CSV dans in/manual/ et produit out/manual-candidates.json
 * Colonnes par defaut: immeuble, latitude, longitude (obligatoires)
 * Optionnel: hauteur_m, etages, annee, usage, source_url
 * Fichier optionnel in/manual/columns.json pour renommer les en-tetes du CSV.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MANUAL_DIR = path.join(ROOT, "in", "manual");
const OUT_DIR = path.join(__dirname, "out");
const OUT_FILE = path.join(OUT_DIR, "manual-candidates.json");

const DEFAULT_MAP = {
  immeuble: "immeuble",
  latitude: "latitude",
  longitude: "longitude",
  hauteur_m: "hauteur_m",
  etages: "etages",
  annee: "annee",
  usage: "usage",
  source_url: "source_url",
};

function parseSimpleCsv(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((s) => s.trim().replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((s) => s.trim());
    const o = {};
    header.forEach((h, i) => {
      o[h] = cols[i] ?? "";
    });
    return o;
  });
}

function loadColumnMap() {
  const p = path.join(MANUAL_DIR, "columns.json");
  if (!fs.existsSync(p)) return { ...DEFAULT_MAP };
  return { ...DEFAULT_MAP, ...JSON.parse(fs.readFileSync(p, "utf8")) };
}

function rowToCandidate(row, map, rank) {
  const im = row[map.immeuble] || row.name || row.nom;
  const lat = parseFloat(row[map.latitude] || row.lat);
  const lon = parseFloat(row[map.longitude] || row.lon);
  if (!im || Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const h = row[map.hauteur_m] ? parseFloat(row[map.hauteur_m]) : null;
  const et = row[map.etages] ? parseInt(row[map.etages], 10) : null;
  const an = row[map.annee] ? parseInt(row[map.annee], 10) : null;
  const src = (row[map.source_url] || "").trim() || "manual-csv";
  return {
    source: "manual-csv",
    source_url: src.startsWith("http") ? src : `file:${path.basename(String(src))}`,
    external_id: `manual-${rank}`,
    rank_source: rank,
    immeuble: String(im).trim(),
    hauteur_m: Number.isFinite(h) ? h : null,
    etages: Number.isFinite(et) ? et : null,
    annee: Number.isFinite(an) ? an : null,
    usage: row[map.usage] || "Unknown",
    latitude: lat,
    longitude: lon,
  };
}

function run() {
  if (!fs.existsSync(MANUAL_DIR)) {
    fs.mkdirSync(MANUAL_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const files = fs.existsSync(MANUAL_DIR) ? fs.readdirSync(MANUAL_DIR).filter((f) => f.endsWith(".csv")) : [];
  if (files.length === 0) {
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify(
        { generated_at: new Date().toISOString(), total: 0, candidates: [] },
        null,
        2
      )
    );
    console.log("No CSV in in/manual/ — wrote empty manual-candidates.json");
    return;
  }

  const map = loadColumnMap();
  const candidates = [];
  let rank = 0;
  for (const file of files) {
    const text = fs.readFileSync(path.join(MANUAL_DIR, file), "utf8");
    const rows = parseSimpleCsv(text);
    for (const row of rows) {
      rank += 1;
      const c = rowToCandidate(row, map, rank);
      if (c) candidates.push(c);
    }
  }

  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total: candidates.length,
        candidates,
        source_files: files,
      },
      null,
      2
    )
  );
  console.log(`Wrote ${candidates.length} manual candidate(s) to ${OUT_FILE}`);
}

run();
