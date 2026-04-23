const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "out");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "wikidata-candidates.json");

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const areas = [
    { name: "montreal", coord: "45.5017|-73.5673" },
    { name: "laval", coord: "45.6066|-73.7124" },
    { name: "longueuil", coord: "45.5312|-73.5181" },
    { name: "brossard", coord: "45.4536|-73.4676" },
  ];

  const rows = [];
  for (const area of areas) {
    const url = `https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${area.coord}&gsradius=10000&gslimit=500&format=json`;
    const response = await fetch(url, { headers: { "user-agent": "prospection-montreal-local-agent/1.0" } });
    if (!response.ok) {
      throw new Error(`Wikipedia request failed (${area.name}): ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    rows.push(...(payload?.query?.geosearch || []));
  }

  const unique = new Map();
  rows.forEach((row, index) => {
    const name = row.title || "Nom inconnu";
    const key = normalizeKey(name, row.lat, row.lon);

    if (!isTargetName(name)) return;
    if (!row.lat || !row.lon) return;
    if (name.length < 4) return;

    unique.set(key, {
      source: "wikipedia-geosearch",
      source_url: row.pageid ? `https://fr.wikipedia.org/?curid=${row.pageid}` : null,
      external_id: row.pageid ? String(row.pageid) : null,
      rank_source: index + 1,
      immeuble: name,
      hauteur_m: null,
      etages: null,
      annee: null,
      usage: "Unknown",
      latitude: Number(row.lat),
      longitude: Number(row.lon),
    });
  });

  const candidates = Array.from(unique.values());

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total: candidates.length,
        candidates,
      },
      null,
      2
    )
  );

  console.log(`Wrote ${candidates.length} candidates to ${OUTPUT_FILE}`);
}

function normalizeKey(name, latitude, longitude) {
  const clean = String(name)
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${clean}|${Number(latitude).toFixed(4)}|${Number(longitude).toFixed(4)}`;
}

function isTargetName(name) {
  const value = String(name || "").toLowerCase();
  const allow = ["tour", "tower", "complexe", "plaza", "condo", "hotel", "centre", "place", "immeuble"];
  const block = ["station", "metro", "autoroute", "pont", "parc", "ecole", "universite", "musee", "eglise", "riviere"];
  return allow.some((token) => value.includes(token)) && !block.some((token) => value.includes(token));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
