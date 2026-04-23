/**
 * Discover tall buildings via two free open-data sources:
 *   1. Overpass API (OpenStreetMap) — building:levels >= 8 in Greater Montreal bbox
 *   2. Données Québec CKAN — Laval "Référentiel de bâtiment" named buildings only
 *
 * Output: agents/out/opendata-candidates.json  (same schema as wikidata-candidates.json)
 */
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "out");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "opendata-candidates.json");

// Grand-Montréal bounding box (south, west, north, east)
const BBOX = { s: 45.35, w: -74.10, n: 45.75, e: -73.40 };

// Laval CKAN resource id for "Référentiel de bâtiment"
const LAVAL_RESOURCE_ID = "1e295f49-f5bf-4b1d-8908-139f3578f4e1";

// ─── Overpass ─────────────────────────────────────────────────────────────────

async function fetchOverpass() {
  const query = `
[out:json][timeout:90];
(
  node["building"]["building:levels"~"^([8-9]|[1-9][0-9]+)$"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  way["building"]["building:levels"~"^([8-9]|[1-9][0-9]+)$"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  relation["building"]["building:levels"~"^([8-9]|[1-9][0-9]+)$"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
);
out center;
`.trim();

  const url = "https://overpass-api.de/api/interpreter";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "prospection-montreal-agent/1.0" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();

  const candidates = [];
  for (const el of json.elements || []) {
    const tags = el.tags || {};
    const name = tags.name || tags["name:fr"] || tags["addr:housename"];
    if (!name || name.length < 4) continue;

    // Centroid: nodes have lat/lon directly; ways/relations expose center
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    const levels = parseInt(tags["building:levels"], 10) || null;
    const heightM = tags.height ? parseFloat(tags.height) : null;
    const annee = parseStartDate(tags["start_date"] || tags["year_built"] || tags["construction_date"]);
    const usage = mapOsmUsage(tags.building, tags.amenity, tags.tourism);

    candidates.push({
      source: "overpass-osm",
      source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      external_id: `${el.type}/${el.id}`,
      immeuble: name,
      hauteur_m: heightM,
      etages: levels,
      annee,
      usage,
      latitude: lat,
      longitude: lon,
    });
  }
  return candidates;
}

function parseStartDate(raw) {
  if (!raw) return null;
  const m = String(raw).match(/\b(1[89]\d{2}|20[012]\d)\b/);
  return m ? parseInt(m[1], 10) : null;
}

function mapOsmUsage(building, amenity, tourism) {
  const b = String(building || "").toLowerCase();
  const a = String(amenity || "").toLowerCase();
  const t = String(tourism || "").toLowerCase();
  if (a.includes("hospital") || b.includes("hospital")) return "Health";
  if (t.includes("hotel") || b.includes("hotel")) return "Hotel";
  if (b.includes("office") || b.includes("commercial")) return "Office";
  if (b.includes("apartments") || b.includes("residential")) return "Residential";
  if (b.includes("retail") || b.includes("mixed")) return "Mixed-use";
  return "Unknown";
}

// ─── Laval CKAN ───────────────────────────────────────────────────────────────

// Laval WKT uses MTM zone 8 (EPSG:32188). We extract an approximate WGS84
// centroid from the polygon using a linear approximation sufficient for ~50m accuracy.
// MTM8 origin: lon0 = -73.5°, lat0 = 0, k0 = 0.9999, FE = 304800, FN = 0
function mtm8ToWgs84Approx(easting, northing) {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const k0 = 0.9999;
  const lon0 = (-73.5 * Math.PI) / 180;
  const FE = 304800;
  const FN = 0;

  const x = easting - FE;
  const y = northing - FN;

  const M0 = 0;
  const M = M0 + y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = (e2 / (1 - e2)) * Math.cos(phi1) * Math.cos(phi1);
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = x / (N1 * k0);

  const lat =
    phi1 -
    ((N1 * Math.tan(phi1)) / R1) *
      (D * D / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * D * D * D * D) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * D * D * D * D * D * D) /
          720);

  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * D * D * D * D * D) / 120) /
      Math.cos(phi1);

  return {
    lat: (lat * 180) / Math.PI,
    lon: (lon * 180) / Math.PI,
  };
}

function wktPolygonCentroid(wkt) {
  // Extract all coordinate pairs from POLYGON (( x y, x y, ... ))
  const coordStr = wkt.replace(/^POLYGON\s*\(\s*\(/, "").replace(/\)\s*\)$/, "");
  const pairs = coordStr.split(",").map((p) => {
    const [x, y] = p.trim().split(/\s+/).map(Number);
    return { x, y };
  });
  if (pairs.length === 0) return null;
  const sumX = pairs.reduce((s, p) => s + p.x, 0);
  const sumY = pairs.reduce((s, p) => s + p.y, 0);
  return { easting: sumX / pairs.length, northing: sumY / pairs.length };
}

function isTargetName(name) {
  const v = String(name || "").toLowerCase();
  const allow = ["tour", "tower", "complexe", "plaza", "condo", "hotel", "centre", "place", "immeuble", "pavillon"];
  const block = ["station", "metro", "autoroute", "pont", "parc", "ecole", "universite", "musee", "eglise", "riviere", "piste"];
  return allow.some((t) => v.includes(t)) && !block.some((t) => v.includes(t));
}

async function fetchLavalCkan() {
  const sql = `SELECT "NOM_BAT","TYPE_BAT","WKT" FROM "${LAVAL_RESOURCE_ID}" WHERE "NOM_BAT" IS NOT NULL LIMIT 1000`;
  const url = `https://www.donneesquebec.ca/recherche/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`;
  const res = await fetch(url, { headers: { "User-Agent": "prospection-montreal-agent/1.0" } });
  if (!res.ok) throw new Error(`Laval CKAN HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (!json.success) throw new Error(`Laval CKAN error: ${JSON.stringify(json.error)}`);

  const candidates = [];
  for (const row of json.result?.records || []) {
    const name = (row.NOM_BAT || "").trim();
    if (!name || name.length < 4) continue;
    if (!isTargetName(name)) continue;

    const wkt = row.WKT || "";
    if (!wkt.startsWith("POLYGON")) continue;

    const centroidMtm = wktPolygonCentroid(wkt);
    if (!centroidMtm) continue;

    const { lat, lon } = mtm8ToWgs84Approx(centroidMtm.easting, centroidMtm.northing);
    if (lat < 45.35 || lat > 45.75 || lon < -74.1 || lon > -73.4) continue;

    candidates.push({
      source: "laval-ckan",
      source_url: "https://www.donneesquebec.ca/recherche/dataset/referentiel-de-batiment",
      external_id: null,
      immeuble: name,
      hauteur_m: null,
      etages: null,
      annee: null,
      usage: row.TYPE_BAT === "Bâtiment principal" ? "Unknown" : "Unknown",
      latitude: Math.round(lat * 1e6) / 1e6,
      longitude: Math.round(lon * 1e6) / 1e6,
    });
  }
  return candidates;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = { overpass: [], laval: [] };
  const errors = [];

  console.log("--- Overpass API (OSM building:levels >= 8) ---");
  try {
    results.overpass = await fetchOverpass();
    console.log(`  ${results.overpass.length} candidates from Overpass`);
  } catch (err) {
    errors.push(`Overpass: ${err.message}`);
    console.warn(`  WARN: ${err.message}`);
  }

  console.log("--- Laval CKAN (NOM_BAT named buildings) ---");
  try {
    results.laval = await fetchLavalCkan();
    console.log(`  ${results.laval.length} candidates from Laval CKAN`);
  } catch (err) {
    errors.push(`Laval CKAN: ${err.message}`);
    console.warn(`  WARN: ${err.message}`);
  }

  // Deduplicate across sources by name+coords key
  const allRaw = [...results.overpass, ...results.laval];
  const unique = new Map();
  for (const c of allRaw) {
    const key = `${String(c.immeuble).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}|${Number(c.latitude).toFixed(4)}|${Number(c.longitude).toFixed(4)}`;
    if (!unique.has(key)) unique.set(key, c);
  }
  const candidates = [...unique.values()];

  const output = {
    generated_at: new Date().toISOString(),
    total: candidates.length,
    sources: {
      overpass: results.overpass.length,
      laval_ckan: results.laval.length,
    },
    errors: errors.length ? errors : undefined,
    candidates,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${candidates.length} candidates to ${OUTPUT_FILE}`);
  if (errors.length) console.warn(`Completed with ${errors.length} source error(s) — partial results saved.`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
